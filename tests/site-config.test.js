import { describe, expect, it, vi } from 'vitest';
import { loadSiteConfig, parseSiteConfig } from '../src/config/site-config.js';

const firebase = {apiKey:'example-browser-key', authDomain:'sample.firebaseapp.com', databaseURL:'https://sample-default-rtdb.firebaseio.com', projectId:'sample', appId:'1:123:web:example'};
const profile = {schemaVersion:1, firebase};

describe('operator-provided website connection', () => {
  it('keeps only public Firebase fields and validates the optional Maps key', () => {
    expect(parseSiteConfig({...profile,firebase:{...firebase,unused:'ignored'}})).toEqual(profile);
    expect(parseSiteConfig({...profile,googleMapsKey:'example-browser-maps-key'}).googleMapsKey).toBe('example-browser-maps-key');
    expect(()=>parseSiteConfig({...profile,googleMapsKey:'https://example.com/key'})).toThrow();
  });
  it('rejects credentials at any depth, unknown root fields and incompatible versions', () => {
    for(const name of ['password','private_key','client_email','refreshToken','accessToken','idToken','serviceAccount','secret']) {
      expect(()=>parseSiteConfig({...profile,firebase:{...firebase,[name]:'not-a-real-credential'}})).toThrow();
    }
    expect(()=>parseSiteConfig({...profile,email:'traveler@example.com'})).toThrow();
    expect(()=>parseSiteConfig({...profile,schemaVersion:2})).toThrow();
    expect(()=>parseSiteConfig('{invalid}')).toThrow();
    expect(()=>parseSiteConfig(' '.repeat(20_001))).toThrow();
  });
  it('reads only the current deployment subpath without cookies, redirects or cached configuration', async () => {
    const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify(profile),{headers:{'content-type':'application/json'}}));
    expect(await loadSiteConfig('https://example.test/Travel-OS/?view=more',fetcher)).toEqual(profile);
    expect(String(fetcher.mock.calls[0][0])).toBe('https://example.test/Travel-OS/site-config.json');
    expect(fetcher.mock.calls[0][1]).toMatchObject({cache:'no-store',credentials:'omit',redirect:'error'});
  });
  it('keeps independent operator setup available when no site profile is published', async () => {
    expect(await loadSiteConfig('https://example.test/',async()=>new Response('',{status:404}))).toBeNull();
    expect(await loadSiteConfig('https://example.test/',async()=>new Response('<html>app shell</html>',{headers:{'content-type':'text/html'}}))).toBeNull();
  });
  it('rejects failed or invalid deployed configuration instead of using another remembered project', async () => {
    await expect(loadSiteConfig('https://example.test/',async()=>new Response('',{status:403}))).rejects.toThrow(/建立者/);
    await expect(loadSiteConfig('https://example.test/',async()=>{throw new Error('offline');})).rejects.toThrow(/本機模式/);
    await expect(loadSiteConfig('https://example.test/',async()=>new Response(JSON.stringify({...profile,password:'not-a-real-password'})))).rejects.toThrow(/不接受/);
  });
});
