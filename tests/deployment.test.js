import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isSharedPublicDemo, shouldOpenCloudOnboarding } from '../src/config/deployment.js';

describe('shared demo guard', () => {
  it('locks the official shared GitHub Pages host', () => {
    expect(isSharedPublicDemo('fishingwithbag.github.io', '/Travel-OS/')).toBe(true);
    expect(isSharedPublicDemo('FISHINGWITHBAG.GITHUB.IO', '/Travel-OS/index.html')).toBe(true);
  });

  it('leaves local and independently hosted copies configurable', () => {
    expect(isSharedPublicDemo('localhost', '/Travel-OS/')).toBe(false);
    expect(isSharedPublicDemo('traveler.github.io', '/Travel-OS/')).toBe(false);
    expect(isSharedPublicDemo('fishingwithbag.github.io', '/My-Travel-OS/')).toBe(false);
    expect(isSharedPublicDemo('fishingwithbag.github.io.example.com', '/Travel-OS/')).toBe(false);
  });

  it('opens cloud onboarding first on self-hosted copies unless local mode was explicitly chosen', () => {
    expect(shouldOpenCloudOnboarding('traveler.github.io', '/Travel-OS/', '')).toBe(true);
    expect(shouldOpenCloudOnboarding('traveler.github.io', '/Travel-OS/', 'cloud')).toBe(true);
    expect(shouldOpenCloudOnboarding('traveler.github.io', '/Travel-OS/', 'local')).toBe(false);
    expect(shouldOpenCloudOnboarding('fishingwithbag.github.io', '/Travel-OS/', '')).toBe(false);
  });

  it('keeps the public repository unbound from production Firebase and guarded on deploy', () => {
    const root = fileURLToPath(new URL('../', import.meta.url));
    expect(fs.existsSync(`${root}.firebaserc`)).toBe(false);
    const firebaseConfig = JSON.parse(fs.readFileSync(`${root}firebase.json`, 'utf8'));
    expect(firebaseConfig.database.predeploy).toContain('node scripts/firebase-deploy-boundary.mjs guard');
  });
});
