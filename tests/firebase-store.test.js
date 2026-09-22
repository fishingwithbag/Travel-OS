import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { createItem, createTrip, touchTrip } from '../src/domain/trip.js';
import { commitIfRevisionMatches, FirebaseTripStore, normalizeFirebaseTrip, parseFirebaseTrip, serializeFirebaseTrip } from '../src/storage/firebase-store.js';

function snapshot(value) {
  return {
    val:() => value,
    exists:() => value !== null && value !== undefined,
    child:(key) => snapshot(value?.[key]),
  };
}

async function connectedStore() {
  const appModule = { initializeApp:vi.fn(() => ({ name:'app' })), deleteApp:vi.fn(async () => {}) };
  const authModule = {
    getAuth:vi.fn(() => ({ name:'auth' })),
    signInWithEmailAndPassword:vi.fn(async () => ({ user:{ uid:'owner', email:'owner@example.com' } })),
    signOut:vi.fn(async () => {}),
  };
  const databaseModule = {
    getDatabase:vi.fn(() => ({ name:'db' })),
    ref:vi.fn((database, path = '') => ({ database, path })),
    set:vi.fn(async () => {}),
    remove:vi.fn(async () => {}),
    get:vi.fn(),
    update:vi.fn(async () => {}),
    runTransaction:vi.fn(),
  };
  const store = new FirebaseTripStore(async () => [appModule, authModule, databaseModule]);
  await store.connect({ projectId:'test-project' }, { email:'owner@example.com', password:'secret' });
  databaseModule.set.mockClear();
  databaseModule.remove.mockClear();
  return { store, appModule, authModule, databaseModule };
}

