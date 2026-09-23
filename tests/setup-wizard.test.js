import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const html = fs.readFileSync(`${root}index.html`, 'utf8');

describe('zero-basis setup wizard', () => {
  it('uses six separate setup panels instead of one long configuration page', () => {
    expect((html.match(/data-setup-step="\d"/g) || [])).toHaveLength(6);
    expect(html).toContain('STEP 1 · YOUR WEBSITE');
    expect(html).toContain('STEP 2 · FIREBASE');
    expect(html).toContain('STEP 3 · GOOGLE MAPS');
    expect(html).toContain('STEP 4 · SIGN IN');
    expect(html).toContain('STEP 5 · VERIFY');
  });

  it('documents the critical Firebase safety path in the wizard itself', () => {
    expect(html).toContain('Spark 免費方案');
    expect(html).toContain('不要選 Test mode');
    expect(html).toContain('Locked mode');
    expect(html).toContain('copy-rules-button');
    expect(html).toContain('SDK setup and configuration');
    expect(html).toContain('const firebaseConfig = {');
  });

  it('separates the billed Maps project from the Spark Firebase project', () => {
    expect(html).toContain('和上一頁的 Firebase Spark project 分開');
    expect(html).toContain('Application restrictions');
    expect(html).toContain('API restrictions');
    expect(html).toContain('不要保留 unrestricted');
  });
});
