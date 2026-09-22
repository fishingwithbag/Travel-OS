import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
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

  it('keeps the public repository unbound from production Firebase and guarded on deploy', () => {
    const root = fileURLToPath(new URL('../', import.meta.url));
    expect(fs.existsSync(`${root}.firebaserc`)).toBe(false);
    const firebaseConfig = JSON.parse(fs.readFileSync(`${root}firebase.json`, 'utf8'));
    expect(firebaseConfig.database.predeploy).toContain('node scripts/firebase-deploy-boundary.mjs guard');
  });
});
