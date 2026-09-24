import { ValidationError } from '../domain/trip.js';
import { validateMapsBrowserKey } from '../providers/maps.js';

const ALLOWED_FIELDS = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];
const REQUIRED_FIELDS = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'appId'];
const FORBIDDEN_MARKERS = ['private_key', 'private_key_id', 'client_email', 'service_account', 'BEGIN PRIVATE KEY'];

function normalizeRealtimeDatabaseUrl(value) {
  let url;
  try { url = new URL(String(value || '').trim()); }
  catch { throw new ValidationError('databaseURL 必須是 Firebase Realtime Database 的 HTTPS 網址。'); }
  const host = url.hostname.toLowerCase();
  const isFirebaseHost = /(^|\.)(firebaseio\.com|firebasedatabase\.app)$/.test(host);
  const hasOnlyRootPath = !url.search && !url.hash && (!url.pathname || url.pathname === '/');
  if (url.protocol !== 'https:' || !isFirebaseHost || !hasOnlyRootPath || url.username || url.password || url.port) {
    throw new ValidationError('databaseURL 必須是 Firebase Realtime Database 的 HTTPS 網址。');
  }
  return `${url.protocol}//${url.hostname}`;
}

function normalizeObjectSyntax(text) {
  const objectStart = text.indexOf('{');
  const objectEnd = text.lastIndexOf('}');
  if (objectStart < 0 || objectEnd <= objectStart) throw new ValidationError('找不到 Firebase config 物件。');
  return text.slice(objectStart, objectEnd + 1)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1')
    .replace(/([{,]\s*)([A-Za-z][A-Za-z0-9]*)(\s*:)/g, '$1"$2"$3')
    .replace(/'/g, '"')
    .replace(/,\s*([}\]])/g, '$1');
}

export function parseFirebaseConfig(raw, databaseURLOverride = '') {
  const text = String(raw || '').trim();
  if (!text) throw new ValidationError('請貼上 Firebase Web config。');
  if (text.length > 10_000) throw new ValidationError('Firebase config 內容過長。');
  if (FORBIDDEN_MARKERS.some((marker) => text.toLowerCase().includes(marker.toLowerCase()))) throw new ValidationError('偵測到管理憑證或私鑰；本網站不接受這類敏感資料。');
  let parsed;
  try { parsed = JSON.parse(normalizeObjectSyntax(text)); }
  catch { throw new ValidationError('設定格式無法解析，請複製 Firebase Console 的 Web app config。'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new ValidationError('Firebase config 必須是物件。');
  const config = {};
  for (const field of ALLOWED_FIELDS) if (typeof parsed[field] === 'string' && parsed[field].trim()) config[field] = parsed[field].trim();
  const explicitDatabaseURL = String(databaseURLOverride || '').trim();
  if (explicitDatabaseURL) {
    const normalizedExplicit = normalizeRealtimeDatabaseUrl(explicitDatabaseURL);
    if (config.databaseURL && normalizeRealtimeDatabaseUrl(config.databaseURL) !== normalizedExplicit) {
      throw new ValidationError('firebaseConfig 內的 databaseURL 與你另外貼上的 Realtime Database URL 不一致，請確認兩者屬於同一個 Firebase 專案。');
    }
    config.databaseURL = normalizedExplicit;
  }
  const missing = REQUIRED_FIELDS.filter((field) => !config[field]);
  if (missing.includes('databaseURL')) throw new ValidationError('請貼上 Realtime Database URL。請到 Firebase 控制台 → Realtime Database →「資料」頁籤，複製頁面上方顯示的 HTTPS 資料庫網址。');
  if (missing.length) throw new ValidationError(`Firebase config 缺少：${missing.join('、')}。`);
  config.databaseURL = normalizeRealtimeDatabaseUrl(config.databaseURL);
  if (!/^[a-z0-9-]+$/i.test(config.projectId)) throw new ValidationError('projectId 格式不正確。');
  return Object.freeze(config);
}

export function parseFirebaseConfigInput(input) {
  if (String(input.firebaseConfig || '').trim()) return parseFirebaseConfig(input.firebaseConfig, input.firebase_databaseURL);
  const config = Object.fromEntries(ALLOWED_FIELDS.map((field) => [field, String(input[`firebase_${field}`] || '').trim()]).filter(([, value]) => value));
  return parseFirebaseConfig(JSON.stringify(config));
}

export function parseRememberedConnection(raw) {
  let stored;
  try { stored = JSON.parse(String(raw || '')); }
  catch { throw new ValidationError('已記住的 Firebase 連線設定無法解析。'); }
  if (!stored || typeof stored !== 'object' || Array.isArray(stored) || !stored.firebase) throw new ValidationError('已記住的 Firebase 連線設定不完整。');
  const googleMapsKey = stored.googleMapsKey ? validateMapsBrowserKey(stored.googleMapsKey) : '';
  return Object.freeze({ firebase:parseFirebaseConfig(JSON.stringify(stored.firebase)), googleMapsKey });
}