describe('Firebase trip normalization', () => {
  it('restores arrays omitted by Realtime Database when they are empty', () => {
    expect(normalizeFirebaseTrip({ id:'trip-a' })).toMatchObject({ groups:[], items:[] });
  });

  it('accepts Firebase object collections without trusting their keys', () => {
    const trip = normalizeFirebaseTrip({
      id:'trip-a', groups:{ a:{ id:'group-a', name:'A' } }, items:{ b:{ id:'item-b', title:'B' } },
    });
    expect(trip.groups).toEqual([{ id:'group-a', name:'A' }]);
    expect(trip.items).toEqual([{ id:'item-b', title:'B' }]);
  });

  it('validates Firebase data after normalizing object collections', () => {
    const source = createTrip({ title:'Cloud', destination:'Test', startDate:'2027-01-01', endDate:'2027-01-01', timeZone:'UTC', currency:'USD' }, 'trip-a');
    const group = { id:'group-a', name:'A' };
    const item = createItem({ date:'2027-01-01', type:'place', title:'Museum', groupId:'group-a' }, { ...source, groups:[group] }, 'item-a');
    const parsed = parseFirebaseTrip({ ...source, groups:{ key:group }, items:{ key:item } });
    expect(parsed).toMatchObject({ id:'trip-a', groups:[group], items:[item] });
    expect(() => parseFirebaseTrip({ ...source, updatedAt:123 })).toThrow(/時間戳記/);
  });

  it('serializes cloud collections by stable IDs and rejects invalid Firebase keys', () => {
    const source = createTrip({ title:'Cloud', destination:'Test', startDate:'2027-01-01', endDate:'2027-01-01', timeZone:'UTC', currency:'USD' }, 'trip-a');
    const group = { id:'group-a', name:'A' };
    const item = createItem({ date:'2027-01-01', type:'place', title:'Museum', groupId:'group-a' }, { ...source, groups:[group] }, 'item-a');
    expect(serializeFirebaseTrip({ ...source, groups:[group], items:[item] })).toMatchObject({ groups:{ 'group-a':group }, items:{ 'item-a':item } });
    expect(() => serializeFirebaseTrip({ ...source, groups:[{ id:'bad/id', name:'Bad' }] })).toThrow(/Firebase/);
  });

  it('accepts only the next revision in optimistic concurrency checks', () => {
    const current = createTrip({ title:'Cloud', destination:'Test', startDate:'2027-01-01', endDate:'2027-01-01', timeZone:'UTC', currency:'USD' }, 'trip-a');
    const next = touchTrip(current);
    expect(commitIfRevisionMatches(current, next)).toBe(next);
    expect(commitIfRevisionMatches({ ...current, revision:2 }, next)).toBeUndefined();
    expect(commitIfRevisionMatches(null, next)).toBeUndefined();
  });

  it('creates trips and membership index in one root update', async () => {
    const { store, databaseModule } = await connectedStore();
    const trip = createTrip({ title:'Cloud', destination:'Test', startDate:'2027-01-01', endDate:'2027-01-01', timeZone:'UTC', currency:'USD' }, 'trip-new');
    databaseModule.get.mockResolvedValueOnce(snapshot(null)).mockResolvedValueOnce(snapshot({}));
    await store.saveTrip(trip);
    expect(databaseModule.update).toHaveBeenCalledOnce();
    expect(databaseModule.update.mock.calls[0][1]).toEqual({
      'trips/trip-new':{ ownerId:'owner', members:{ owner:'owner' }, data:{ ...trip, groups:{}, items:{} } },
      'userTrips/owner/trip-new':true,
    });
  });

  it('rejects a 101st cloud trip before attempting the write', async () => {
    const { store, databaseModule } = await connectedStore();
    const trip = createTrip({ title:'Cloud', destination:'Test', startDate:'2027-01-01', endDate:'2027-01-01', timeZone:'UTC', currency:'USD' }, 'trip-101');
    const fullIndex = Object.fromEntries(Array.from({ length:100 }, (_, index) => [`trip-${index}`, true]));
    databaseModule.get.mockResolvedValueOnce(snapshot(null)).mockResolvedValueOnce(snapshot(fullIndex));
    await expect(store.saveTrip(trip)).rejects.toThrow(/100 趟/);
    expect(databaseModule.update).not.toHaveBeenCalled();
  });

  it('rejects stale cloud saves instead of overwriting a newer revision', async () => {
    const { store, databaseModule } = await connectedStore();
    const current = createTrip({ title:'Cloud', destination:'Test', startDate:'2027-01-01', endDate:'2027-01-01', timeZone:'UTC', currency:'USD' }, 'trip-a');
    const next = touchTrip(current);
    databaseModule.get.mockResolvedValueOnce(snapshot({ data:current }));
    databaseModule.runTransaction.mockImplementationOnce(async (target, updater) => ({ committed:updater({ ...current, revision:2 }) !== undefined }));
    await expect(store.saveTrip(next)).rejects.toThrow(/其他裝置更新/);
  });

  it('writes member/index changes atomically and removes every index on trip deletion', async () => {
    const { store, databaseModule } = await connectedStore();
    await store.setMember('trip-a', 'guest', 'viewer');
    expect(databaseModule.update.mock.calls[0][1]).toEqual({
      'trips/trip-a/members/guest':'viewer',
      'userTrips/guest/trip-a':true,
    });
    await store.removeMember('trip-a', 'guest');
    expect(databaseModule.update.mock.calls[1][1]).toEqual({
      'trips/trip-a/members/guest':null,
      'userTrips/guest/trip-a':null,
    });
    databaseModule.get.mockResolvedValueOnce(snapshot({ members:{ owner:'owner', editor:'editor' } }));
    await store.deleteTrip('trip-a');
    expect(databaseModule.update.mock.calls[2][1]).toEqual({
      'trips/trip-a':null,
      'userTrips/owner/trip-a':null,
      'userTrips/editor/trip-a':null,
    });
  });

  it('isolates malformed indexed trips instead of failing the entire cloud list', async () => {
    const { store, databaseModule } = await connectedStore();
    const good = createTrip({ title:'Good', destination:'Test', startDate:'2027-01-01', endDate:'2027-01-01', timeZone:'UTC', currency:'USD' }, 'good');
    databaseModule.get
      .mockResolvedValueOnce(snapshot({ good:true, bad:true }))
      .mockResolvedValueOnce(snapshot({ ...good, groups:{}, items:{} }))
      .mockResolvedValueOnce(snapshot({ ...good, id:'bad', groups:'oops', items:{} }));
    const trips = await store.listTrips();
    expect(trips.map((trip) => trip.id)).toEqual(['good']);
    expect(store.consumeWarnings()).toHaveLength(1);
  });

  it('self-cleans stale indexes that no longer grant trip read permission', async () => {
    const { store, databaseModule } = await connectedStore();
    const denied = Object.assign(new Error('denied'), { code:'PERMISSION_DENIED' });
    databaseModule.get
      .mockResolvedValueOnce(snapshot({ stale:true }))
      .mockRejectedValueOnce(denied);
    expect(await store.listTrips()).toEqual([]);
    expect(databaseModule.remove).toHaveBeenCalledWith(expect.objectContaining({ path:'userTrips/owner/stale' }));
    expect(store.consumeWarnings()).toHaveLength(1);
  });
});
