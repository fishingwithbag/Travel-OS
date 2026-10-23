import { describe, it, expect } from 'vitest';
import { createTrip, createItem, editItem, createBackup, validateBackup } from '../src/domain/trip.js';
import { serializeFirebaseTrip, parseFirebaseTrip } from '../src/storage/firebase-store.js';
import { durationMinutes, scheduleWarnings } from '../src/domain/schedule.js';

const trip = createTrip({title:'Schedule',destination:'Sample',startDate:'2026-12-31',endDate:'2027-01-02',timeZone:'UTC'},'schedule');
const input = {date:'2026-12-31',type:'place',title:'Museum',startTime:'23:00',endDate:'2027-01-01',endTime:'01:00',transitMode:'walking',transitMinutes:'15'};

describe('editable itinerary schedule', () => {
  it('preserves overnight times and manual travel through backup and Firebase serialization', () => {
    const item = createItem(input,trip,'one');
    expect(durationMinutes(item)).toBe(120);
    const source = {...trip,items:[item]};
    expect(validateBackup(createBackup([source])).trips[0].items[0]).toEqual(item);
    expect(parseFirebaseTrip(serializeFirebaseTrip(source)).items[0]).toEqual(item);
  });
  it('edits the original ID while preserving notes, parking and other items without mutating the source', () => {
    const first=createItem({...input,notes:'Keep me',parkingPrimaryName:'Garage'},trip,'one');
    const second=createItem({...input,title:'Other'},trip,'two');
    const source={...trip,items:[first,second]};
    const edited=editItem(source,'one',{title:'Updated',endTime:'02:00'});
    expect(edited.items[0]).toMatchObject({id:'one',title:'Updated',notes:'Keep me',parking:{primary:{name:'Garage'}}});
    expect(edited.items[1]).toEqual(second);
    expect(source.items[0].title).toBe('Museum');
    expect(()=>editItem(source,'missing',{title:'No'})).toThrow(/不存在/);
  });
  it('rejects impossible intervals and invalid manual travel estimates', () => {
    for (const change of [{endDate:'2026-12-31'}, {endDate:'2027-02-30'}, {endDate:'2027-01-03'}, {endTime:''}, {startTime:''}, {endTime:'25:00'}, {transitMode:'fly'}, {transitMinutes:-1}, {transitMinutes:1.5}, {transitMinutes:1441}, {transitMode:''}]) {
      expect(()=>createItem({...input,...change},trip)).toThrow();
    }
    expect(createItem({...input,endDate:'',endTime:'',transitMode:'',transitMinutes:''},trip)).not.toHaveProperty('endTime');
  });
  it('flags next-day overlaps including travel, but does not mix group-specific schedules', () => {
    const base={...trip,groups:[{id:'a',name:'A'},{id:'b',name:'B'}]};
    const first=createItem({...input,groupId:'a'},base,'one');
    const second=createItem({date:'2027-01-01',type:'meal',title:'Breakfast',startTime:'01:05'},base,'two');
    expect(scheduleWarnings([first,second],base.groups).get('two')).toEqual(['A：與「Museum」時間衝突，至少需延後 10 分鐘（含手動交通時間）。']);
    expect(scheduleWarnings([first,{...second,groupId:'b'}],base.groups).size).toBe(0);
  });
  it('detects an earlier long overlap and avoids double-counting explicit transport', () => {
    const first=createItem({...input,startTime:'08:00',endDate:'2026-12-31',endTime:'12:00'},trip,'one');
    const second={...first,id:'two',title:'Short',startTime:'09:00',endTime:'09:10',transitMinutes:0};
    const third={...second,id:'three',startTime:'10:00',endTime:'10:10'};
    expect(scheduleWarnings([first,second,third],[]).get('three')[0]).toContain('120 分鐘');
    expect(scheduleWarnings([{...first,endTime:'09:00'},{...second,startTime:'09:00',type:'transport'}],[]).size).toBe(0);
    expect(scheduleWarnings([{...first,type:'flight'},second],[]).size).toBe(0);
    expect(durationMinutes({...first,type:'flight'})).toBeNull();
  });
});
