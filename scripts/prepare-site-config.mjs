import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSiteConfig } from '../src/config/site-config.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = resolve(root, 'public/site-config.json');
const input = process.env.TRAVEL_OS_SITE_CONFIG || (existsSync(target) ? readFileSync(target, 'utf8') : '');
if (input) {
  try {
    writeFileSync(target, `${JSON.stringify(parseSiteConfig(input), null, 2)}\n`);
    console.log('Validated operator-provided website connection settings.');
  } catch {
    console.error('Invalid TRAVEL_OS_SITE_CONFIG: export public website settings without credentials.');
    process.exitCode = 1;
  }
}
