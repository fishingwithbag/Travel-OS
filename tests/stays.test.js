import {describe,expect,it} from 'vitest';
import {createBackup,createItem,createStay,createTrip,stayItemInput,validateBackup,validateTrip} from '../src/domain/trip.js';
import {parseFirebaseTrip,serializeFirebaseTrip} from '../src/storage/firebase-store.js';
const trip=()=>({...createTrip({title:'Sample',destination:'Anywhere',startDate:'2026-12-31',endDate:'2027-01-02',timeZone:'UTC',currency:'USD'},'trip'),groups:[{id:'a',name:'A'}]});
const input=()=>({title:'Sample hotel',location:'Sample street',groupId:'a',checkInDate:'2026-12-31',checkInTime:'15:00',checkOutDate:'2027-01-02',checkOutTime:'11:00',room:'Twin',guests:2,booking:'DEMO-ONLY',amount:'180.50',currency:'EUR',notes:'Late arrival'});
describe('stay reservations',()=>{
  it('validates arbitrary groups, year boundaries, guest counts and independent currencies',()=>{
    const stay=createStay(input(),trip(),'stay');
    expect(stay).toMatchObject({guests:2,amountMinor:18050,currency:'EUR',booking:'DEMO-ONLY'});
    expect(createStay({...input(),groupId:''},{...trip(),groups:[]}).groupId).toBe('');
    for(const change of [{checkOutDate:'2026-12-31',checkOutTime:'14:00'},{checkInDate:'2027-02-30'},{checkOutDate:'2027-01-03'},{guests:0},{guests:1.5},{groupId:'missing'},{mapsUrl:'javascript:alert(1)'},{amount:-1}]) expect(()=>createStay({...input(),...change},trip())).toThrow();
  });
  it('creates independent check-in and check-out drafts with private reservation details and no duplicated charges',()=>{
    const current=trip(),stay=createStay(input(),current,'stay');
    for(const event of ['checkIn','checkOut']) {
      const item=createItem(stayItemInput(stay,event),current);
      expect(item).toMatchObject({date:stay[`${event}Date`],startTime:stay[`${event}Time`],type:'stay',groupId:'a',amountMinor:null});
      expect(item.notes).toContain('DEMO-ONLY');expect(item.notes).toContain('Twin');
    }
    expect(()=>stayItemInput(stay,'unknown')).toThrow();
  });
  it('round-trips private and cloud data, supports older backups and strips share data',()=>{
    const current=trip();current.stays=[createStay(input(),current,'stay')];
    expect(validateBackup(createBackup([current])).trips[0].stays).toEqual(current.stays);
    expect(parseFirebaseTrip(serializeFirebaseTrip(current)).stays).toEqual(current.stays);
    expect(validateBackup(createBackup([current],'share')).trips[0].stays).toEqual([]);
    const legacy=trip();delete legacy.stays;expect(validateTrip(legacy).stays).toEqual([]);
    expect(()=>validateTrip({...current,stays:[...current.stays,...current.stays]})).toThrow(/重複/);
    expect(()=>validateTrip({...current,stays:[{...current.stays[0],amountMinor:1.5}]})).toThrow();
  });
});
