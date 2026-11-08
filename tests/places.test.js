import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createBackup, createItem, createPlace, createTrip, filterPlaces, placeItemInput, touchTrip, validateBackup, validateTrip } from '../src/domain/trip.js';
import { parseFirebaseTrip, serializeFirebaseTrip } from '../src/storage/firebase-store.js';
import { IndexedDbTripStore } from '../src/storage/indexed-db.js';

const newTrip = id=>createTrip({title:'Sample',destination:'Anywhere',startDate:'2027-01-01',endDate:'2027-01-02',timeZone:'UTC'},id);
const cafe = ()=>createPlace({title:'Sample café',category:'餐廳',subcategory:'咖啡',region:'North',location:'Market street',notes:'預約提醒',hours:'09:00–17:00',favorite:true},'cafe');

describe('per-trip place library',()=>{
  it('searches notes and addresses, combines filters, and sorts without changing stored order',()=>{
    const places=[createPlace({title:'Museum',category:'景點',region:'South'},'museum'),cafe()];
    expect(filterPlaces(places,{query:'預約',category:'餐廳',subcategory:'咖啡',region:'North',favorites:true})).toEqual([cafe()]);
    expect(filterPlaces(places,{query:'market'})).toEqual([cafe()]);
    expect(filterPlaces(places,{region:'South',favorites:true})).toEqual([]);
    expect(filterPlaces(places,{sort:'favorite'})[0].id).toBe('cafe');
    expect(places[0].id).toBe('museum');
  });
  it('copies place details into an editable dated arrangement without linking later edits',()=>{
    const trip=newTrip('one'); const place=cafe();
    const item=createItem(placeItemInput(place,trip.endDate),trip,'visit');
    expect(item).toMatchObject({date:trip.endDate,type:'meal',title:place.title,location:place.location});
    expect(item.notes).toContain('營業時間：09:00–17:00');
    place.notes='Changed'; expect(item.notes).toContain('預約提醒');
    const longPlace=createPlace({...cafe(),notes:'a'.repeat(1000)});
    const input=placeItemInput(longPlace,trip.startDate);
    expect(input.notes).toContain(longPlace.notes);
    expect(()=>createItem(input,trip)).toThrow(/最多 1000 字/);
    expect(placeItemInput({...place,category:'toString'},trip.startDate).type).toBe('place');
  });
  it('retains places in private backup and removes the entire candidate library from share copies',()=>{
    const trip={...newTrip('one'),places:[cafe()]};
    expect(validateBackup(createBackup([trip])).trips[0].places).toEqual([cafe()]);
    expect(validateBackup(createBackup([trip],'share')).trips[0].places).toEqual([]);
    const legacy=newTrip('legacy'); delete legacy.places;
    expect(validateTrip(legacy).places).toEqual([]);
  });
  it('rejects malformed favorites, unsafe links, missing or duplicate IDs and oversized fields',()=>{
    expect(()=>createPlace({...cafe(),favorite:'yes'})).toThrow();
    expect(()=>createPlace({...cafe(),mapsUrl:'javascript:alert(1)'})).toThrow();
    expect(()=>createPlace({...cafe(),title:'a'.repeat(101)})).toThrow();
    expect(()=>validateTrip({...newTrip('one'),places:[cafe(),cafe()]})).toThrow(/重複/);
    expect(()=>validateTrip({...newTrip('one'),places:[{title:'Missing ID'}]})).toThrow();
    expect(()=>validateTrip({...newTrip('one'),places:{}})).toThrow();
  });
  it('round-trips Firebase stable-key collections and rejects invalid keys',()=>{
    const trip={...newTrip('one'),places:[cafe()]};
    const cloud=serializeFirebaseTrip(trip);
    expect(cloud.places.cafe).toEqual(cafe());
    expect(parseFirebaseTrip(cloud).places).toEqual([cafe()]);
    expect(()=>serializeFirebaseTrip({...trip,places:[{...cafe(),id:'bad/id'}]})).toThrow(/Firebase/);
  });
  it('persists favorite edits across connections and isolates trips and stale updates',async()=>{
    const name=`places-${crypto.randomUUID()}`; const first=await new IndexedDbTripStore(name).connect();
    const second=await new IndexedDbTripStore(name).connect();
    try {
      const trip={...newTrip('one'),places:[cafe()]}; await first.saveTrip(trip); await first.saveTrip(newTrip('two'));
      await first.saveTrip(touchTrip({...trip,places:[{...cafe(),favorite:false}]}));
      await expect(second.saveTrip(touchTrip({...trip,places:[]}))).rejects.toThrow(/其他分頁/);
      expect((await second.getTrip('one')).places[0].favorite).toBe(false);
      expect((await second.getTrip('two')).places).toEqual([]);
    } finally {first.close();second.close();}
  });
});
