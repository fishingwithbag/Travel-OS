import { describe, expect, it } from 'vitest';
import { parseFirebaseConfig, publicConnectionExport } from '../src/config/firebase-config.js';

const raw = `const firebaseConfig = {
  apiKey: "example-browser-key",
  authDomain: "sample.firebaseapp.com",
  databaseURL: "https://sample-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sample-project",
  appId: "1:123:web:abc",
};`;

describe('Firebase runtime config', () => {
  it('parses the Console object without evaluating code', () => {
    expect(parseFirebaseConfig(raw)).toMatchObject({ projectId:'sample-project', apiKey:'example-browser-key' });
  });
  it('rejects service account credentials', () => {
    expect(() => parseFirebaseConfig('{"private_key":"BEGIN PRIVATE KEY"}')).toThrow(/不接受/);
  });
  it('rejects a database URL by itself', () => {
    expect(() => parseFirebaseConfig('{"databaseURL":"https://sample.firebaseio.com"}')).toThrow(/缺少/);
  });
  it('excludes the Google key from portable settings by default', () => {
    const firebase = parseFirebaseConfig(raw);
    expect(publicConnectionExport({ firebase, googleMapsKey:'browser-key' })).not.toHaveProperty('googleMapsKey');
  });
});
