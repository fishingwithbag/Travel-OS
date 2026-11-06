import {afterEach,beforeEach,expect,it,vi} from 'vitest';
let settings,stored;
const key='synthetic-browser-key-not-real';
beforeEach(async()=>{
  vi.resetModules();stored=new Map();
  vi.stubGlobal('localStorage',{getItem:name=>stored.get(name) ?? null,setItem:(name,value)=>stored.set(name,value),removeItem:name=>stored.delete(name)});
  settings=await import('../src/config/google-settings.js');
});
afterEach(()=>vi.unstubAllGlobals());
it('keeps settings in memory unless remembering is explicitly selected',()=>{
  settings.setGoogleKey(key);expect(settings.googleKey()).toBe(key);expect(stored.size).toBe(0);
  settings.setGoogleKey(key,true);expect(stored.size).toBe(1);
  settings.setGoogleKey(key,false);expect(stored.size).toBe(0);
});
it('clears remembered settings and notifies consumers when disabled',()=>{
  settings.setGoogleKey(key,true);const changed=vi.fn();settings.googleSettingsChanged.addEventListener('change',changed);
  settings.setGoogleKey('');expect(settings.googleKey()).toBe('');expect(stored.size).toBe(0);expect(changed).toHaveBeenCalledTimes(1);
});
it('rejects invalid input without replacing a working setting',()=>{
  settings.setGoogleKey(key);expect(()=>settings.setGoogleKey('{"private_key":"secret"}')).toThrow();expect(settings.googleKey()).toBe(key);
});
it('removes remembered keys on the public demo and discards malformed stored values',()=>{
  settings.setGoogleKey(key,true);settings.restoreGoogleKey(true);expect(stored.size).toBe(0);expect(settings.googleKey()).toBe('');
  stored.set('travel-os:root:google-browser-key','bad');settings.restoreGoogleKey();expect(stored.size).toBe(0);
});
