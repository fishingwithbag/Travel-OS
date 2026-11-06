import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

function worker(fetchResponse, open) {
  const handlers = {};
  const caches = { open, match: vi.fn() };
  vm.runInNewContext(source, {
    self: { registration:{scope:'https://example.test/Travel-OS/'}, addEventListener: (name, handler) => { handlers[name] = handler; } },
    location: { origin: 'https://example.test' }, URL,
    fetch: vi.fn().mockResolvedValue(fetchResponse), caches,
  });
  const pending = [];
  let response;
  handlers.fetch({
    request: { method: 'GET', url: 'https://example.test/Travel-OS/assets/app.js', destination: 'script' },
    waitUntil: (promise) => pending.push(promise),
    respondWith: (promise) => { response = promise; },
  });
  return { response, pending, caches };
}

describe('offline asset caching', () => {
  it('cleans only old caches belonging to the same deployment scope', async () => {
    let activate;
    const own='travel-os-shell:https://example.test/Travel-OS/:';
    const remove=vi.fn();
    vm.runInNewContext(source,{
      self:{registration:{scope:'https://example.test/Travel-OS/'},clients:{claim:vi.fn()},addEventListener:(name,fn)=>{if(name==='activate')activate=fn;}},
      caches:{keys:async()=>[`${own}old`,`${own}BUILD_VERSION`,'travel-os-shell:https://example.test/Other/:old','unrelated'],delete:remove},
    });
    let completion;
    activate({waitUntil:promise=>{completion=promise;}});
    await completion;
    expect(remove.mock.calls).toEqual([[`${own}old`]]);
  });
  it('clones the network body before delayed cache access and keeps the write alive', async () => {
    let resolveCache;
    const open = vi.fn(() => new Promise((resolve) => { resolveCache = resolve; }));
    const original = new Response('asset');
    let cachedBody;
    const put = vi.fn(async (_request, copy) => { cachedBody = await copy.text(); });
    const { response, pending } = worker(original, open);
    expect(await (await response).text()).toBe('asset');
    expect(pending).toHaveLength(1);
    resolveCache({ put });
    await Promise.all(pending);
    expect(put).toHaveBeenCalledOnce();
    expect(cachedBody).toBe('asset');
  });

  it('keeps a valid network response usable when cache storage fails', async () => {
    const { response, pending, caches } = worker(new Response('asset'), () => Promise.reject(new Error('quota')));
    expect(await (await response).text()).toBe('asset');
    await expect(Promise.all(pending)).resolves.toBeDefined();
    expect(caches.match).not.toHaveBeenCalled();
  });
});
