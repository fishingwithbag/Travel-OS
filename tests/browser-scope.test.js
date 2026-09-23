import { describe, expect, it } from 'vitest';
import { browserStorageScope, indexedDbNameForDeployment, localStorageKey } from '../src/storage/browser-scope.js';

describe('browser storage isolation', () => {
  it('uses the GitHub Pages repository path as the storage scope', () => {
    expect(browserStorageScope('https://user.github.io/Travel-OS/')).toBe('Travel-OS');
    expect(browserStorageScope('https://user.github.io/Travel-OS/index.html')).toBe('Travel-OS');
  });

  it('keeps different repositories on the same github.io origin isolated', () => {
    expect(indexedDbNameForDeployment('https://user.github.io/Travel-OS/')).not.toBe(indexedDbNameForDeployment('https://user.github.io/Travel-OS-Test/'));
    expect(localStorageKey('connection', 'https://user.github.io/Travel-OS/')).not.toBe(localStorageKey('connection', 'https://user.github.io/Travel-OS-Test/'));
  });

  it('keeps root deployments stable', () => {
    expect(indexedDbNameForDeployment('https://travel.example.com/')).toBe('travel-os:root');
    expect(localStorageKey('theme', 'https://travel.example.com/')).toBe('travel-os:root:theme');
  });
});
