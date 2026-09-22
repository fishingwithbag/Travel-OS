import { describe, expect, it } from 'vitest';
import { addGroup, createBackup, createItem, createTrip, expenseTotals, tripDates, validateBackup, validateTrip } from '../src/domain/trip.js';

describe('trip domain', () => {
  it('creates dates across month and year boundaries', () => {
    expect(tripDates('2026-12-31','2027-01-02')).toEqual(['2026-12-31','2027-01-01','2027-01-02']);
  });

  it('creates a generic trip without destination defaults', () => {
    const trip = createTrip({ title:'冬日散步', destination:'Tallinn', startDate:'2027-01-01', endDate:'2027-01-03', timeZone:'Europe/Tallinn', currency:'EUR' }, 'trip-1');
    expect(trip).toMatchObject({ id:'trip-1', destination:'Tallinn', currency:'EUR', groups:[], items:[] });
  });

  it('supports zero, one and multiple groups', () => {
    const trip = createTrip({ title:'測試', destination:'Anywhere', startDate:'2027-01-01', endDate:'2027-01-01', timeZone:'UTC', currency:'USD' });
    const first = addGroup(trip, 'A', 'group-a');
    const second = addGroup({ ...trip, groups:[first] }, 'B', 'group-b');
    expect([first,second]).toHaveLength(2);
  });

  it('keeps expenses separated by currency', () => {
    expect(expenseTotals([{ amountMinor:1000,currency:'USD' },{ amountMinor:900,currency:'EUR' },{ amountMinor:500,currency:'USD' }])).toEqual({ USD:1500, EUR:900 });
  });

  it('models flight arrival separately from departure', () => {
    const trip = createTrip({ title:'跨時區', destination:'世界', startDate:'2027-01-01', endDate:'2027-01-02', timeZone:'UTC', currency:'USD' });
    const item = createItem({ date:'2027-01-01', type:'flight', title:'測試航班', origin:'AAA', destination:'BBB', departureTimeZone:'America/New_York', arrivalTimeZone:'Europe/Paris', arrivalDateTime:'2027-01-02T08:30' }, trip, 'item-1');
    expect(item.flight).toMatchObject({ departureTimeZone:'America/New_York', arrivalTimeZone:'Europe/Paris', arrivalDateTime:'2027-01-02T08:30' });
  });

  it('rejects malformed backups', () => {
    expect(() => validateBackup({ schemaVersion:1, trips:'not-an-array' })).toThrow();
  });

  it('removes notes, groups and amounts from share copies', () => {
    const trip = createTrip({ title:'Share', destination:'Test', startDate:'2027-01-01', endDate:'2027-01-01', timeZone:'UTC', currency:'USD' }, 'trip-share');
    trip.groups = [{ id:'private-group', name:'Private people' }];
    trip.items = [createItem({ date:'2027-01-01', type:'stay', title:'Hotel', notes:'booking 123', groupId:'private-group', amount:'99', currency:'USD' }, trip, 'item-share')];
    const shared = createBackup([trip], 'share');
    expect(shared.trips[0].groups).toEqual([]);
    expect(shared.trips[0].items[0]).toMatchObject({ notes:'', groupId:'', amountMinor:null });
  });

  it('normalizes imported values instead of trusting raw objects', () => {
    const trip = createTrip({ title:'Import', destination:'Test', startDate:'2027-01-01', endDate:'2027-01-01', timeZone:'UTC', currency:'USD' }, 'trip-import');
    const backup = validateBackup({ schemaVersion:1, trips:[trip] });
    expect(backup.trips[0]).toMatchObject({ id:'trip-import', items:[], groups:[] });
  });

  it('rejects duplicate trip, group and item IDs in imported data', () => {
    const first = createTrip({ title:'One', destination:'Test', startDate:'2027-01-01', endDate:'2027-01-01', timeZone:'UTC', currency:'USD' }, 'trip-duplicate');
    const second = { ...structuredClone(first), title:'Two' };
    expect(() => validateBackup({ schemaVersion:1, trips:[first,second] })).toThrow(/重複 ID/);

    const groupTrip = structuredClone(first);
    groupTrip.groups = [{ id:'group-a', name:'A' }, { id:'group-a', name:'B' }];
    expect(() => validateTrip(groupTrip)).toThrow(/重複 ID/);

    const itemTrip = structuredClone(first);
    itemTrip.items = [
      createItem({ date:'2027-01-01', type:'place', title:'A' }, first, 'item-a'),
      createItem({ date:'2027-01-01', type:'place', title:'B' }, first, 'item-a'),
    ];
    expect(() => validateTrip(itemTrip)).toThrow(/重複 ID/);
  });

  it('rejects malformed cloud-shaped trip metadata and item references', () => {
    const trip = createTrip({ title:'Cloud', destination:'Test', startDate:'2027-01-01', endDate:'2027-01-01', timeZone:'UTC', currency:'USD' }, 'trip-cloud');
    expect(() => validateTrip({ ...trip, updatedAt:123 })).toThrow(/時間戳記/);
    expect(() => validateTrip({ ...trip, updatedAt:'2027-99-99T00:00:00.000Z' })).toThrow(/時間戳記/);
    expect(() => validateTrip({ ...trip, revision:1.5 })).toThrow(/版本號/);
    expect(() => validateTrip({ ...trip, items:[{ id:'item-a', date:'2027-01-01', type:'place', title:'A', groupId:'missing', amountMinor:null, currency:'USD' }] })).toThrow(/不存在的群組/);
    expect(() => validateTrip({ ...trip, items:[{ id:'item-a', date:'2027-01-01', type:'place', title:'A', groupId:'', amountMinor:1.5, currency:'USD' }] })).toThrow(/費用金額/);
  });

  it('keeps legacy v1 flight timezone metadata readable while validating new input', () => {
    const trip = createTrip({ title:'Legacy', destination:'Test', startDate:'2027-01-01', endDate:'2027-01-01', timeZone:'UTC', currency:'USD' }, 'trip-legacy');
    expect(() => createItem({ date:'2027-01-01', type:'flight', title:'Flight', departureTimeZone:'GMT+8' }, trip, 'item-a')).toThrow(/IANA/);
    const legacyItem = { id:'item-a', date:'2027-01-01', type:'flight', title:'Flight', startTime:'', location:'', notes:'', groupId:'', amountMinor:null, currency:'USD', flight:{ origin:'', destination:'', departureTimeZone:'GMT+8', arrivalTimeZone:'', arrivalDateTime:'' } };
    expect(validateTrip({ ...trip, items:[legacyItem] }).items[0].flight.departureTimeZone).toBe('GMT+8');
  });
});
