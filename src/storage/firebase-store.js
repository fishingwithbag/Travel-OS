import { validateTrip, ValidationError } from '../domain/trip.js';

export function normalizeFirebaseTrip(value) {
  if (!value) return value;
  const toList = (entry) => Array.isArray(entry) ? entry.filter(Boolean) : Object.values(entry || {});
  const items=toList(value.items).map(item=>Array.isArray(item.parking?.byGroup)
    ? {...item,parking:{...item.parking,byGroup:Object.fromEntries(Object.entries(item.parking.byGroup).filter(([,set])=>set != null))}}
    : item);
  return { ...value, groups:toList(value.groups), places:toList(value.places), rentals:toList(value.rentals), stays:toList(value.stays), expenses:toList(value.expenses), items };
}

export function parseFirebaseTrip(value) {
  if (!value) return value;
  return validateTrip(normalizeFirebaseTrip(value));
}

export function serializeFirebaseTrip(value) {
  const trip = validateTrip(value);
  const validKey = (id) => typeof id === 'string' && id.length > 0 && !/[.#$\[\]\/]/.test(id);
  if (!validKey(trip.id) || [...trip.groups,...trip.items,...trip.places,...trip.rentals,...trip.stays,...trip.expenses].some(entry=>!validKey(entry.id))) throw new ValidationError('雲端資料 ID 包含 Firebase 不支援的字元。');
  return {
    ...trip,
    groups:Object.fromEntries(trip.groups.map((group) => [group.id, group])),
    items:Object.fromEntries(trip.items.map((item) => [item.id, item])),
    places:Object.fromEntries(trip.places.map(place=>[place.id,place])),
    rentals:Object.fromEntries(trip.rentals.map(rental=>[rental.id,rental])),
    stays:Object.fromEntries(trip.stays.map(stay=>[stay.id,stay])),
    expenses:Object.fromEntries(trip.expenses.map(expense=>[expense.id,expense])),
  };
}

export function commitIfRevisionMatches(current, next) {
  if (!current || Number(current.revision) !== Number(next.revision) - 1) return undefined;
  return next;
}

function pathKey(value) {
  if (typeof value !== 'string' || !value || value.length > 128 || /[.#$\[\]\/\u0000-\u001f\u007f]/.test(value)) throw new ValidationError('請使用完整且有效的 Firebase UID／旅程 ID，不可使用 Email 或路徑。');
  return value;
}

export class FirebaseTripStore {
  #app;
  #auth;
  #database;
  #uid;
  #modules;
  #moduleLoader;
  #warnings = [];
  #stopWatching;
  #connected;

  constructor(moduleLoader = () => Promise.all([
    import('firebase/app'), import('firebase/auth'), import('firebase/database'),
  ])) {
    this.#moduleLoader = moduleLoader;
  }

  async connect(config, credentials) {
    const [{ initializeApp, deleteApp }, authModule, databaseModule] = await this.#moduleLoader();
    this.#modules = { deleteApp, ...authModule, ...databaseModule };
    this.#app = initializeApp(config, `travel-os-${crypto.randomUUID()}`);
    this.#auth = authModule.getAuth(this.#app);
    this.#database = databaseModule.getDatabase(this.#app);
    try {
      await authModule.setPersistence(this.#auth, authModule.inMemoryPersistence);
      const result = await authModule.signInWithEmailAndPassword(this.#auth, credentials.email, credentials.password);
      this.#uid = result.user.uid;
      await this.#diagnose();
      return { uid:this.#uid, email:result.user.email, projectId:config.projectId };
    } catch (error) {
      await this.disconnect();
      throw error instanceof ValidationError ? error : new ValidationError(this.#message(error?.code));
    }
  }

  #message(code) {
    const messages = {
      'auth/invalid-credential':'Email 或密碼不正確。', 'auth/email-already-in-use':'這個 Email 已有帳號。',
      'auth/operation-not-allowed':'Firebase 尚未啟用 Email/Password 登入。', 'auth/unauthorized-domain':'目前網域尚未加入 Firebase 授權網域。',
      'PERMISSION_DENIED':'資料庫 Rules 拒絕存取，請部署本專案提供的規則。', 'database/permission-denied':'資料庫 Rules 拒絕存取，請部署本專案提供的規則。',
    };
    return messages[code] || 'Firebase 連線失敗，請確認專案設定、登入方式與資料庫 Rules。';
  }

  async #diagnose() {
    const { ref, set, get, remove } = this.#modules;
    const path = `diagnostics/${this.#uid}/${crypto.randomUUID()}`;
    const target = ref(this.#database, path);
    const createdAt = Date.now();
    await set(target, { createdAt });
    try {
      if ((await get(target)).val()?.createdAt !== createdAt) throw new ValidationError('Firebase 診斷讀取失敗；請檢查 Realtime Database Rules。');
    } finally { await remove(target); }
  }

  async listTrips() {
    const { ref, get, remove } = this.#modules;
    this.#warnings = [];
    const index = (await get(ref(this.#database, `userTrips/${this.#uid}`))).val() || {};
    const ids = Object.keys(index);
    const results = await Promise.all(ids.map(async (id) => {
      try { return { id, trip:parseFirebaseTrip((await get(ref(this.#database, `trips/${id}/data`))).val()) }; }
      catch (error) { return { id, error }; }
    }));
    const trips = [];
    for (const result of results) {
      if (!result.error) {
        if (result.trip) trips.push(result.trip);
        continue;
      }
      const code = result.error?.code;
      if (code === 'PERMISSION_DENIED' || code === 'database/permission-denied') {
        this.#warnings.push('略過一筆已失效的旅程索引。');
        await remove(ref(this.#database, `userTrips/${this.#uid}/${result.id}`)).catch(() => {});
        continue;
      }
      if (result.error instanceof ValidationError) {
        this.#warnings.push('略過一筆格式不相容或已損壞的雲端旅程。');
        continue;
      }
      throw result.error;
    }
    return trips;
  }

  consumeWarnings() {
    const warnings = this.#warnings;
    this.#warnings = [];
    return warnings;
  }

  async getTrip(id) { return parseFirebaseTrip((await this.#modules.get(this.#modules.ref(this.#database, `trips/${id}/data`))).val()); }

  subscribe({onTrip,onRemove,onError,onConnection=()=>{}}) {
    this.#stopWatching?.();
    const {ref,onValue}=this.#modules;
    const uid=this.#uid;
    if (!uid) throw new ValidationError('請先登入 Firebase。');
    let active=true;
    const listeners=new Map();
    const stopTrip=id=>{const listener=listeners.get(id);if(listener){listener.active=false;listener.stop?.();listeners.delete(id);}};
    const stopIndex=onValue(ref(this.#database,`userTrips/${uid}`),snapshot=>{
      if(!active) return;
      const ids=Object.keys(snapshot.val() || {});
      if(ids.length>100) {onError(new ValidationError('帳號旅程索引超過 100 趟，請先整理索引再重新連線。'));return;}
      for(const id of listeners.keys()) if(!ids.includes(id)) {stopTrip(id);onRemove(id);}
      for(const id of ids) if(!listeners.has(id)) {
        try {pathKey(id);} catch(error) {onError(error);continue;}
        const listener={active:true,stop:null};listeners.set(id,listener);
        listener.stop=onValue(ref(this.#database,`trips/${id}`),snapshot=>{
          if(!active || !listener.active) return;
          const value=snapshot.val();
          if(!value || !['owner','editor','viewer'].includes(value.members?.[uid])) {onRemove(id);return;}
          try {
            const trip=parseFirebaseTrip(value.data);
            if(!trip || trip.id!==id) throw new ValidationError('雲端旅程 ID 與索引不一致，請聯絡專案擁有者。');
            onTrip(trip,{ownerId:value.ownerId,members:{...value.members},role:value.members[uid]});
          } catch(error) {onRemove(id);onError(error);}
        },error=>{if(active && listener.active){stopTrip(id);onRemove(id);onError(error);}});
      }
    },error=>{if(active){for(const id of [...listeners.keys()]) {stopTrip(id);onRemove(id);}onError(error);}});
    const stopConnection=onValue(ref(this.#database,'.info/connected'),snapshot=>{
      if(active){this.#connected=snapshot.val()===true;onConnection(this.#connected);}
    },error=>{if(active) onError(error);});
    const stop=()=>{
      active=false;stopIndex();stopConnection();
      for(const id of [...listeners.keys()]) stopTrip(id);
      if(this.#stopWatching===stop) this.#stopWatching=undefined;
    };
    this.#stopWatching=stop;
    return stop;
  }

  async saveTrip(trip) {
    if(this.#connected===false) throw new ValidationError('Firebase 連線已中斷，請恢復連線後再儲存；表單內容仍保留。');
    const { ref, get, update, runTransaction } = this.#modules;
    const firebaseTrip = serializeFirebaseTrip(trip);
    // A new trip is unreadable until its membership exists; inspect the caller's readable index instead.
    const index = (await get(ref(this.#database, `userTrips/${this.#uid}`))).val() || {};
    if (!index[trip.id]) {
      if (Object.keys(index).length >= 100) throw new ValidationError('單一帳號最多支援 100 趟雲端旅程。');
      await update(ref(this.#database), {
        [`trips/${trip.id}`]:{ ownerId:this.#uid, members:{ [this.#uid]:'owner' }, data:firebaseTrip },
        [`userTrips/${this.#uid}/${trip.id}`]:true,
      });
    } else {
      const expectedRevision = Number(trip.revision) - 1;
      const result = await runTransaction(ref(this.#database, `trips/${trip.id}/data`), (current) => {
        // Firebase may call this first with null before downloading an existing remote value.
        // Returning the candidate lets the server send the real value and retry the revision check.
        if (current == null) return firebaseTrip;
        if (Number(current?.revision) !== expectedRevision) return;
        return commitIfRevisionMatches(current, firebaseTrip);
      }, { applyLocally:false });
      if (!result.committed) throw new ValidationError('雲端旅程已被其他裝置更新，請重新載入後再編輯。');
    }
    return trip;
  }

  async deleteTrip(id) {
    const { ref, get, update } = this.#modules;
    const snapshot = await get(ref(this.#database, `trips/${id}`));
    const members = snapshot.child('members').val() || {};
    const updates = { [`trips/${id}`]:null };
    for (const uid of Object.keys(members)) updates[`userTrips/${uid}/${id}`] = null;
    await update(ref(this.#database), updates);
  }

  async setMember(tripId, uid, role) {
    pathKey(tripId);pathKey(uid);
    if (!['editor','viewer'].includes(role)) throw new ValidationError('只能邀請編輯者或檢視者；原擁有者不可在此變更。');
    await this.#checkMemberChange(tripId,uid);
    const { ref, update } = this.#modules;
    await update(ref(this.#database), {
      [`trips/${tripId}/members/${uid}`]:role,
      [`userTrips/${uid}/${tripId}`]:true,
    });
  }

  async removeMember(tripId, uid) {
    pathKey(tripId);pathKey(uid);
    await this.#checkMemberChange(tripId,uid);
    const { ref, update } = this.#modules;
    await update(ref(this.#database), {
      [`trips/${tripId}/members/${uid}`]:null,
      [`userTrips/${uid}/${tripId}`]:null,
    });
  }

  async #checkMemberChange(tripId,uid) {
    if(this.#connected===false) throw new ValidationError('Firebase 連線已中斷，請恢復連線後再管理成員。');
    const value=(await this.#modules.get(this.#modules.ref(this.#database,`trips/${tripId}`))).val();
    if(!value || value.ownerId!==this.#uid) throw new ValidationError('只有旅程擁有者可以管理成員。');
    if(uid===value.ownerId) throw new ValidationError('不可移除或修改原旅程擁有者。');
  }

  async replaceAll() { throw new ValidationError('為避免覆蓋雲端資料，請逐趟匯入備份。'); }

  async disconnect() {
    this.#stopWatching?.();
    if (this.#auth) await this.#modules.signOut(this.#auth).catch(() => {});
    if (this.#app) await this.#modules.deleteApp(this.#app).catch(() => {});
    this.#app = this.#auth = this.#database = this.#uid = undefined;
    this.#connected=undefined;
  }
  close() { return this.disconnect(); }
}
