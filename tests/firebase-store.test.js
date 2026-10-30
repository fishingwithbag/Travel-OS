import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { createItem, createTrip, restoredTripCopy, touchTrip } from '../src/domain/trip.js';
import { firebaseTripEnvelope, firebaseTripValue, FirebaseTripStore, normalizeFirebaseTrip, parseFirebaseTrip, serializeFirebaseTrip } from '../src/storage/firebase-store.js';


function snapshot(value) {
  return {
    val:() => value,
    exists:() => value !== null && value !== undefined,
    child:(key) => snapshot(value?.[key]),
  };
}

async function connectedStore() {
  const listeners=new Map();
  const appModule = { initializeApp:vi.fn(() => ({ name:'app' })), deleteApp:vi.fn(async () => {}) };
  const authModule = {
    getAuth:vi.fn(() => ({ name:'auth' })),
    inMemoryPersistence:{ type:'NONE' },
    setPersistence:vi.fn(async () => {}),
    signInWithEmailAndPassword:vi.fn(async () => ({ user:{ uid:'owner', email:'owner@example.com' } })),
    signOut:vi.fn(async () => {}),
  };
  const databaseModule = {
    getDatabase:vi.fn(() => ({ name:'db' })),
    ref:vi.fn((database, path = '') => ({ database, path })),
    set:vi.fn(async () => {}),
    remove:vi.fn(async () => {}),
    get:vi.fn(async () => snapshot({ createdAt:databaseModule.set.mock.calls.at(-1)?.[1]?.createdAt })),
    update:vi.fn(async () => {}),
    runTransaction:vi.fn(),
    onValue:vi.fn((target,callback,cancel)=>{
      const entries=listeners.get(target.path) || new Set();listeners.set(target.path,entries);
      const entry={callback,cancel};entries.add(entry);
      return vi.fn(()=>entries.delete(entry));
    }),
  };
  const store = new FirebaseTripStore(async () => [appModule, authModule, databaseModule]);
  await store.connect({ projectId:'test-project' }, { email:'owner@example.com', password:'secret' });
  expect(authModule.setPersistence).toHaveBeenCalledWith({ name:'auth' }, authModule.inMemoryPersistence);
  expect(databaseModule.get).toHaveBeenCalledOnce();
  databaseModule.set.mockClear();
  databaseModule.remove.mockClear();
  databaseModule.get.mockClear();
  const emit=(path,value)=>{for(const listener of [...listeners.get(path) || []]) listener.callback(snapshot(value));};
  const fail=(path,error)=>{for(const listener of [...listeners.get(path) || []]) listener.cancel(error);};
  return { store, appModule, authModule, databaseModule, emit, fail, listeners };
}

const envelope=trip=>({ownerId:'owner',members:{owner:'owner'},head:trip.revision,versions:{[trip.revision]:serializeFirebaseTrip(trip)}});

