import { describe, expect, it } from 'vitest';
import { mapSearchUrl } from '../src/providers/maps.js';

describe('Google Maps external navigation', () => {
  it('builds a keyless Maps URL with encoded input', () => {
    expect(mapSearchUrl('City Hall & Park')).toBe('https://www.google.com/maps/search/?api=1&query=City%20Hall%20%26%20Park');
  });
  it('rejects an empty navigation query', () => {
    expect(() => mapSearchUrl('   ')).toThrow(/地點/);
  });
});
