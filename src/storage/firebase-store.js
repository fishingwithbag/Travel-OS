import { ValidationError } from '../domain/trip.js';

export function normalizeFirebaseTrip(value) {
  if (!value) return value;
  const toList = (entry) => Array.isArray(entry) ? entry.filter(Boolean) : Object.values(entry || {});
  return { ...value, groups:toList(value.groups), items:toList(value.items) };
}

export class FirebaseTripStore {
  #app;
  #auth;
  #database;
  #uid;
  #modules;

  async connect(config, credentials, intent = 'login') {
    const [{ initializeApp, deleteApp }, authModule, databaseModule] = await Promise.all([
      import('firebase/app'), import('firebase/auth'), import('firebase/database'),
    ]);
    this.#modules = { deleteApp, ...authModule, ...databaseModule };
    this.#app = initializeApp(config, `travel-os-${crypto.randomUUID()}`);
    this.#auth = authModule.getAuth(this.#app);
    this.#database = databaseModule.getDatabase(this.#app);
    try {
      const action = intent === 'signup' ? authModule.createUserWithEmailAndPassword : authModule.signInWithEmailAndPassword;
      const result = await action(this.#auth, credentials.email, credentials.password);
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
      'auth/weak-password':'密碼至少需要 6 個字元。', 'PERMISSION_DENIED':'資料庫 Rules 拒絕存取，請部署本專案提供的規則。', 'database/permission-denied':'資料庫 Rules 拒絕存取，請部署本專案提供的規則。',
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
    const { ref, get } = this.#modules;
    const index = (await get(ref(this.#database, `userTrips/${this.#uid}`))).val() || {};
    const trips = await Promise.all(Object.keys(index).slice(0,100).map(async (id) => normalizeFirebaseTrip((await get(ref(this.#database, `trips/${id}/data`))).val())));
    return trips.filter(Boolean);
  }

  async getTrip(id) { return normalizeFirebaseTrip((await this.#modules.get(this.#modules.ref(this.#database, `trips/${id}/data`))).val()); }

  async saveTrip(trip) {
    const { ref, get, set, update } = this.#modules;
    const tripRef = ref(this.#database, `trips/${trip.id}`);
    const existing = await get(tripRef);
    if (!existing.exists()) {
      await set(tripRef, { ownerId:this.#uid, members:{ [this.#uid]:'owner' }, data:trip });
      await set(ref(this.#database, `userTrips/${this.#uid}/${trip.id}`), true);
    } else {
      await update(ref(this.#database, `trips/${trip.id}/data`), trip);
    }
    return trip;
  }

  async deleteTrip(id) {
    const { ref, remove } = this.#modules;
    await remove(ref(this.#database, `trips/${id}`));
    await remove(ref(this.#database, `userTrips/${this.#uid}/${id}`));
  }

  async setMember(tripId, uid, role) {
    if (!['owner','editor','viewer'].includes(role)) throw new ValidationError('不支援的成員角色。');
    const { ref, set, update } = this.#modules;
    await set(ref(this.#database, `trips/${tripId}/members/${uid}`), role);
    await set(ref(this.#database, `userTrips/${uid}/${tripId}`), true);
  }

  async removeMember(tripId, uid) {
    const { ref, remove } = this.#modules;
    await remove(ref(this.#database, `userTrips/${uid}/${tripId}`));
    await remove(ref(this.#database, `trips/${tripId}/members/${uid}`));
  }

  async replaceAll() { throw new ValidationError('為避免覆蓋雲端資料，請逐趟匯入備份。'); }

  async disconnect() {
    if (this.#auth) await this.#modules.signOut(this.#auth).catch(() => {});
    if (this.#app) await this.#modules.deleteApp(this.#app).catch(() => {});
    this.#app = this.#auth = this.#database = this.#uid = undefined;
  }
  close() { return this.disconnect(); }
}
