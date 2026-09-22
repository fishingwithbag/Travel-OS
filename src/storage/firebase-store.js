import { validateTrip, ValidationError } from '../domain/trip.js';

export function normalizeFirebaseTrip(value) {
  if (!value) return value;
  const toList = (entry) => Array.isArray(entry) ? entry.filter(Boolean) : Object.values(entry || {});
  return { ...value, groups:toList(value.groups), items:toList(value.items) };
}

export function parseFirebaseTrip(value) {
  if (!value) return value;
  return validateTrip(normalizeFirebaseTrip(value));
}

export function serializeFirebaseTrip(value) {
  const trip = validateTrip(value);
  const validKey = (id) => typeof id === 'string' && id.length > 0 && !/[.#$\[\]\/]/.test(id);
  if (!validKey(trip.id) || trip.groups.some((group) => !validKey(group.id)) || trip.items.some((item) => !validKey(item.id))) throw new ValidationError('雲端資料 ID 包含 Firebase 不支援的字元。');
  return {
    ...trip,
    groups:Object.fromEntries(trip.groups.map((group) => [group.id, group])),
    items:Object.fromEntries(trip.items.map((item) => [item.id, item])),
  };
}

export function commitIfRevisionMatches(current, next) {
  if (!current || Number(current.revision) !== Number(next.revision) - 1) return undefined;
  return next;
}

export class FirebaseTripStore {
  #app;
  #auth;
  #database;
  #uid;
  #modules;
  #moduleLoader;
  #warnings = [];

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
      const result = await authModule.signInWithEmailAndPassword(this.#auth, credentials.email, credentials.password);
      this.#uid = result.user.uid;
      await this.#diagnose();
      return { uid:this.#uid, email:result.user.email, projectId:config.projectId };
    } catch (error) {
      await this.disconnect();
      throw new ValidationError(this.#message(error?.code));
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
    const { ref, set, remove } = this.#modules;
    const path = `diagnostics/${this.#uid}/${crypto.randomUUID()}`;
    const target = ref(this.#database, path);
    await set(target, { createdAt:Date.now() });
    await remove(target);
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

  async saveTrip(trip) {
    const { ref, get, update, runTransaction } = this.#modules;
    const firebaseTrip = serializeFirebaseTrip(trip);
    const tripRef = ref(this.#database, `trips/${trip.id}`);
    const existing = await get(tripRef);
    if (!existing.exists()) {
      const index = (await get(ref(this.#database, `userTrips/${this.#uid}`))).val() || {};
      if (Object.keys(index).length >= 100) throw new ValidationError('單一帳號最多支援 100 趟雲端旅程。');
      await update(ref(this.#database), {
        [`trips/${trip.id}`]:{ ownerId:this.#uid, members:{ [this.#uid]:'owner' }, data:firebaseTrip },
        [`userTrips/${this.#uid}/${trip.id}`]:true,
      });
    } else {
      const expectedRevision = Number(trip.revision) - 1;
      const result = await runTransaction(ref(this.#database, `trips/${trip.id}/data`), (current) => {
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
    if (!['owner','editor','viewer'].includes(role)) throw new ValidationError('不支援的成員角色。');
    const { ref, update } = this.#modules;
    await update(ref(this.#database), {
      [`trips/${tripId}/members/${uid}`]:role,
      [`userTrips/${uid}/${tripId}`]:true,
    });
  }

  async removeMember(tripId, uid) {
    const { ref, update } = this.#modules;
    await update(ref(this.#database), {
      [`trips/${tripId}/members/${uid}`]:null,
      [`userTrips/${uid}/${tripId}`]:null,
    });
  }

  async replaceAll() { throw new ValidationError('為避免覆蓋雲端資料，請逐趟匯入備份。'); }

  async disconnect() {
    if (this.#auth) await this.#modules.signOut(this.#auth).catch(() => {});
    if (this.#app) await this.#modules.deleteApp(this.#app).catch(() => {});
    this.#app = this.#auth = this.#database = this.#uid = undefined;
  }
  close() { return this.disconnect(); }
}
