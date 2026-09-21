import { describe, expect, it } from 'vitest';
import { normalizeFirebaseTrip } from '../src/storage/firebase-store.js';

describe('Firebase trip normalization', () => {
  it('restores arrays omitted by Realtime Database when they are empty', () => {
    expect(normalizeFirebaseTrip({ id:'trip-a' })).toMatchObject({ groups:[], items:[] });
  });

  it('accepts Firebase object collections without trusting their keys', () => {
    const trip = normalizeFirebaseTrip({
      id:'trip-a', groups:{ a:{ id:'group-a', name:'A' } }, items:{ b:{ id:'item-b', title:'B' } },
    });
    expect(trip.groups).toEqual([{ id:'group-a', name:'A' }]);
    expect(trip.items).toEqual([{ id:'item-b', title:'B' }]);
  });
});
