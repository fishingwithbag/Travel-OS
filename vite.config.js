import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export default defineConfig({
  base:'./', build:{ sourcemap:false },
  plugins:[{
    name:'version-offline-shell',
    apply:'build',
    writeBundle(options, bundle) {
      const hash=createHash('sha256');
      for(const name of Object.keys(bundle).sort()) {
        const entry=bundle[name];
        hash.update(name).update(entry.type==='chunk' ? entry.code : entry.source);
      }
      const worker=readFileSync(new URL('./public/sw.js',import.meta.url),'utf8');
      hash.update(worker);
      const shell=['./',...Object.keys(bundle).filter(name=>/\.(js|css)$/.test(name)).sort().map(name=>`./${name}`)];
      writeFileSync(resolve(options.dir,'sw.js'),worker
        .replace('BUILD_VERSION',hash.digest('hex').slice(0,16))
        .replace("const SHELL = ['./'];",`const SHELL = ${JSON.stringify(shell)};`));
    },
  }],
});
