import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const html = fs.readFileSync(`${root}index.html`, 'utf8');
const app = fs.readFileSync(`${root}src/app.js`, 'utf8');

describe('zero-basis setup wizard', () => {
  it('uses six separate setup panels instead of one long configuration page', () => {
    expect((html.match(/data-setup-step="\d"/g) || [])).toHaveLength(6);
    expect(html).toContain('STEP 1 · YOUR WEBSITE');
    expect(html).toContain('STEP 2 · FIREBASE');
    expect(html).toContain('STEP 3 · MAPS NAVIGATION');
    expect(html).toContain('STEP 4 · SIGN IN');
    expect(html).toContain('STEP 5 · VERIFY');
  });

  it('keeps hidden panels hidden and does not fade the whole guide', () => {
    const css = fs.readFileSync(`${root}src/styles.css`, 'utf8');
    expect(css).toContain('[hidden] { display:none!important; }');
    expect(css).not.toContain('.connection-fields:disabled { opacity:.48; }');
  });

  it('documents the critical Firebase safety path in the wizard itself', () => {
    expect(html).toContain('Spark 免費方案');
    expect(html).toContain('不要選測試模式');
    expect(html).toContain('鎖定模式');
    expect(html).toContain('copy-rules-button');
    expect(html).toContain('SDK 設定與配置');
    expect(html).toContain('const firebaseConfig = {');
  });

  it('explains that Realtime Database URL is copied separately from the Data tab', () => {
    expect(html).toContain('複製 Realtime Database URL');
    expect(html).toContain('Realtime Database →「資料」');
    expect(html).toContain('不要複製資料區裡顯示的');
    expect(html).toContain('firebaseConfig 裡沒有 databaseURL 也沒關係');
    expect(app).toContain("elements.firebase_databaseURL.addEventListener('change', updateFirebaseConfigPreview)");
    expect(app).not.toContain('請重新複製最新 firebaseConfig');
  });

  it('does not require a paid Maps key for keyless external navigation or cloud login', () => {
    expect(html).toContain('Google Maps 外部導航不需要 API Key');
    expect(html).not.toContain('name="googleMapsKey"');
    expect(app).not.toContain('verifyMapsBrowserKey');
    expect(app).not.toContain('validateMapsBrowserKey');
  });

  it('contains a dedicated warning for the official demo URL', () => {
    expect(html).toContain('official-demo-url-warning');
    expect(html).toContain('官方 Demo 教學網址');
    expect(html).toContain('請勿在此設定 Firebase、Google API Key 或登入帳密');
  });
});
