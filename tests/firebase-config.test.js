import { describe, expect, it } from 'vitest';
import { parseFirebaseConfig, parseFirebaseConfigInput, parseRememberedConnection } from '../src/config/firebase-config.js';

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
  it('explains how to recover when firebaseConfig was copied before Realtime Database existed', () => {
    expect(() => parseFirebaseConfig('{"apiKey":"a","authDomain":"sample.firebaseapp.com","projectId":"sample","appId":"1:web:a"}')).toThrow(/Realtime Database.*Project settings/s);
  });
  it('accepts the same config through individual wizard fields', () => {
    expect(parseFirebaseConfigInput({
      firebase_apiKey:'example-browser-key', firebase_authDomain:'sample.firebaseapp.com',
      firebase_databaseURL:'https://sample-default-rtdb.asia-southeast1.firebasedatabase.app',
      firebase_projectId:'sample-project', firebase_appId:'1:123:web:abc',
    })).toMatchObject({ projectId:'sample-project', appId:'1:123:web:abc' });
  });
  it('accepts Firebase US-central firebaseio.com database URLs', () => {
    expect(parseFirebaseConfigInput({
      firebase_apiKey:'example-browser-key', firebase_authDomain:'simon-travel-os-30897.firebaseapp.com',
      firebase_databaseURL:'https://simon-travel-os-30897-default-rtdb.firebaseio.com',
      firebase_projectId:'simon-travel-os-30897', firebase_appId:'1:404970483269:web:example',
    }).databaseURL).toBe('https://simon-travel-os-30897-default-rtdb.firebaseio.com');
  });
  it('accepts and normalizes a trailing slash from Firebase Console', () => {
    expect(parseFirebaseConfigInput({
      firebase_apiKey:'example-browser-key', firebase_authDomain:'simon-travel-os-30897.firebaseapp.com',
      firebase_databaseURL:'https://simon-travel-os-30897-default-rtdb.firebaseio.com/',
      firebase_projectId:'simon-travel-os-30897', firebase_appId:'1:404970483269:web:example',
    }).databaseURL).toBe('https://simon-travel-os-30897-default-rtdb.firebaseio.com');
  });
  it('rejects non-Firebase hosts even when they contain firebaseio.com in the name', () => {
    expect(() => parseFirebaseConfigInput({
      firebase_apiKey:'example-browser-key', firebase_authDomain:'sample.firebaseapp.com',
      firebase_databaseURL:'https://firebaseio.com.evil.example/',
      firebase_projectId:'sample', firebase_appId:'1:123:web:abc',
    })).toThrow(/Realtime Database/);
  });
  it('restores a restricted Google Browser Key with remembered Firebase settings', () => {
    const firebase = parseFirebaseConfig(raw);
    const googleMapsKey = 'AIza123456789012345678901234567890';
    expect(parseRememberedConnection(JSON.stringify({ firebase, googleMapsKey }))).toEqual({ firebase, googleMapsKey });
  });
  it('keeps older Firebase-only remembered settings compatible', () => {
    const firebase = parseFirebaseConfig(raw);
    expect(parseRememberedConnection(JSON.stringify({ firebase }))).toEqual({ firebase, googleMapsKey:'' });
  });
  it('rejects a remembered entry that contains no Firebase config', () => {
    expect(() => parseRememberedConnection(JSON.stringify({ googleMapsKey:'AIza123456789012345678901234567890' }))).toThrow(/不完整/);
  });
});
