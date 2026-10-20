// Experimental schema only: never deployed by firebase.json.
import {afterAll,beforeAll,beforeEach,describe,it} from 'vitest';
import {assertFails,assertSucceeds,initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {readFile} from 'node:fs/promises';
import {get,ref,set,update} from 'firebase/database';
import {createItem,createTrip,touchTrip} from '../src/domain/trip.js';
import {removeGroup} from '../src/domain/groups.js';
import {serializeFirebaseTrip} from '../src/storage/firebase-store.js';

let environment,source;
const writer="auth != null && (root.child('trips').child($tripId).child('members').child(auth.uid).val() === 'owner' || root.child('trips').child($tripId).child('members').child(auth.uid).val() === 'editor')";
const target=uid=>ref(environment.authenticatedContext(uid).database(),'trips/trip-a');
const publish=next=>({head:next.revision,[`versions/${next.revision}`]:serializeFirebaseTrip(next)});

beforeAll(async()=>{
  const rules=JSON.parse(await readFile(new URL('../firebase/database.rules.json',import.meta.url),'utf8'));
  const current=rules.rules.trips.$tripId;
  const snapshot=structuredClone(current.data);
  delete snapshot['.write'];
  // Reuse every field/reference validator; only revision placement changes.
  const boundary=snapshot['.validate'].indexOf(' && ((!data.exists()');
  if(boundary<0) throw new Error('Review snapshot experiment after production validation changes');
  snapshot['.validate']=snapshot['.validate'].slice(0,boundary)
    +" && newData.child('revision').val() + '' === $revision"
    +" && newData.parent().parent().child('head').val() === newData.child('revision').val()"
    +" && (!root.child('trips').child($tripId).exists() || newData.child('createdAt').val() === root.child('trips').child($tripId).child('versions').child(root.child('trips').child($tripId).child('head').val() + '').child('createdAt').val())";
  snapshot['.write']=`(${writer}) && ((!data.exists() && newData.exists() && newData.child('revision').val() === root.child('trips').child($tripId).child('head').val() + 1 && newData.parent().parent().child('head').val() === newData.child('revision').val()) || (data.exists() && !newData.exists() && newData.parent().parent().child('head').val() + '' !== $revision))`;
  rules.rules.trips.$tripId={
    '.read':current['.read'],
    '.write':"auth != null && ((!data.exists() && newData.child('ownerId').val() === auth.uid && newData.child('head').val() === 1) || (data.child('ownerId').val() === auth.uid && !newData.exists()))",
    '.validate':"newData.hasChildren(['ownerId','members','head','versions']) && newData.child('ownerId').isString() && (!data.exists() || newData.child('ownerId').val() === data.child('ownerId').val()) && newData.child('members').child(newData.child('ownerId').val()).val() === 'owner' && newData.child('versions').child(newData.child('head').val() + '').child('revision').val() === newData.child('head').val()",
    ownerId:{'.validate':"newData.isString()"},
    members:{...current.members,'.write':"auth != null && root.child('trips').child($tripId).child('ownerId').val() === auth.uid"},
    head:{
      '.write':writer,
      '.validate':"newData.isNumber() && newData.val() % 1 === 0 && ((!data.exists() && newData.val() === 1) || newData.val() === data.val() + 1)",
    },
    versions:{$revision:snapshot},
    $other:{'.validate':false},
  };
  environment=await initializeTestEnvironment({projectId:'demo-travel-os-snapshot',database:{rules:JSON.stringify(rules)}});
});
beforeEach(async()=>{
  source={...createTrip({title:'Snapshot example',destination:'Example',startDate:'2027-01-01',endDate:'2027-01-02',timeZone:'UTC'},'trip-a'),groups:[{id:'a',name:'A'},{id:'b',name:'B'}]};
  source.items=[createItem({title:'Museum',type:'place',date:source.startDate,groupId:'a',parking:{mode:'split',byGroup:{a:{primary:{name:'Garage'},notes:'Entrance'}}}},source,'item')];
  await environment.clearDatabase();
  await assertSucceeds(set(target('owner'),{ownerId:'owner',members:{owner:'owner',editor:'editor',viewer:'viewer'},head:1,versions:{1:serializeFirebaseTrip(source)}}));
});
afterAll(async()=>environment?.cleanup());

describe('Experimental immutable snapshots (not production rules)',()=>{
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
});
