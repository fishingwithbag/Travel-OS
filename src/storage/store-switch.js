import {ValidationError} from '../domain/trip.js';

export async function saveToActiveStore(getStore,trip) {
  const store=getStore();
  await store.saveTrip(trip);
  if(getStore()!==store) throw new ValidationError('連線已切換；原連線的儲存結果不會載入目前專案，請回到原專案確認。');
  return trip;
}

export async function prepareStoreSwitch(currentStore, nextStore) {
  let trips;
  try {
    trips = await nextStore.listTrips();
    trips.sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch (error) {
    try { await nextStore.close?.(); } catch {}
    throw error;
  }

  try { await currentStore.close?.(); }
  catch (error) {
    try { await nextStore.close?.(); } catch {}
    throw error;
  }
  return trips;
}
