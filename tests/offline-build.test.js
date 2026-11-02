import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import config from '../vite.config.js';

it('versions the offline shell with built content and precaches relative JS and CSS',()=>{
  const dir=mkdtempSync(join(tmpdir(),'travel-os-offline-'));
  try {
    const plugin=config.plugins.find(entry=>entry.name==='version-offline-shell');
    const bundle={
      'index.html':{type:'asset',source:'shell'},
      'assets/app.js':{type:'chunk',code:'first version'},
      'assets/auth.js':{type:'chunk',code:'lazy auth'},
      'assets/style.css':{type:'asset',source:'styles'},
    };
    plugin.writeBundle({dir},bundle);
    const first=readFileSync(join(dir,'sw.js'),'utf8');
    expect(first).not.toContain('BUILD_VERSION');
    expect(first).toContain('["./","./assets/app.js","./assets/auth.js","./assets/style.css"]');
    plugin.writeBundle({dir},bundle);
    expect(readFileSync(join(dir,'sw.js'),'utf8')).toBe(first);
    bundle['assets/app.js'].code='second version';
    plugin.writeBundle({dir},bundle);
    expect(readFileSync(join(dir,'sw.js'),'utf8')).not.toBe(first);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
