import { readFile, writeFile } from 'node:fs/promises';
import { databaseRules } from './database-rules.mjs';

const target = new URL('../firebase/database.rules.json', import.meta.url);
const generated = `${JSON.stringify(databaseRules)}\n`;

if (process.argv.includes('--check')) {
  const current = await readFile(target, 'utf8');
  if (current !== generated) {
    console.error('firebase/database.rules.json is stale. Run npm run firebase:rules:build.');
    process.exitCode = 1;
  }
} else {
  await writeFile(target, generated);
  console.log('Generated firebase/database.rules.json.');
}
