import {describe,it,expect} from 'vitest';
import {createTrip,createItem,createRental,createStay,createExpense,createBackup,validateBackup} from '../src/domain/trip.js';
import {groupImpact,renameGroup,removeGroup} from '../src/domain/groups.js';

function fixture() {
  const trip=createTrip({title:'Group test',destination:'Example',startDate:'2027-01-01',endDate:'2027-01-02',timeZone:'UTC',currency:'USD'});
  trip.groups=[{id:'a',name:'A'},{id:'b',name:'B'}];
  trip.items=[createItem({title:'Museum',type:'place',date:trip.startDate,groupId:'a',parking:{mode:'split',byGroup:{a:{primary:{name:'Garage',walkMinutes:0,feeMinor:500,currency:'USD'},notes:'Entrance'}}}},trip,'item')];
  return trip;
}

describe('group lifecycle',()=>{
  it('renames without changing identity or parking and rejects duplicate names',()=>{
    const trip=fixture();const result=renameGroup(trip,'a','New A');
    expect(result.groups[0]).toEqual({id:'a',name:'New A'});expect(result.items).toEqual(trip.items);
    expect(()=>renameGroup(trip,'a',' b ')).toThrow(/同名/);
    expect(()=>renameGroup(trip,'missing','New')).toThrow(/不存在/);
  });
  it('moves references and parking together, preserving a round-trip backup',()=>{
    const trip=fixture();const before=structuredClone(trip);
    expect(groupImpact(trip,'a')).toEqual({items:1,parking:1,rentals:0,stays:0,expenses:0});
    const result=removeGroup(trip,'a','b');
    expect(result.items[0].groupId).toBe('b');expect(result.items[0].parking.byGroup.b.primary.feeMinor).toBe(500);
    expect(result.items[0].parking.byGroup.a).toBeUndefined();expect(trip).toEqual(before);
    expect(validateBackup(createBackup([result])).trips[0]).toEqual(result);
  });
  it('moves the final group to shared without losing parking',()=>{
    const trip=removeGroup(fixture(),'b','');const result=removeGroup(trip,'a','');
    expect(result.groups).toEqual([]);expect(result.items[0].groupId).toBe('');
    expect(result.items[0].parking).toMatchObject({mode:'shared',primary:{name:'Garage',walkMinutes:0},notes:'Entrance'});
    expect(result.items[0].parking.byGroup).toBeUndefined();
  });
  it('moves rental, stay and expense references without changing booking details or split amounts',()=>{
    const trip=fixture();
    trip.rentals=[createRental({company:'Example rental',groupId:'a',pickupDate:trip.startDate,pickupTime:'09:00',pickupLocation:'A',returnDate:trip.endDate,returnTime:'09:00',returnLocation:'B',amount:40,booking:'DEMO'},trip,'rental')];
    trip.stays=[createStay({title:'Example stay',location:'Example street',groupId:'a',checkInDate:trip.startDate,checkInTime:'15:00',checkOutDate:trip.endDate,checkOutTime:'10:00',guests:2,amount:80},trip,'stay')];
    trip.expenses=[createExpense({title:'Example fee',date:trip.startDate,groupId:'a',amount:10,splitCount:3},trip,'expense')];
    const result=removeGroup(trip,'a','b');
    for(const key of ['rentals','stays','expenses']) expect(result[key]).toEqual(trip[key].map(entry=>({...entry,groupId:'b'})));
    expect(groupImpact(trip,'a')).toMatchObject({rentals:1,stays:1,expenses:1});
  });
  it('does not overwrite shared parking when moving a final group',()=>{
    const trip=fixture();trip.items[0].parking.primary={name:'Existing shared garage',mapsUrl:''};
    expect(()=>removeGroup(trip,'a','')).toThrow(/已有停車/);
  });
  it('rejects parking collisions and invalid destinations without mutating input',()=>{
    const trip=fixture();trip.items[0].parking.byGroup.b={primary:{name:'Other'}};
    const before=structuredClone(trip);
    expect(()=>removeGroup(trip,'a','b')).toThrow(/已有停車/);
    expect(()=>removeGroup(trip,'a','')).toThrow(/其他群組/);
    expect(()=>removeGroup(trip,'a','a')).toThrow(/移轉/);
    expect(()=>removeGroup(trip,'a','missing')).toThrow(/不存在/);
    expect(trip).toEqual(before);
  });
});
