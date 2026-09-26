import { describe, expect, it, vi } from 'vitest';
import { itemMapUrl, mapSearchUrl, parkingMapUrl, recommendedWebsiteRestriction, validateMapsBrowserKey, verifyMapsBrowserKey } from '../src/providers/maps.js';

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
  it('accepts browser-key-shaped values and rejects unrelated secrets', () => {
    expect(validateMapsBrowserKey('AIza123456789012345678901234567890')).toMatch(/^AIza/);
    expect(() => validateMapsBrowserKey('server-secret')).toThrow(/Browser Key/);
  });
  it('builds a host-level website restriction recommendation', () => {
    expect(recommendedWebsiteRestriction('https://traveler.github.io')).toBe('https://traveler.github.io/*');
    expect(recommendedWebsiteRestriction('file://local')).toBe('');
  });
  it('loads Maps JS with origin-scoped referrer authorization and verifies Places', async () => {
    const originalDocument = globalThis.document;
    const originalGoogle = globalThis.google;
    let appended;
    const remove = vi.fn();
    const importLibrary = vi.fn().mockResolvedValue({});
    globalThis.document = {
      createElement:() => ({ remove }),
      head:{
        append:(script) => {
          appended = script;
          globalThis.google = { maps:{ importLibrary } };
          const callback = new URL(script.src).searchParams.get('callback');
          queueMicrotask(() => globalThis[callback]());
        },
      },
    };
    try {
      await expect(verifyMapsBrowserKey('AIza123456789012345678901234567890')).resolves.toMatchObject({ enabled:true });
      const url = new URL(appended.src);
      expect(url.origin).toBe('https://maps.googleapis.com');
      expect(url.searchParams.get('auth_referrer_policy')).toBe('origin');
      expect(appended.referrerPolicy).toBe('strict-origin-when-cross-origin');
      expect(importLibrary).toHaveBeenCalledWith('places');
      expect(remove).toHaveBeenCalledOnce();
    } finally {
      globalThis.document = originalDocument;
      globalThis.google = originalGoogle;
    }
  });
});
