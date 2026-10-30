import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';

// Synthetic value, never sent to a real endpoint.
const key = 'test-browser-key-not-a-credential';
let loader, scripts, browser, importLibrary;
beforeEach(async () => {
  vi.resetModules(); vi.useFakeTimers();
  scripts = []; browser = {location:{hostname:'localhost',pathname:'/Travel-OS/'}};
  importLibrary = vi.fn(async name => ({name}));
  vi.stubGlobal('window', browser);
  vi.stubGlobal('document', {
    querySelector:vi.fn(() => null),
    createElement:() => ({remove:vi.fn()}),
    head:{append:script => scripts.push(script)},
  });
  loader = await import('../src/providers/google-loader.js');
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
function ready() { browser.google = {maps:{importLibrary}}; browser.__travelOsMapsReady(); }

describe('runtime Google SDK boundary', () => {
  it('keeps the official demo from sending a user key to Google', async () => {
    browser.location.hostname = 'fishingwithbag.github.io';
    await expect(loader.loadGoogleLibrary(key,'places')).rejects.toThrow(/公開體驗站/);
    expect(scripts).toHaveLength(0);
  });
  it('does not request anything on import or invalid/missing settings', async () => {
    for (const invalid of ['',null,{},'https://example.test/key','{"private_key":"secret"}','x\nsecret']) {
      await expect(loader.loadGoogleLibrary(invalid,'places')).rejects.toThrow(/API Key/);
    }
    await expect(loader.loadGoogleLibrary(key,'unknown')).rejects.toThrow(/不支援/);
    expect(scripts).toHaveLength(0);
  });
  it('loads once on demand, shares concurrent libraries, and exposes no config storage', async () => {
    const a = loader.loadGoogleLibrary(` ${key} `,'places');
    const b = loader.loadGoogleLibrary(key,'places');
    const c = loader.loadGoogleLibrary(key,'routes');
    expect(scripts).toHaveLength(1);
    const url = new URL(scripts[0].src);
    expect(url.origin).toBe('https://maps.googleapis.com');
    expect(url.searchParams.get('key')).toBe(key);
    expect(url.searchParams.get('loading')).toBe('async');
    expect(url.searchParams.has('libraries')).toBe(false);
    ready();
    expect(await Promise.all([a,b,c])).toEqual([{name:'places'},{name:'places'},{name:'routes'}]);
    expect(importLibrary).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
    await expect(loader.loadGoogleLibrary('another-test-browser-key','places')).rejects.toThrow(/切換 Key/);
    expect(scripts).toHaveLength(1);
  });
  it('rejects unowned SDKs without issuing another request', async () => {
    browser.google = {maps:{importLibrary}};
    await expect(loader.loadGoogleLibrary(key,'places')).rejects.toThrow(/來源未確認/);
    expect(scripts).toHaveLength(0);
  });
  it('handles download failure without returning a key or unsafe SDK error text', async () => {
    const pending = loader.loadGoogleLibrary(key,'places');
    const assertion = expect(pending).rejects.toThrow(/無法下載/);
    scripts[0].onerror(new Error(key));
    await assertion;
    await expect(loader.loadGoogleLibrary(key,'places')).rejects.not.toThrow(key);
    expect(scripts).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('rejects bootstrap timeout and ignores a late callback', async () => {
    const pending = loader.loadGoogleLibrary(key,'places');
    const assertion = expect(pending).rejects.toThrow(/逾時/);
    await vi.advanceTimersByTimeAsync(20000); await assertion; ready();
    await expect(loader.loadGoogleLibrary(key,'places')).rejects.toThrow(/逾時/);
    expect(importLibrary).not.toHaveBeenCalled();
  });
  it('blocks use after authentication failure, including after SDK initialization', async () => {
    const pending = loader.loadGoogleLibrary(key,'places'); ready(); await pending;
    browser.gm_authFailure();
    await expect(loader.loadGoogleLibrary(key,'routes')).rejects.toThrow(/授權失敗/);
    expect(importLibrary).toHaveBeenCalledTimes(1);
  });
  it('rejects authentication failure during bootstrap', async () => {
    const pending = loader.loadGoogleLibrary(key,'places');
    const assertion = expect(pending).rejects.toThrow(/授權失敗/);
    browser.gm_authFailure(); await assertion; ready();
    expect(importLibrary).not.toHaveBeenCalled();
  });
  it('allows an explicit library retry after failure with sanitized feedback', async () => {
    importLibrary.mockRejectedValueOnce(new Error(`unsafe SDK detail ${key}`));
    const pending = loader.loadGoogleLibrary(key,'places'); ready();
    await expect(pending).rejects.toThrow(/API 已啟用/);
    await expect(loader.loadGoogleLibrary(key,'places')).resolves.toEqual({name:'places'});
    expect(scripts).toHaveLength(1);
  });
  it('bounds library loading and does not accept its late result as a successful retry', async () => {
    let finish;
    importLibrary.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = loader.loadGoogleLibrary(key,'routes'); ready();
    const assertion = expect(pending).rejects.toThrow(/逾時/);
    await vi.advanceTimersByTimeAsync(20000); await assertion;
    finish({name:'late'});
    await expect(loader.loadGoogleLibrary(key,'routes')).resolves.toEqual({name:'routes'});
  });
});
