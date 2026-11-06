import {describe,expect,it} from 'vitest';
import {createBackup,createItem,createRental,createTrip,rentalItemInput,validateBackup,validateTrip} from '../src/domain/trip.js';
import {parseFirebaseTrip,serializeFirebaseTrip} from '../src/storage/firebase-store.js';

const trip=()=>({...createTrip({title:'Sample',destination:'Anywhere',startDate:'2026-12-31',endDate:'2027-01-02',timeZone:'UTC',currency:'USD'},'trip'),groups:[{id:'a',name:'A'},{id:'b',name:'B'}]});
const input=()=>({company:'Sample rental',branch:'Central',car:'Compact',booking:'DEMO-ONLY',groupId:'a',pickupDate:'2026-12-31',pickupTime:'09:00',pickupLocation:'Central station',returnDate:'2027-01-02',returnTime:'18:00',returnLocation:'Airport',amount:'99.50',currency:'USD',notes:'Return full tank'});
describe('rental bookings',()=>{
  it('supports any group and shared cars across year boundaries',()=>{
    expect(createRental(input(),trip(),'one')).toMatchObject({groupId:'a',amountMinor:9950});
    expect(createRental({...input(),groupId:'b'},trip(),'two').groupId).toBe('b');
    expect(createRental({...input(),groupId:''},{...trip(),groups:[]},'shared').groupId).toBe('');
  });
  it('rejects invalid dates, backwards times, unknown groups and invalid costs',()=>{
    for(const change of [{pickupDate:'2027-02-30'},{returnDate:'2027-01-03'},{returnDate:'2026-12-31',returnTime:'08:00'},{groupId:'missing'},{pickupTime:'25:00'},{amount:-1},{currency:'X'},{pickupMapsUrl:'javascript:alert(1)'}]) {
      expect(()=>createRental({...input(),...change},trip())).toThrow();
    }
  });
  it('creates independent pickup and return drafts without counting the booking twice',()=>{
    const current=trip(),rental=createRental(input(),current,'one');
    for(const event of ['pickup','return']) {
      const item=createItem(rentalItemInput(rental,event),current);
      expect(item).toMatchObject({date:rental[`${event}Date`],startTime:rental[`${event}Time`],groupId:'a',amountMinor:null,type:'transport'});
      expect(item.notes).toContain('DEMO-ONLY');
    }
    expect(()=>rentalItemInput(rental,'other')).toThrow();
  });
  it('retains private reservations in backups but removes them from share copies',()=>{
    const current=trip();current.rentals=[createRental(input(),current,'one')];
    expect(validateBackup(createBackup([current])).trips[0].rentals).toEqual(current.rentals);
    expect(validateBackup(createBackup([current],'share')).trips[0].rentals).toEqual([]);
    const legacy=trip();delete legacy.rentals;expect(validateTrip(legacy).rentals).toEqual([]);
  });
  it('round-trips cloud records and rejects duplicate IDs or group removal',()=>{
    const current=trip();current.rentals=[createRental(input(),current,'one')];
    expect(parseFirebaseTrip(serializeFirebaseTrip(current)).rentals).toEqual(current.rentals);
    expect(()=>validateTrip({...current,rentals:[...current.rentals,...current.rentals]})).toThrow(/重複/);
    expect(()=>validateTrip({...current,groups:[]})).toThrow(/群組/);
    expect(()=>validateTrip({...current,rentals:[{...current.rentals[0],amountMinor:1.5}]})).toThrow();
  });
});