describe('Firebase trip normalization', () => {
  it('previews legacy recovery and preserves the original payload in a restorable migration backup',async()=>{
    const {store,databaseModule}=await connectedStore();
    const source=createTrip({title:'Recovery',destination:'Example',startDate:'2027-01-01',endDate:'2027-01-02',timeZone:'UTC'},'trip-a');
    source.groups=[{id:'a',name:'A'}];source.items=[createItem({title:'Museum',date:source.startDate,type:'place',groupId:'a'},source,'item')];
    const raw=serializeFirebaseTrip(source);delete raw.groups;
    const legacy={ownerId:'owner',members:{owner:'owner'},data:raw};
    databaseModule.get.mockResolvedValueOnce(snapshot(legacy));
    const preview=await store.getTrip(source.id);
    expect(store.needsMigration(source.id)).toBe(true);expect(preview.items).toEqual(source.items);
    expect(store.groupRecovery(source.id)).toEqual([{id:'a',name:'待確認群組 1'}]);
    databaseModule.get.mockResolvedValueOnce(snapshot(legacy));
    const prepared=await store.prepareMigration(source.id);
    expect(prepared.backup.migrationOriginalData).toEqual(raw);expect(prepared.backup.trips[0]).toEqual(preview);
    expect(databaseModule.update).not.toHaveBeenCalled();
    databaseModule.get.mockResolvedValueOnce(snapshot(legacy));
    const migrated=await store.migrateTrip(source.id,1);
    expect(migrated.revision).toBe(2);expect(store.needsMigration(source.id)).toBe(false);
    expect(databaseModule.update.mock.calls[0][1]).toEqual({head:2,data:null,'versions/2':serializeFirebaseTrip(migrated)});
    expect(store.groupRecovery(source.id)).toEqual([]);
  });
  it('restores as a fresh trip owned by the current user without writing the source ID or importing members',async()=>{
    const {store,databaseModule}=await connectedStore();
    const source=createTrip({title:'Backup',destination:'Sample',startDate:'2027-01-01',endDate:'2027-01-02',timeZone:'UTC'},'source');
    source.revision=20;source.members={stranger:'owner'};
    const copy=restoredTripCopy(source,'restored');
    expect(copy).toMatchObject({id:'restored',revision:1,title:'Backup'});
    expect(copy).not.toHaveProperty('members');
    expect(source.revision).toBe(20);
    databaseModule.get.mockResolvedValueOnce(snapshot({source:true}));
    await store.saveTrip(copy);
    const updates=databaseModule.update.mock.calls[0][1];
    expect(Object.keys(updates)).toEqual(['trips/restored','userTrips/owner/restored']);
    expect(updates['trips/restored'].members).toEqual({owner:'owner'});
  });
  it('rejects an unreadable diagnostic and removes its temporary record', async () => {
    const appModule = { initializeApp:vi.fn(() => ({})), deleteApp:vi.fn(async () => {}) };
    const authModule = { getAuth:vi.fn(() => ({})), inMemoryPersistence:{ type:'NONE' }, setPersistence:vi.fn(async () => {}), signInWithEmailAndPassword:vi.fn(async () => ({ user:{ uid:'owner' } })), signOut:vi.fn(async () => {}) };
    const databaseModule = { getDatabase:vi.fn(() => ({})), ref:vi.fn((_, path) => path), set:vi.fn(async () => {}), get:vi.fn(async () => snapshot(null)), remove:vi.fn(async () => {}) };
    const store = new FirebaseTripStore(async () => [appModule, authModule, databaseModule]);
    await expect(store.connect({ projectId:'test-project' }, { email:'owner@example.com', password:'secret' })).rejects.toThrow(/診斷讀取失敗/);
    expect(databaseModule.remove).toHaveBeenCalledOnce();
  });

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

  it('detects unknown or incomplete storage envelopes instead of returning blank data',()=>{
    expect(()=>firebaseTripValue({head:2,versions:{}})).toThrow(/版本資料不完整/);
    expect(()=>firebaseTripValue({storageFormat:99})).toThrow(/不相容/);
    expect(()=>firebaseTripValue({head:1,versions:{1:{revision:2}}})).toThrow(/版本資料不完整/);
  });
  it('creates trips and membership index in one root update', async () => {
    const { store, databaseModule } = await connectedStore();
    const trip = createTrip({ title:'Cloud', destination:'Test', startDate:'2027-01-01', endDate:'2027-01-01', timeZone:'UTC', currency:'USD' }, 'trip-new');
    databaseModule.get.mockImplementationOnce(async (target) => {
      expect(target.path).toBe('userTrips/owner');
      return snapshot(null);
    });
    await store.saveTrip(trip);
    expect(databaseModule.get).toHaveBeenCalledOnce();
    expect(databaseModule.update).toHaveBeenCalledOnce();
    expect(databaseModule.update.mock.calls[0][1]).toEqual({
      'trips/trip-new':firebaseTripEnvelope(trip,'owner'),
      'userTrips/owner/trip-new':true,
    });
  });

  it('rejects a 101st cloud trip before attempting the write', async () => {
    const { store, databaseModule } = await connectedStore();
    const trip = createTrip({ title:'Cloud', destination:'Test', startDate:'2027-01-01', endDate:'2027-01-01', timeZone:'UTC', currency:'USD' }, 'trip-101');
    const fullIndex = Object.fromEntries(Array.from({ length:100 }, (_, index) => [`trip-${index}`, true]));
    databaseModule.get.mockResolvedValueOnce(snapshot(fullIndex));
    await expect(store.saveTrip(trip)).rejects.toThrow(/100 趟/);
    expect(databaseModule.update).not.toHaveBeenCalled();
  });

  it('rejects stale cloud saves instead of overwriting a newer revision', async () => {
    const { store, databaseModule } = await connectedStore();
    const current = createTrip({ title:'Cloud', destination:'Test', startDate:'2027-01-01', endDate:'2027-01-01', timeZone:'UTC', currency:'USD' }, 'trip-a');
    const next = touchTrip(current);
    databaseModule.get.mockResolvedValueOnce(snapshot({ 'trip-a':true }));
    databaseModule.get.mockResolvedValueOnce(snapshot(envelope({...current,revision:2})));
    await expect(store.saveTrip(next)).rejects.toThrow(/其他裝置更新/);
  });

  it('publishes a complete new version and deletes the previous one atomically',async()=>{
    const {store,databaseModule}=await connectedStore();
    const current=createTrip({title:'Cloud',destination:'Test',startDate:'2027-01-01',endDate:'2027-01-01',timeZone:'UTC'},'trip-a'),next=touchTrip(current);
    databaseModule.get.mockResolvedValueOnce(snapshot({'trip-a':true})).mockResolvedValueOnce(snapshot(envelope(current)));
    await expect(store.saveTrip(next)).resolves.toEqual(next);
    expect(databaseModule.update).toHaveBeenCalledWith(expect.objectContaining({path:'trips/trip-a'}),{head:2,'versions/1':null,'versions/2':serializeFirebaseTrip(next)});
  });
  it('blocks implicit migration and rejects stale previews or non-owner migration',async()=>{
    const {store,databaseModule}=await connectedStore();
    const trip=createTrip({title:'Legacy',destination:'Test',startDate:'2027-01-01',endDate:'2027-01-01',timeZone:'UTC'},'trip-a');
    const legacy={ownerId:'owner',members:{owner:'owner'},data:serializeFirebaseTrip(trip)};
    databaseModule.get.mockResolvedValueOnce(snapshot({'trip-a':true})).mockResolvedValueOnce(snapshot(legacy));
    await expect(store.saveTrip(touchTrip(trip))).rejects.toThrow(/舊版旅程/);
    databaseModule.get.mockResolvedValueOnce(snapshot(legacy));
    await expect(store.migrateTrip(trip.id,2)).rejects.toThrow(/重新下載備份/);
    databaseModule.get.mockResolvedValueOnce(snapshot({...legacy,ownerId:'someone'}));
    await expect(store.prepareMigration(trip.id)).rejects.toThrow(/只有旅程擁有者/);
    expect(databaseModule.update).not.toHaveBeenCalled();
  });
  it('writes member/index changes atomically and removes every index on trip deletion', async () => {
    const { store, databaseModule } = await connectedStore();
    databaseModule.get.mockResolvedValueOnce(snapshot({ownerId:'owner'}));
    await store.setMember('trip-a', 'guest', 'viewer');
    expect(databaseModule.update.mock.calls[0][1]).toEqual({
      'trips/trip-a/members/guest':'viewer',
      'userTrips/guest/trip-a':true,
    });
    databaseModule.get.mockResolvedValueOnce(snapshot({ownerId:'owner'}));
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

  it('rejects invalid member paths, owner role grants and edits by non-owners before writing',async()=>{
    const {store,databaseModule}=await connectedStore();
    for(const uid of ['','other/path','bad.key','bad\nkey']) await expect(store.setMember('trip-a',uid,'viewer')).rejects.toThrow(/UID/);
    await expect(store.setMember('trip-a','guest','owner')).rejects.toThrow(/原擁有者/);
    databaseModule.get.mockResolvedValueOnce(snapshot({ownerId:'owner'}));
    await expect(store.removeMember('trip-a','owner')).rejects.toThrow(/原旅程擁有者/);
    databaseModule.get.mockResolvedValueOnce(snapshot({ownerId:'someone-else',members:{owner:'editor'}}));
    await expect(store.setMember('trip-a','guest','editor')).rejects.toThrow(/只有旅程擁有者/);
    expect(databaseModule.update).not.toHaveBeenCalled();
  });

  it('receives trip revisions and roles only from indexed memberships and unsubscribes removed trips',async()=>{
    const {store,databaseModule,emit}=await connectedStore();
    const events={onTrip:vi.fn(),onRemove:vi.fn(),onError:vi.fn()};
    const stop=store.subscribe(events);
    const trip=createTrip({title:'Live',destination:'Sample',startDate:'2027-01-01',endDate:'2027-01-01',timeZone:'UTC'},'trip-a');
    emit('userTrips/owner',{'trip-a':true});
    const root={...envelope(trip),members:{owner:'owner',guest:'viewer'}};
    emit('trips/trip-a',root);
    expect(events.onTrip).toHaveBeenLastCalledWith(trip,{ownerId:'owner',members:root.members,role:'owner'});
    const updated=touchTrip({...trip,title:'Remote edit'});emit('trips/trip-a',{...root,head:updated.revision,versions:{[updated.revision]:serializeFirebaseTrip(updated)}});
    expect(events.onTrip.mock.calls.at(-1)[0].title).toBe('Remote edit');
    const late=databaseModule.onValue.mock.calls.find(([target])=>target.path==='trips/trip-a')[1];
    emit('userTrips/owner',null);late(snapshot(root));
    expect(events.onRemove).toHaveBeenCalledWith('trip-a');expect(events.onTrip).toHaveBeenCalledTimes(2);
    expect(databaseModule.onValue.mock.calls.map(([target])=>target.path)).not.toContain('trips');
    stop();
  });

  it('clears revoked or malformed trips and ignores queued events after project disconnect',async()=>{
    const {store,databaseModule,emit,fail,listeners}=await connectedStore();
    const events={onTrip:vi.fn(),onRemove:vi.fn(),onError:vi.fn()};store.subscribe(events);
    emit('userTrips/owner',{a:true,b:true});
    emit('trips/a',{ownerId:'owner',members:{owner:'owner'},data:{schemaVersion:999}});
    expect(events.onRemove).toHaveBeenCalledWith('a');expect(events.onError).toHaveBeenCalledOnce();
    fail('trips/b',new Error('permission revoked'));expect(events.onRemove).toHaveBeenCalledWith('b');
    const queuedIndex=databaseModule.onValue.mock.calls[0][1];
    await store.disconnect();
    const calls=databaseModule.onValue.mock.calls.length;queuedIndex(snapshot({late:true}));
    expect(databaseModule.onValue).toHaveBeenCalledTimes(calls);
    expect([...listeners.values()].every(entries=>entries.size===0)).toBe(true);
  });

  it('blocks new offline writes while retaining the draft and reports connection recovery',async()=>{
    const {store,databaseModule,emit}=await connectedStore();
    const onConnection=vi.fn();const stop=store.subscribe({onTrip:vi.fn(),onRemove:vi.fn(),onError:vi.fn(),onConnection});
    const trip=createTrip({title:'Offline draft',destination:'Sample',startDate:'2027-01-01',endDate:'2027-01-01',timeZone:'UTC'},'trip-a');
    emit('.info/connected',false);
    await expect(store.saveTrip(trip)).rejects.toThrow(/連線已中斷/);
    expect(databaseModule.update).not.toHaveBeenCalled();expect(trip.title).toBe('Offline draft');
    emit('.info/connected',true);databaseModule.get.mockResolvedValueOnce(snapshot({}));
    await expect(store.saveTrip(trip)).resolves.toEqual(trip);
    expect(onConnection.mock.calls.map(([value])=>value)).toEqual([false,true]);stop();
  });

  it('isolates malformed indexed trips instead of failing the entire cloud list', async () => {
    const { store, databaseModule } = await connectedStore();
    const good = createTrip({ title:'Good', destination:'Test', startDate:'2027-01-01', endDate:'2027-01-01', timeZone:'UTC', currency:'USD' }, 'good');
    databaseModule.get
      .mockResolvedValueOnce(snapshot({ good:true, bad:true }))
      .mockResolvedValueOnce(snapshot(envelope(good)))
      .mockResolvedValueOnce(snapshot({data:{ ...good,id:'bad',groups:'oops',items:{} }}));
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
