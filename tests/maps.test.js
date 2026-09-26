import { describe, expect, it } from 'vitest';
import { itemMapUrl, mapSearchUrl, parkingMapUrl } from '../src/providers/maps.js';

describe('Google Maps external navigation', () => {
  it('uses an exact destination link and keeps parking navigation separate', () => {
    const item = { title:'Sample museum', location:'Sample City', mapsUrl:'https://maps.app.goo.gl/destination' };
    expect(itemMapUrl(item)).toBe('https://maps.app.goo.gl/destination');
    expect(parkingMapUrl({ name:'Sample garage' })).toBe(mapSearchUrl('Sample garage'));
    expect(itemMapUrl({ title:'Sample museum', location:'' })).toBe(mapSearchUrl('Sample museum'));
  });
  it('builds a keyless Maps URL with encoded input', () => {
    expect(mapSearchUrl('City Hall & Park')).toBe('https://www.google.com/maps/search/?api=1&query=City%20Hall%20%26%20Park');
  });
  it('rejects an empty navigation query', () => {
    expect(() => mapSearchUrl('   ')).toThrow(/地點/);
  });
});
