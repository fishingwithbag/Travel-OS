import { describe,expect,it } from 'vitest';
import { createTrip,createItem,editItem,createBackup,validateBackup } from '../src/domain/trip.js';
import { serializeFirebaseTrip,parseFirebaseTrip } from '../src/storage/firebase-store.js';

const trip=()=>({...createTrip({title:'Test',destination:'Anywhere',startDate:'2027-01-01',endDate:'2027-01-02',timeZone:'UTC',currency:'USD'},'trip'),groups:[{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C'}]});
const spot=(name,currency='USD')=>({name,mapsUrl:'',walkMinutes:5,feeMinor:1250,currency,note:'North entrance'});
const parking=()=>({primary:spot('Shared'),backup:{name:'',mapsUrl:''},notes:'Shared notes',mode:'split',byGroup:{a:{primary:spot('A lot'),backup:spot('A backup'),notes:'A notes'},b:{primary:spot('B lot','JPY'),backup:{name:'',mapsUrl:''},notes:''}}});
const itemInput=()=>({date:'2027-01-01',type:'place',title:'Museum',parking:parking()});

describe('shared and arbitrary-group parking',()=>{
  it('preserves every group, currency and hidden shared set through edits, backup and Firebase',()=>{
    const base=trip(); const item=createItem(itemInput(),base,'item');
    const updated=editItem({...base,items:[item]},'item',{title:'Updated',parking:{...item.parking,mode:'shared'}});
    expect(updated.items[0].parking.byGroup.a.backup.name).toBe('A backup');
    expect(updated.items[0].parking.primary.name).toBe('Shared');
    const restored=validateBackup(createBackup([updated])).trips[0];
    expect(parseFirebaseTrip(serializeFirebaseTrip(restored))).toEqual(updated);
    expect(restored.items[0].parking.byGroup.b.primary.currency).toBe('JPY');
    expect(createBackup([updated],'share').trips[0].items[0].parking).toBeNull();
  });
  it('accepts legacy flat fields and keeps absent optional fields absent',()=>{
    expect(createItem({date:'2027-01-01',type:'place',title:'Old',parkingPrimaryName:'Old garage'},trip()).parking).toEqual({primary:{name:'Old garage',mapsUrl:''},backup:{name:'',mapsUrl:''},notes:''});
    expect(createItem({date:'2027-01-01',type:'place',title:'Blank',parking:{primary:{name:'',mapsUrl:''},backup:{name:'',mapsUrl:''},mode:'shared',byGroup:{}}},trip()).parking).toBeNull();
  });
  it('normalizes Firebase numeric group-key arrays without dropping parking',()=>{
    const base={...trip(),groups:[{id:'0',name:'Zero'}]};
    const data=parking();data.byGroup={'0':data.byGroup.a};
    const saved=serializeFirebaseTrip({...base,items:[createItem({...itemInput(),parking:data},base,'item')]});
    saved.items.item.parking.byGroup=[saved.items.item.parking.byGroup['0']];
    expect(parseFirebaseTrip(saved).items[0].parking.byGroup['0'].primary.name).toBe('A lot');
  });
  it('rejects unknown groups, malformed sets, unsafe URLs and invalid amounts or minutes',()=>{
    for(const change of [{walkMinutes:-1},{walkMinutes:1.5},{feeMinor:-1},{feeMinor:1.2},{feeMinor:12,currency:''},{mapsUrl:'javascript:alert(1)'},{name:'',walkMinutes:5}]){
      const data=parking();data.byGroup.a.primary={...data.byGroup.a.primary,...change};
      expect(()=>createItem({...itemInput(),parking:data},trip())).toThrow();
    }
    for(const data of [{...parking(),byGroup:{outsider:parking().byGroup.a}},{...parking(),byGroup:[]},{...parking(),byGroup:{a:null}},{...parking(),mode:'other'}]) expect(()=>createItem({...itemInput(),parking:data},trip())).toThrow();
    expect(()=>createItem(itemInput(),{...trip(),groups:[]})).toThrow();
  });
});
