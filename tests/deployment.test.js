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

  it('keeps the app shell, manifest and service worker relative for repository subpaths', () => {
    const root = fileURLToPath(new URL('../', import.meta.url));
    const viteConfig = fs.readFileSync(`${root}vite.config.js`, 'utf8');
    const manifest = JSON.parse(fs.readFileSync(`${root}public/manifest.webmanifest`, 'utf8'));
    const serviceWorker = fs.readFileSync(`${root}public/sw.js`, 'utf8');
    expect(viteConfig).toContain("base:'./'");
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
    expect(serviceWorker).toContain("const CACHE = 'travel-os-shell-v3'");
    expect(serviceWorker).toContain("const SHELL = ['./']");
    expect(serviceWorker).toContain("key.startsWith('travel-os-shell-') && key !== CACHE");
  });
});
