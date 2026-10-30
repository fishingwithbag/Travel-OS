import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const rulesUrl = new URL('../firebase/database.rules.json', import.meta.url);

describe('Realtime Database Rules structure', () => {
  it('keeps the Firebase Console representation compact', async () => {
    const rules = JSON.parse(await readFile(rulesUrl, 'utf8'));
    const consoleLines = JSON.stringify(rules, null, 2).split('\n').length;

    expect(consoleLines).toBeLessThanOrEqual(200);
  });

  it('collapses primitive field checks without removing the deny-by-default root', async () => {
    const rules = JSON.parse(await readFile(rulesUrl, 'utf8'));
    const serialized = JSON.stringify(rules);

    expect(rules.rules['.read']).toBe(false);
    expect(rules.rules['.write']).toBe(false);
    expect(serialized).toContain('"$field"');
  });
});
