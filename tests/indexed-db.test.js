import 'fake-indexeddb/auto';
import { it, expect } from 'vitest';
import { IndexedDbTripStore } from '../src/storage/indexed-db.js';
import { createTrip, touchTrip } from '../src/domain/trip.js';

it('commits edits atomically and refuses stale updates from another tab', async () => {
  const name=`schedule-${crypto.randomUUID()}`;
  const first=await new IndexedDbTripStore(name).connect();
  const second=await new IndexedDbTripStore(name).connect();
  try {
    const trip=createTrip({title:'Initial',destination:'Sample',startDate:'2027-01-01',endDate:'2027-01-01',timeZone:'UTC'},'one');
    await first.saveTrip(trip);
    const results=await Promise.allSettled([
      first.saveTrip(touchTrip({...trip,title:'First edit'})),
      second.saveTrip(touchTrip({...trip,title:'Second edit'})),
    ]);
    expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);
    expect(results.find(result=>result.status==='rejected').reason.message).toContain('其他分頁');
    expect((await second.getTrip('one')).revision).toBe(2);
    expect((await second.getTrip('one')).title).toBe('First edit');
  } finally { first.close(); second.close(); }
});
