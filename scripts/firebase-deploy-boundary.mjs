import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TARGET_FILE = '.firebase-deploy-target.local.json';
const BLOCK_FILE = '.firebase-private-projects.local.json';

export function assertDeployBoundary({ targetProject, approvedProject, blockedProjects = [] }) {
  const target = String(targetProject || '').trim();
  const approved = String(approvedProject || '').trim();
  if (!target) throw new Error('Firebase deploy target is missing.');
  if (blockedProjects.includes(target)) throw new Error(`Firebase project ${target} is blocked by the local private-project denylist.`);
  if (!approved) throw new Error(`No local Firebase deploy target is approved. Run: npm run firebase:rules:configure -- --project ${target}`);
  if (target !== approved) throw new Error(`Firebase deploy target mismatch: CLI=${target}, approved=${approved}. Deployment refused.`);
  return target;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function readApprovedProject(rootDir) {
  const filePath = path.join(rootDir, TARGET_FILE);
  if (!fs.existsSync(filePath)) return '';
  return String(readJson(filePath).projectId || '').trim();
}

function readBlockedProjects(rootDir) {
  const filePath = path.join(rootDir, BLOCK_FILE);
  if (!fs.existsSync(filePath)) return [];
  const value = readJson(filePath);
  return Array.isArray(value.blockedProjects) ? value.blockedProjects.map((entry) => String(entry).trim()).filter(Boolean) : [];
}

function parseProjectArg(args) {
  const index = args.indexOf('--project');
  if (index < 0 || !args[index + 1]) throw new Error('Explicit --project is required.');
  return String(args[index + 1]).trim();
}

function configure(rootDir, args) {
  const projectId = parseProjectArg(args);
  const blockedProjects = readBlockedProjects(rootDir);
  if (blockedProjects.includes(projectId)) throw new Error(`Firebase project ${projectId} is blocked by the local private-project denylist.`);
  fs.writeFileSync(path.join(rootDir, TARGET_FILE), `${JSON.stringify({ projectId }, null, 2)}\n`, 'utf8');
  console.log(`Approved Firebase deploy target: ${projectId}`);
}

function guard(rootDir) {
  assertDeployBoundary({
    targetProject:process.env.GCLOUD_PROJECT,
    approvedProject:readApprovedProject(rootDir),
    blockedProjects:readBlockedProjects(rootDir),
  });
  console.log(`Firebase deploy boundary verified for ${process.env.GCLOUD_PROJECT}.`);
}

function deploy(rootDir) {
  const approvedProject = readApprovedProject(rootDir);
  const projectId = assertDeployBoundary({
    targetProject:approvedProject,
    approvedProject,
    blockedProjects:readBlockedProjects(rootDir),
  });
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(command, ['--yes', 'firebase-tools@15.11.0', 'deploy', '--only', 'database', '--project', projectId], {
    cwd:rootDir,
    stdio:'inherit',
    shell:false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function main() {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const [command, ...args] = process.argv.slice(2);
  if (command === 'configure') return configure(rootDir, args);
  if (command === 'guard') return guard(rootDir);
  if (command === 'deploy') return deploy(rootDir);
  throw new Error('Usage: configure --project <id> | guard | deploy');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try { main(); }
  catch (error) { console.error(`Firebase deployment blocked: ${error.message}`); process.exit(1); }
}
