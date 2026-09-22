import { describe, expect, it } from 'vitest';
import { parseFirebaseConfig, parseFirebaseConfigInput, parseRememberedFirebaseConnection } from '../src/config/firebase-config.js';

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
  it('accepts the same config through individual wizard fields', () => {
    expect(parseFirebaseConfigInput({
      firebase_apiKey:'example-browser-key', firebase_authDomain:'sample.firebaseapp.com',
      firebase_databaseURL:'https://sample-default-rtdb.asia-southeast1.firebasedatabase.app',
      firebase_projectId:'sample-project', firebase_appId:'1:123:web:abc',
    })).toMatchObject({ projectId:'sample-project', appId:'1:123:web:abc' });
  });
  it('migrates remembered Firebase settings without retaining legacy Google keys', () => {
    const firebase = parseFirebaseConfig(raw);
    expect(parseRememberedFirebaseConnection(JSON.stringify({ firebase, googleMapsKey:'legacy-browser-key' }))).toEqual({ firebase });
  });
  it('rejects a legacy remembered entry that contains no Firebase config', () => {
    expect(() => parseRememberedFirebaseConnection(JSON.stringify({ googleMapsKey:'legacy-browser-key' }))).toThrow(/不完整/);
  });
});
