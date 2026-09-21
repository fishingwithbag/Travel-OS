import { describe, expect, it } from 'vitest';
import { isSharedPublicDemo } from '../src/config/deployment.js';

describe('shared demo guard', () => {
  it('locks the official shared GitHub Pages host', () => {
    expect(isSharedPublicDemo('fishingwithbag.github.io')).toBe(true);
    expect(isSharedPublicDemo('FISHINGWITHBAG.GITHUB.IO')).toBe(true);
  });

  it('leaves local and independently hosted copies configurable', () => {
    expect(isSharedPublicDemo('localhost')).toBe(false);
    expect(isSharedPublicDemo('traveler.github.io')).toBe(false);
    expect(isSharedPublicDemo('fishingwithbag.github.io.example.com')).toBe(false);
  });
});
