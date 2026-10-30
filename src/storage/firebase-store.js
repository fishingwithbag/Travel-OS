import { createBackup, touchTrip, validateTrip, ValidationError } from '../domain/trip.js';
import {recoverMissingGroups} from '../domain/groups.js';

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

export function firebaseTripValue(envelope) {
  if (!envelope) return null;
  if (envelope.head == null) {
    if (!envelope.data || envelope.versions) throw new ValidationError('雲端儲存格式不相容，請更新網站或聯絡專案擁有者。');
    return envelope.data;
  }
  const value=envelope.versions?.[envelope.head];
  if (!Number.isSafeInteger(envelope.head) || envelope.head<1 || envelope.data || !value || value.revision!==envelope.head) throw new ValidationError('雲端版本資料不完整，請保留備份並聯絡專案擁有者。');
  return value;
}

export function firebaseTripEnvelope(trip,uid) {
  if(trip.revision!==1) throw new ValidationError('新的雲端旅程必須從版本 1 開始。請使用備份還原建立副本。');
  return {ownerId:uid,members:{[uid]:'owner'},head:1,versions:{1:serializeFirebaseTrip(trip)}};
}

function pathKey(value) {
  if (typeof value !== 'string' || !value || value.length > 128 || /[.#$\[\]\/\u0000-\u001f\u007f]/.test(value)) throw new ValidationError('請使用完整且有效的 Firebase UID／旅程 ID，不可使用 Email 或路徑。');
  return value;
}

export class FirebaseTripStore {
  #groupRecovery = new Map();
  #legacy = new Set();

  needsMigration(id) {return this.#legacy.has(id);}

  #parseEnvelope(value) {
    const data=firebaseTripValue(value);
    if(data) {if(value.head==null) this.#legacy.add(data.id);else this.#legacy.delete(data.id);}
    return this.#parseTrip(data);
  }

  groupRecovery(id) {return structuredClone(this.#groupRecovery.get(id) || []);}

  #parseTrip(value) {
    if(!value) return value;
    this.#groupRecovery.delete(value.id);
    const {trip,recovered}=recoverMissingGroups(normalizeFirebaseTrip(value));
    if(recovered.length) this.#groupRecovery.set(trip.id,recovered);else this.#groupRecovery.delete(trip.id);
    return trip;
  }
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
      'PERMISSION_DENIED':'資料庫 Rules 拒絕存取，請回 Step 2 複製並發布目前版本的 Travel OS 規則，再重新驗證。舊版規則無法通過儲存格式檢查。', 'database/permission-denied':'資料庫 Rules 拒絕存取，請回 Step 2 複製並發布目前版本的 Travel OS 規則，再重新驗證。舊版規則無法通過儲存格式檢查。',
    };
    return messages[code] || 'Firebase 連線失敗，請確認專案設定、登入方式與資料庫 Rules。';
  }

  async #diagnose() {
    const { ref, set, get, remove } = this.#modules;
    const path = `diagnostics/${this.#uid}/${crypto.randomUUID()}`;
    const target = ref(this.#database, path);
    const createdAt = Date.now();
    await set(target, { createdAt, storageFormat:2 });
    try {
      if ((await get(target)).val()?.createdAt !== createdAt) throw new ValidationError('Firebase 診斷讀取失敗；請檢查 Realtime Database Rules。');
    } finally { await remove(target); }
  }

  async listTrips() {
    const { ref, get, remove } = this.#modules;
    this.#warnings = [];
    this.#groupRecovery.clear();
    this.#legacy.clear();
    const index = (await get(ref(this.#database, `userTrips/${this.#uid}`))).val() || {};
    const ids = Object.keys(index);
    const results = await Promise.all(ids.map(async (id) => {
      try { return { id, trip:this.#parseEnvelope((await get(ref(this.#database, `trips/${id}`))).val()) }; }
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

  async getTrip(id) { pathKey(id);return this.#parseEnvelope((await this.#modules.get(this.#modules.ref(this.#database, `trips/${id}`))).val()); }

  subscribe({onTrip,onRemove,onError,onConnection=()=>{}}) {
    this.#stopWatching?.();
    const {ref,onValue}=this.#modules;
    const uid=this.#uid;
    if (!uid) throw new ValidationError('請先登入 Firebase。');
    let active=true;
    const listeners=new Map();
    const stopTrip=id=>{this.#groupRecovery.delete(id);this.#legacy.delete(id);const listener=listeners.get(id);if(listener){listener.active=false;listener.stop?.();listeners.delete(id);}};
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
          if(!value || !['owner','editor','viewer'].includes(value.members?.[uid])) {this.#groupRecovery.delete(id);this.#legacy.delete(id);onRemove(id);return;}
          try {
            const trip=this.#parseEnvelope(value);
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
    pathKey(trip.id);
    const { ref, get, update } = this.#modules;
    const firebaseTrip = serializeFirebaseTrip(trip);
    // A new trip is unreadable until its membership exists; inspect the caller's readable index instead.
    const index = (await get(ref(this.#database, `userTrips/${this.#uid}`))).val() || {};
    if (!index[trip.id]) {
      if (Object.keys(index).length >= 100) throw new ValidationError('單一帳號最多支援 100 趟雲端旅程。');
      await update(ref(this.#database), {
        [`trips/${trip.id}`]:firebaseTripEnvelope(trip,this.#uid),
        [`userTrips/${this.#uid}/${trip.id}`]:true,
      });
    } else {
      const envelope=(await get(ref(this.#database,`trips/${trip.id}`))).val();
      firebaseTripValue(envelope);
      if(envelope?.head==null) throw new ValidationError('此為舊版旅程，請先由擁有者在旅程上方下載備份並確認升級。輸入內容仍保留。');
      await this.#publish(trip.id,envelope, firebaseTrip);
    }
    this.#groupRecovery.delete(trip.id);
    return trip;
  }

  async #publish(id,envelope,next) {
    const {ref,get,update}=this.#modules;
    if(envelope.head!==next.revision-1) throw new ValidationError('雲端旅程已被其他裝置更新，請重新載入後再編輯。');
    try {
      await update(ref(this.#database,`trips/${id}`),{head:next.revision,[`versions/${next.revision}`]:next,[`versions/${envelope.head}`]:null});
    } catch(error) {
      if(['PERMISSION_DENIED','database/permission-denied'].includes(error?.code)) {
        const latest=await get(ref(this.#database,`trips/${id}/head`)).catch(()=>null);
        if(latest && latest.val()!==envelope.head) throw new ValidationError('雲端旅程已被其他裝置更新，請重新載入後再編輯。');
      }
      throw error;
    }
  }

  async prepareMigration(id) {
    pathKey(id);
    const value=(await this.#modules.get(this.#modules.ref(this.#database,`trips/${id}`))).val();
    if(value?.ownerId!==this.#uid) throw new ValidationError('只有旅程擁有者可以升級舊旅程。');
    if(value.head!=null) throw new ValidationError('旅程已升級，請重新載入。');
    const trip=this.#parseEnvelope(value);
    const backup=createBackup([trip],'private');
    // Preserve the untouched legacy payload alongside the standard restorable backup.
    backup.migrationOriginalData=structuredClone(value.data);
    return {trip,backup,recovered:this.groupRecovery(id)};
  }

  async migrateTrip(id,expectedRevision) {
    if(this.#connected===false) throw new ValidationError('Firebase 連線已中斷，請恢復連線後再升級。');
    const preview=await this.prepareMigration(id);
    if(preview.trip.revision!==expectedRevision) throw new ValidationError('舊旅程已更新，請重新下載備份並確認升級。');
    const next=touchTrip(preview.trip);
    await this.#modules.update(this.#modules.ref(this.#database,`trips/${id}`),{data:null,head:next.revision,[`versions/${next.revision}`]:serializeFirebaseTrip(next)});
    this.#legacy.delete(id);this.#groupRecovery.delete(id);
    return next;
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
    this.#groupRecovery.clear();
    this.#legacy.clear();
    if (this.#auth) await this.#modules.signOut(this.#auth).catch(() => {});
    if (this.#app) await this.#modules.deleteApp(this.#app).catch(() => {});
    this.#app = this.#auth = this.#database = this.#uid = undefined;
    this.#connected=undefined;
  }
  close() { return this.disconnect(); }
}
