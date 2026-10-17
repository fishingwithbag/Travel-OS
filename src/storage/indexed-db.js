import { indexedDbNameForDeployment } from './browser-scope.js';
import { ValidationError } from '../domain/trip.js';

const DB_VERSION = 1;
const STORE = 'trips';

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class IndexedDbTripStore {
  #database;
  #databaseName;

  constructor(databaseName = indexedDbNameForDeployment()) {
    this.#databaseName = databaseName;
  }

  async connect() {
    if (this.#database) return this;
    const request = indexedDB.open(this.#databaseName, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    this.#database = await requestResult(request);
    return this;
  }

  #store(mode = 'readonly') {
    if (!this.#database) throw new Error('Storage is not connected.');
    return this.#database.transaction(STORE, mode).objectStore(STORE);
  }

  async listTrips() { return requestResult(this.#store().getAll()); }
  async getTrip(id) { return requestResult(this.#store().get(id)); }
  async saveTrip(trip) {
    const target = this.#store('readwrite');
    const transaction = target.transaction;
    return new Promise((resolve,reject) => {
      let failure;
      transaction.oncomplete = () => resolve(trip);
      transaction.onabort = () => reject(failure || transaction.error || new Error('IndexedDB transaction aborted.'));
      const request = target.get(trip.id);
      request.onsuccess = () => {
        const expected = request.result ? request.result.revision + 1 : 1;
        if (trip.revision !== expected) {
          failure = new ValidationError('本機旅程已被其他分頁更新，請先保留未儲存內容，再重新載入後編輯。');
          transaction.abort(); return;
        }
        try { target.put(structuredClone(trip)); }
        catch (error) { failure = error; transaction.abort(); }
      };
    });
  }
  async deleteTrip(id) { await requestResult(this.#store('readwrite').delete(id)); }
  async replaceAll(trips) {
    const transaction = this.#database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).clear();
    trips.forEach((trip) => transaction.objectStore(STORE).put(structuredClone(trip)));
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted.'));
    });
  }
  close() { this.#database?.close(); this.#database = undefined; }
}
