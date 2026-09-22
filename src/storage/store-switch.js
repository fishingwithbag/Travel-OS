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
