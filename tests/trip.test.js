import { describe, expect, it } from 'vitest';
import { addGroup, createItem, createTrip, expenseTotals, tripDates, validateBackup } from '../src/domain/trip.js';

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
});
