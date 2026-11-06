// Direct writes against the production Rules; bypass all application validation.
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {assertFails,assertSucceeds,initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {readFile} from 'node:fs/promises';
import {get,ref,set,update} from 'firebase/database';
import * as databaseSdk from 'firebase/database';
import {createExpense,createPlace,createRental,createStay,createItem,createTrip,touchTrip,validateBackup,restoredTripCopy} from '../src/domain/trip.js';
import {removeGroup} from '../src/domain/groups.js';
import {FirebaseTripStore,serializeFirebaseTrip,firebaseTripValue} from '../src/storage/firebase-store.js';

let environment,source;
const target=uid=>ref(environment.authenticatedContext(uid).database(),'trips/trip-a');
const publish=next=>({head:next.revision,[`versions/${next.revision}`]:serializeFirebaseTrip(next),[`versions/${next.revision-1}`]:null});
async function connect(uid) {
  const store=new FirebaseTripStore(async()=>[
    {initializeApp:()=>({}),deleteApp:async()=>{}},
    {getAuth:()=>({}),setPersistence:async()=>{},inMemoryPersistence:{},signInWithEmailAndPassword:async()=>({user:{uid}}),signOut:async()=>{}},
    {...databaseSdk,getDatabase:()=>environment.authenticatedContext(uid).database()},
  ]);
  await store.connect({projectId:'demo-travel-os-snapshot'},{email:'emulator@example.com',password:'emulator-only'});
  return store;
}

beforeAll(async()=>{
  const rules=JSON.parse(await readFile(new URL('../firebase/database.rules.json',import.meta.url),'utf8'));
  environment=await initializeTestEnvironment({projectId:'demo-travel-os-snapshot',database:{rules:JSON.stringify(rules)}});
});
beforeEach(async()=>{
  source={...createTrip({title:'Snapshot example',destination:'Example',startDate:'2027-01-01',endDate:'2027-01-02',timeZone:'UTC'},'trip-a'),groups:[{id:'a',name:'A'},{id:'b',name:'B'}]};
  source.items=[createItem({title:'Museum',type:'place',date:source.startDate,groupId:'a',parking:{mode:'split',byGroup:{a:{primary:{name:'Garage'},notes:'Entrance'}}}},source,'item')];
  await environment.clearDatabase();
  await assertSucceeds(set(target('owner'),{ownerId:'owner',members:{owner:'owner',editor:'editor',viewer:'viewer'},head:1,versions:{1:serializeFirebaseTrip(source)}}));
});
afterAll(async()=>environment?.cleanup());

describe('Immutable snapshots: production Rules',()=>{
  it('requires old-version cleanup in the same publish and rejects extra retained history',async()=>{
    const next=touchTrip(source);
    await assertFails(update(target('editor'),{head:2,'versions/2':serializeFirebaseTrip(next)}));
    await assertSucceeds(update(target('editor'),publish(next)));
    const raw=(await get(target('owner'))).val();
    expect(Object.keys(raw.versions)).toEqual(['2']);
  });
  it.each(['owner','editor'])('rejects %s partial deletion and mutation of a published snapshot',async uid=>{
    await assertFails(update(target(uid),{'versions/1/groups/a':null}));
    await assertFails(update(target(uid),{'versions/1/items/item/title':'Changed'}));
    await assertFails(update(target(uid),{'versions/1':null}));
  });
  it('rejects orphaned group and parking references even when copied unchanged',async()=>{
    const raw=serializeFirebaseTrip(touchTrip(source));
    delete raw.groups.a;
    await assertFails(update(target('editor'),{head:2,'versions/2':raw}));
    raw.items.item.groupId='b';
    await assertFails(update(target('editor'),{head:2,'versions/2':raw}));
  });
  it('allows complete transfer and atomic cleanup without retaining unbounded history',async()=>{
    const next=touchTrip(removeGroup(source,'a','b'));
    await assertSucceeds(update(target('editor'),{...publish(next),'versions/1':null}));
    const final=touchTrip(removeGroup(next,'b',''));
    await assertSucceeds(update(target('editor'),{...publish(final),'versions/2':null}));
    await assertFails(update(target('editor'),{'versions/1':serializeFirebaseTrip(source)}));
  });
  it('rejects head-only, unpublished, stale and skipped revisions',async()=>{
    const next=touchTrip(source);
    await assertFails(update(target('editor'),{head:2}));
    await assertFails(update(target('editor'),{'versions/2':serializeFirebaseTrip(next)}));
    await assertFails(update(target('editor'),publish({...next,revision:3})));
    await assertSucceeds(update(target('editor'),publish(next)));
    await assertFails(update(target('editor'),publish(next)));
    await assertFails(update(target('editor'),{head:1}));
    await assertFails(update(target('owner'),{head:null}));
    await assertFails(update(target('owner'),{versions:null}));
  });
  it('rejects extra pre-seeded revisions during initial creation',async()=>{
    await assertSucceeds(set(target('owner'),null));
    await assertFails(set(target('owner'),{
      ownerId:'owner',members:{owner:'owner'},head:1,
      versions:{1:serializeFirebaseTrip(source),2:serializeFirebaseTrip(touchTrip(source))},
    }));
  });
  it('rejects viewer/outsider writes, outsider reads and editor escalation',async()=>{
    for(const uid of ['viewer','outsider']) await assertFails(update(target(uid),publish(touchTrip(source))));
    await assertFails(get(target('outsider')));
    await assertFails(update(target('editor'),{'members/editor':'owner'}));
    await assertFails(update(target('owner'),{'members/owner':null}));
    await assertSucceeds(update(target('owner'),{'members/editor':'viewer'}));
    await assertFails(update(target('editor'),publish(touchTrip(source))));
  });
  it('allows only the owner to delete the whole trip',async()=>{
    await assertFails(set(target('editor'),null));
    await assertSucceeds(set(target('owner'),null));
  });
  it('freezes legacy writes and permits only an atomic owner migration',async()=>{
    const legacy={ownerId:'owner',members:{owner:'owner',editor:'editor',viewer:'viewer'},data:serializeFirebaseTrip(source)};
    await environment.withSecurityRulesDisabled(context=>set(ref(context.database(),'trips/trip-a'),legacy));
    for(const uid of ['owner','editor','viewer']) {
      await assertSucceeds(get(target(uid)));
      await assertFails(update(target(uid),{'data/title':'Old writer','data/revision':2}));
      await assertFails(update(target(uid),{data:null}));
    }
    const next=touchTrip(source),migration={data:null,head:2,'versions/2':serializeFirebaseTrip(next)};
    await assertFails(update(target('editor'),migration));
    await assertFails(update(target('owner'),{...migration,data:legacy.data}));
    await assertFails(update(target('owner'),{...migration,head:3}));
    await assertSucceeds(update(target('owner'),migration));
    expect((await get(target('owner'))).val().members).toEqual(legacy.members);
    await assertFails(update(target('owner'),{'data':legacy.data}));
  });
  it('rejects an invalid migration atomically and leaves all legacy data untouched',async()=>{
    const legacy={ownerId:'owner',members:{owner:'owner'},data:serializeFirebaseTrip(source)};
    await environment.withSecurityRulesDisabled(context=>set(ref(context.database(),'trips/trip-a'),legacy));
    const before=(await get(target('owner'))).val();
    const invalid=serializeFirebaseTrip(touchTrip(source));delete invalid.groups.a;
    await assertFails(update(target('owner'),{data:null,head:2,'versions/2':invalid}));
    expect((await get(target('owner'))).val()).toEqual(before);
    await assertFails(update(target('owner'),{data:null,head:2,'versions/2':{...serializeFirebaseTrip(touchTrip(source)),createdAt:'2020-01-01T00:00:00.000Z'}}));
  });
  it('migrates recovered data through the real SDK and restores the backup as a fresh owned trip',async()=>{
    source.places=[createPlace({title:'Example café',favorite:true},'place')];
    source.rentals=[createRental({company:'Example rental',groupId:'a',pickupDate:source.startDate,pickupTime:'09:00',pickupLocation:'Station',returnDate:source.endDate,returnTime:'18:00',returnLocation:'Airport'},source,'rental')];
    source.stays=[createStay({title:'Example hotel',location:'Example street',checkInDate:source.startDate,checkInTime:'15:00',checkOutDate:source.endDate,checkOutTime:'11:00',guests:2,groupId:'a'},source,'stay')];
    source.expenses=[createExpense({title:'Dinner',date:source.startDate,amount:10,splitCount:3,groupId:'a',currency:'USD'},source,'expense')];
    const original=serializeFirebaseTrip(source);delete original.groups.a;
    const legacy={ownerId:'owner',members:{owner:'owner',editor:'editor',viewer:'viewer'},data:original};
    await environment.withSecurityRulesDisabled(async context=>{
      await set(ref(context.database(),'trips/trip-a'),legacy);
      await set(ref(context.database(),'userTrips/owner/trip-a'),true);
    });
    const owner=await connect('owner'),editor=await connect('editor');
    try {
      const before=(await get(target('owner'))).val();
      const preview=await owner.prepareMigration('trip-a');
      expect(preview.recovered).toEqual([{id:'a',name:'待確認群組 1'}]);
      expect(preview.backup.migrationOriginalData).toEqual(before.data);
      await expect(editor.migrateTrip('trip-a',1)).rejects.toThrow(/只有旅程擁有者/);
      await expect(owner.migrateTrip('trip-a',99)).rejects.toThrow(/重新下載備份/);
      expect((await get(target('owner'))).val()).toEqual(before);
      const migrated=await owner.migrateTrip('trip-a',1);
      expect(migrated.items).toEqual(source.items);expect(migrated.revision).toBe(2);
      const byId=groups=>[...groups].sort((a,b)=>a.id.localeCompare(b.id));
      expect(byId((await owner.getTrip('trip-a')).groups)).toEqual(byId(preview.trip.groups));
      for(const field of ['items','places','rentals','stays','expenses']) expect(migrated[field]).toEqual(source[field]);
      expect((await get(target('owner'))).val().members).toEqual(legacy.members);
      const restored=restoredTripCopy(validateBackup(preview.backup).trips[0],'restored');
      await owner.saveTrip(restored);
      expect(await owner.getTrip('restored')).toEqual({...restored,groups:byId(restored.groups)});
      await assertFails(get(ref(environment.authenticatedContext('viewer').database(),'trips/restored')));
      expect((await owner.getTrip('trip-a')).revision).toBe(2);
    } finally {await owner.disconnect();await editor.disconnect();}
  });
  it('allows exactly one competing SDK save and preserves the winning full snapshot',async()=>{
    await environment.withSecurityRulesDisabled(context=>set(ref(context.database(),'userTrips/owner/trip-a'),true));
    const first=await connect('owner'),second=await connect('owner');
    try {
      const results=await Promise.allSettled([
        first.saveTrip(touchTrip({...source,title:'First writer'})),
        second.saveTrip(touchTrip({...source,title:'Second writer'})),
      ]);
      expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);
      const rejected=results.find(result=>result.status==='rejected');
      expect(rejected.reason.message).toMatch(/其他裝置更新/);
      const raw=(await get(target('owner'))).val();
      expect(Object.keys(raw.versions)).toEqual(['2']);
      expect(firebaseTripValue(raw).title).toBe(results.find(result=>result.status==='fulfilled').value.title);
    } finally {await first.disconnect();await second.disconnect();}
  });
  it('requires the current diagnostic format, so old Rules cannot falsely pass the wizard probe',async()=>{
    const check=ref(environment.authenticatedContext('owner').database(),'diagnostics/owner/check');
    await assertFails(set(check,{createdAt:Date.now()}));
    await assertFails(set(check,{createdAt:Date.now(),storageFormat:3}));
    await assertSucceeds(set(check,{createdAt:Date.now(),storageFormat:2}));
    await assertSucceeds(set(check,null));
  });
  it('fails the current connection probe against the previous diagnostic Rules',async()=>{
    const oldEnvironment=await initializeTestEnvironment({projectId:'demo-travel-os-old-rules',database:{rules:JSON.stringify({rules:{diagnostics:{$uid:{'.read':'auth != null && auth.uid === $uid','.write':'auth != null && auth.uid === $uid',$entry:{'.validate':"newData.hasChildren(['createdAt'])",createdAt:{'.validate':'newData.isNumber()'},$other:{'.validate':false}}}}}})}});
    const store=new FirebaseTripStore(async()=>[
      {initializeApp:()=>({}),deleteApp:async()=>{}},
      {getAuth:()=>({}),setPersistence:async()=>{},inMemoryPersistence:{},signInWithEmailAndPassword:async()=>({user:{uid:'owner'}}),signOut:async()=>{}},
      {...databaseSdk,getDatabase:()=>oldEnvironment.authenticatedContext('owner').database()},
    ]);
    try {await expect(store.connect({projectId:'demo-travel-os-old-rules'},{email:'emulator@example.com',password:'emulator-only'})).rejects.toThrow(/Step 2/);}
    finally {await store.disconnect();await oldEnvironment.cleanup();}
  });
});
