import { describe, expect, it } from 'vitest';
import { mapSearchUrl, validateMapsBrowserKey } from '../src/providers/maps.js';

describe('Google Maps optional provider', () => {
  it('builds a keyless Maps URL with encoded input', () => {
    expect(mapSearchUrl('City Hall & Park')).toBe('https://www.google.com/maps/search/?api=1&query=City%20Hall%20%26%20Park');
  });
  it('allows an empty key as a supported degraded mode', () => {
    expect(validateMapsBrowserKey('')).toBe('');
  });
  it('rejects keys that are not browser API key shaped', () => {
    expect(() => validateMapsBrowserKey('server-secret')).toThrow(/格式/);
  });
});
