import { afterAll, beforeAll, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFile } from 'node:fs/promises';
import { get, ref, set, update } from 'firebase/database';

let environment;

const trip = {
  ownerId:'owner',
  members:{ owner:'owner', editor:'editor', viewer:'viewer' },
  data:{ schemaVersion:1, id:'trip-a', title:'Test trip', destination:'Test city', startDate:'2027-01-01', endDate:'2027-01-02', timeZone:'UTC', currency:'USD', groups:[], items:[], updatedAt:'2027-01-01T00:00:00.000Z', revision:1 },
};

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId:'demo-travel-os',
    database:{ rules:await readFile(new URL('../firebase/database.rules.json', import.meta.url), 'utf8') },
  });
  await environment.withSecurityRulesDisabled(async (context) => {
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
    await assertSucceeds(set(ref(environment.authenticatedContext('owner').database(), 'trips/trip-a/members/guest'), 'viewer'));
    await assertSucceeds(set(ref(environment.authenticatedContext('owner').database(), 'userTrips/guest/trip-a'), true));
    await assertFails(set(ref(environment.authenticatedContext('owner').database(), 'trips/trip-a/members/guest'), 'admin'));
    await assertFails(set(ref(environment.authenticatedContext('editor').database(), 'userTrips/outsider/trip-a'), true));
    await assertFails(set(ref(environment.authenticatedContext('owner').database(), 'trips/trip-a/members/owner'), 'viewer'));
  });

  it('lets a user create a trip only with themselves as owner', async () => {
    const ownerDb = environment.authenticatedContext('new-owner').database();
    await assertSucceeds(set(ref(ownerDb, 'trips/trip-new'), { ...trip, ownerId:'new-owner', members:{ 'new-owner':'owner' }, data:{ ...trip.data, id:'trip-new' } }));
    const attackerDb = environment.authenticatedContext('attacker').database();
    await assertFails(set(ref(attackerDb, 'trips/trip-bad'), { ...trip, ownerId:'someone-else', members:{ attacker:'editor' }, data:{ ...trip.data, id:'trip-bad' } }));
  });

  it('isolates diagnostic writes by uid', async () => {
    await assertSucceeds(set(ref(environment.authenticatedContext('owner').database(), 'diagnostics/owner/check'), { createdAt:Date.now() }));
    await assertFails(set(ref(environment.authenticatedContext('editor').database(), 'diagnostics/owner/check'), { createdAt:Date.now() }));
  });
});
