import { describe, expect, it, vi } from 'vitest';
import { prepareStoreSwitch,saveToActiveStore } from '../src/storage/store-switch.js';

describe('store switching', () => {
  it('does not return an old project write after the active store changes',async()=>{
    let finish;
    const first={saveTrip:vi.fn(()=>new Promise(resolve=>{finish=resolve;}))};
    let active=first;
    const pending=saveToActiveStore(()=>active,{id:'draft'});
    active={saveTrip:vi.fn()};finish();
    await expect(pending).rejects.toThrow(/連線已切換/);
    expect(active.saveTrip).not.toHaveBeenCalled();
  });
  it('returns confirmed writes only for the same store and preserves write failures',async()=>{
    const trip={id:'draft'},store={saveTrip:vi.fn(async()=>{})};
    await expect(saveToActiveStore(()=>store,trip)).resolves.toBe(trip);
    store.saveTrip.mockRejectedValueOnce(new Error('network failure'));
    await expect(saveToActiveStore(()=>store,trip)).rejects.toThrow('network failure');
  });
  it('keeps the current store open when the next store cannot load', async () => {
    const currentStore = { close:vi.fn() };
    const nextStore = { listTrips:vi.fn().mockRejectedValue(new Error('load failed')), close:vi.fn() };
    await expect(prepareStoreSwitch(currentStore, nextStore)).rejects.toThrow('load failed');
    expect(currentStore.close).not.toHaveBeenCalled();
    expect(nextStore.close).toHaveBeenCalledOnce();
  });

  it('loads and sorts the next store before closing the current store', async () => {
    const currentStore = { close:vi.fn() };
    const nextStore = { listTrips:vi.fn().mockResolvedValue([
      { id:'old', updatedAt:'2027-01-01T00:00:00.000Z' },
      { id:'new', updatedAt:'2027-01-02T00:00:00.000Z' },
    ]), close:vi.fn() };
    const trips = await prepareStoreSwitch(currentStore, nextStore);
    expect(trips.map((trip) => trip.id)).toEqual(['new','old']);
    expect(currentStore.close).toHaveBeenCalledOnce();
    expect(nextStore.close).not.toHaveBeenCalled();
  });

  it('closes the next store when closing the current store fails', async () => {
    const currentStore = { close:vi.fn().mockRejectedValue(new Error('close failed')) };
    const nextStore = { listTrips:vi.fn().mockResolvedValue([]), close:vi.fn() };
    await expect(prepareStoreSwitch(currentStore, nextStore)).rejects.toThrow('close failed');
    expect(nextStore.close).toHaveBeenCalledOnce();
  });

  it('preserves the original load error even if cleanup also fails', async () => {
    const currentStore = { close:vi.fn() };
    const nextStore = {
      listTrips:vi.fn().mockRejectedValue(new Error('load failed')),
      close:vi.fn().mockRejectedValue(new Error('cleanup failed')),
    };
    await expect(prepareStoreSwitch(currentStore, nextStore)).rejects.toThrow('load failed');
    expect(currentStore.close).not.toHaveBeenCalled();
  });
});
