import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFile } from 'node:fs/promises';
import { get, ref, set, update } from 'firebase/database';

let environment;

const trip = {
  ownerId:'owner',
  members:{ owner:'owner', editor:'editor', viewer:'viewer' },
  data:{ schemaVersion:1, id:'trip-a', title:'Test trip', destination:'Test city', startDate:'2027-01-01', endDate:'2027-01-02', timeZone:'UTC', currency:'USD', groups:[], items:[], createdAt:'2027-01-01T00:00:00.000Z', updatedAt:'2027-01-01T00:00:00.000Z', revision:1 },
};

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId:'demo-travel-os',
    database:{ rules:await readFile(new URL('../firebase/database.rules.json', import.meta.url), 'utf8') },
  });
});

beforeEach(async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await set(ref(context.database()), null);
    await set(ref(context.database(), 'trips/trip-a'), trip);
    await set(ref(context.database(), 'userTrips/owner/trip-a'), true);
    await set(ref(context.database(), 'userTrips/editor/trip-a'), true);
    await set(ref(context.database(), 'userTrips/viewer/trip-a'), true);
  });
});

afterAll(async () => environment?.cleanup());

describe('Realtime Database tenant isolation', () => {
  it('denies unauthenticated and outsider trip reads', async () => {
    await assertFails(get(ref(environment.unauthenticatedContext().database(), 'trips/trip-a')));
    await assertFails(get(ref(environment.authenticatedContext('outsider').database(), 'trips/trip-a')));
  });

  it('allows members to read only their indexed trips', async () => {
    await assertSucceeds(get(ref(environment.authenticatedContext('viewer').database(), 'trips/trip-a/data')));
    await assertSucceeds(get(ref(environment.authenticatedContext('viewer').database(), 'userTrips/viewer')));
    await assertFails(get(ref(environment.authenticatedContext('viewer').database(), 'userTrips/owner')));
  });

  it('allows owner and editor to update trip data', async () => {
    await assertSucceeds(update(ref(environment.authenticatedContext('owner').database(), 'trips/trip-a/data'), { title:'Owner edit', revision:2 }));
    await assertSucceeds(update(ref(environment.authenticatedContext('editor').database(), 'trips/trip-a/data'), { title:'Editor edit', revision:3 }));
  });

  it('prevents viewer writes and editor privilege escalation', async () => {
    await assertFails(update(ref(environment.authenticatedContext('viewer').database(), 'trips/trip-a/data'), { title:'Viewer edit', revision:4 }));
    await assertFails(set(ref(environment.authenticatedContext('editor').database(), 'trips/trip-a/members/editor'), 'owner'));
  });

  it('allows owner to manage valid roles and rejects invalid roles', async () => {
    const ownerDb = environment.authenticatedContext('owner').database();
    await assertSucceeds(update(ref(ownerDb), {
      'trips/trip-a/members/guest':'viewer',
      'userTrips/guest/trip-a':true,
    }));
    await assertFails(set(ref(environment.authenticatedContext('owner').database(), 'trips/trip-a/members/guest'), 'admin'));
    await assertFails(set(ref(environment.authenticatedContext('editor').database(), 'userTrips/outsider/trip-a'), true));
    await assertFails(set(ref(environment.authenticatedContext('owner').database(), 'trips/trip-a/members/owner'), 'viewer'));
  });

  it('prevents arbitrary self-indexing and supports atomic owner index add/remove', async () => {
    const outsiderDb = environment.authenticatedContext('outsider').database();
    const ownerDb = environment.authenticatedContext('owner').database();
    await assertFails(set(ref(outsiderDb, 'userTrips/outsider/trip-a'), true));
    await assertFails(set(ref(ownerDb, 'userTrips/guest/trip-a'), true));
    await assertSucceeds(update(ref(ownerDb), {
      'trips/trip-a/members/guest':'viewer',
      'userTrips/guest/trip-a':true,
    }));
    await assertSucceeds(update(ref(ownerDb), {
      'trips/trip-a/members/guest':null,
      'userTrips/guest/trip-a':null,
    }));
    await assertFails(set(ref(environment.authenticatedContext('guest').database(), 'userTrips/guest/trip-a'), true));
  });

  it('lets a user create a trip only with themselves as owner', async () => {
    const ownerDb = environment.authenticatedContext('new-owner').database();
    await assertSucceeds(set(ref(ownerDb, 'trips/trip-new'), { ...trip, ownerId:'new-owner', members:{ 'new-owner':'owner' }, data:{ ...trip.data, id:'trip-new' } }));
    await assertSucceeds(update(ref(ownerDb), {
      'trips/trip-atomic':{ ...trip, ownerId:'new-owner', members:{ 'new-owner':'owner' }, data:{ ...trip.data, id:'trip-atomic' } },
      'userTrips/new-owner/trip-atomic':true,
    }));
    await assertFails(set(ref(ownerDb, 'trips/trip-revision-two'), { ...trip, ownerId:'new-owner', members:{ 'new-owner':'owner' }, data:{ ...trip.data, id:'trip-revision-two', revision:2 } }));
    await assertFails(set(ref(ownerDb, 'trips/trip-fractional'), { ...trip, ownerId:'new-owner', members:{ 'new-owner':'owner' }, data:{ ...trip.data, id:'trip-fractional', revision:1.5 } }));
    const attackerDb = environment.authenticatedContext('attacker').database();
    await assertFails(set(ref(attackerDb, 'trips/trip-bad'), { ...trip, ownerId:'someone-else', members:{ attacker:'editor' }, data:{ ...trip.data, id:'trip-bad' } }));
  });

  it('rejects malformed required trip data and unknown top-level fields', async () => {
    const ownerData = ref(environment.authenticatedContext('owner').database(), 'trips/trip-a/data');
    await assertFails(update(ownerData, { schemaVersion:2, revision:2 }));
    await assertFails(update(ownerData, { id:'different-trip', revision:2 }));
    await assertFails(update(ownerData, { title:'', revision:2 }));
    await assertFails(update(ownerData, { title:'   ', revision:2 }));
    await assertFails(update(ownerData, { title:'x'.repeat(81), revision:2 }));
    await assertFails(update(ownerData, { destination:'', revision:2 }));
    await assertFails(update(ownerData, { destination:'   ', revision:2 }));
    await assertFails(update(ownerData, { destination:'x'.repeat(121), revision:2 }));
    await assertFails(update(ownerData, { startDate:'2027-1-01', revision:2 }));
    await assertFails(update(ownerData, { startDate:'2027-02-01', endDate:'2027-01-02', revision:2 }));
    await assertFails(update(ownerData, { timeZone:'', revision:2 }));
    await assertFails(update(ownerData, { timeZone:'x'.repeat(65), revision:2 }));
    await assertFails(update(ownerData, { currency:'usd', revision:2 }));
    await assertFails(update(ownerData, { createdAt:123, revision:2 }));
    await assertFails(update(ownerData, { createdAt:'2027-01-02T00:00:00.000Z', revision:2 }));
    await assertFails(update(ownerData, { createdAt:'not-a-date', revision:2 }));
    await assertFails(update(ownerData, { updatedAt:123, revision:2 }));
    await assertFails(update(ownerData, { updatedAt:'not-a-date', revision:2 }));
    await assertFails(update(ownerData, { unexpected:'nope', revision:2 }));
  });

  it('accepts safe single-segment timezone aliases used by Intl implementations', async () => {
    const ownerData = ref(environment.authenticatedContext('owner').database(), 'trips/trip-a/data');
    await assertSucceeds(update(ownerData, { timeZone:'CET', revision:2 }));
  });

  it('accepts Firebase list/object representations but validates group and item entries', async () => {
    const ownerData = ref(environment.authenticatedContext('owner').database(), 'trips/trip-a/data');
    await assertSucceeds(update(ownerData, {
      groups:{ 'group-a':{ id:'group-a', name:'A' } },
      items:{ 'item-a':{ id:'item-a', date:'2027-01-01', type:'place', title:'Museum', startTime:'09:30', groupId:'group-a', currency:'USD' } },
      revision:2,
    }));
    await assertFails(update(ownerData, {
      groups:{ 0:{ id:'group-a', name:'A' } },
      revision:3,
    }));
    await assertFails(update(ownerData, { groups:'oops', revision:3 }));
    await assertFails(update(ownerData, { items:'oops', revision:3 }));
    await assertFails(update(ownerData, {
      groups:{ 'group-a':{ id:'group-a', name:'A', unexpected:true } },
      revision:3,
    }));
    await assertFails(update(ownerData, {
      items:{ 'item-a':{ id:'item-a', date:'2027-01-01', type:'invalid', title:'Museum', currency:'USD' } },
      revision:3,
    }));
    await assertFails(update(ownerData, {
      items:{ 'item-a':{ id:'item-a', date:'2027-01-03', type:'place', title:'Museum', currency:'USD' } },
      revision:3,
    }));
    await assertFails(update(ownerData, {
      items:{ 'item-a':{ id:'item-a', date:'2027-01-01', type:'place', title:'Museum', startTime:'25:99', currency:'USD' } },
      revision:3,
    }));
    await assertFails(update(ownerData, {
      items:{ 'item-a':{ id:'item-a', date:'2027-01-01', type:'place', title:'Museum', groupId:'missing', currency:'USD' } },
      revision:3,
    }));
    await assertFails(update(ownerData, {
      items:{ 'item-a':{ id:'item-a', date:'2027-01-01', type:'place', title:'Museum', amountMinor:100000000001, currency:'USD' } },
      revision:3,
    }));
  });

  it('allows safe destination and parking maps but rejects unsafe links and extra parking fields', async () => {
    const ownerData = ref(environment.authenticatedContext('owner').database(), 'trips/trip-a/data');
    const item = {
      id:'item-a', date:'2027-01-01', type:'place', title:'Sample museum', currency:'USD',
      mapsUrl:'https://maps.app.goo.gl/sample',
      parking:{
        primary:{ name:'Main garage', mapsUrl:'https://www.google.com/maps/search/?api=1&query=garage' },
        backup:{ name:'Backup garage', mapsUrl:'' }, notes:'Side entrance',
      },
    };
    await assertSucceeds(update(ownerData, { items:{ 'item-a':item }, revision:2 }));
    await assertFails(update(ownerData, { items:{ 'item-a':{ ...item, mapsUrl:'https://example.com/phishing' } }, revision:3 }));
    await assertFails(update(ownerData, { items:{ 'item-a':{ ...item, parking:{ ...item.parking, unexpected:'value' } } }, revision:3 }));
  });

  it('requires revisions to advance by exactly one and rejects stale or skipped writes', async () => {
    const ownerData = ref(environment.authenticatedContext('owner').database(), 'trips/trip-a/data');
    await assertFails(update(ownerData, { title:'Stale', revision:1 }));
    await assertFails(update(ownerData, { title:'Skipped', revision:3 }));
    await assertFails(update(ownerData, { title:'Fractional', revision:1.5 }));
    await assertSucceeds(update(ownerData, { title:'Revision two', revision:2 }));
    await assertFails(update(ownerData, { title:'Stale again', revision:2 }));
    await assertFails(update(ownerData, { title:'Skip again', revision:4 }));
    await assertSucceeds(update(ownerData, { title:'Revision three', revision:3 }));
  });

  it('allows owner to atomically delete a trip and every member index', async () => {
    const ownerDb = environment.authenticatedContext('owner').database();
    await assertSucceeds(update(ref(ownerDb), {
      'trips/trip-a':null,
      'userTrips/owner/trip-a':null,
      'userTrips/editor/trip-a':null,
      'userTrips/viewer/trip-a':null,
    }));
  });

  it('isolates diagnostic writes by uid', async () => {
    await assertSucceeds(set(ref(environment.authenticatedContext('owner').database(), 'diagnostics/owner/check'), { createdAt:Date.now() }));
    await assertFails(set(ref(environment.authenticatedContext('editor').database(), 'diagnostics/owner/check'), { createdAt:Date.now() }));
  });
});
