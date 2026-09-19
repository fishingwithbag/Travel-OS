import { ValidationError } from '../domain/trip.js';

const ALLOWED_FIELDS = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];
const REQUIRED_FIELDS = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'appId'];
const FORBIDDEN_MARKERS = ['private_key', 'private_key_id', 'client_email', 'service_account', 'BEGIN PRIVATE KEY'];

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

export function parseFirebaseConfig(raw) {
  const text = String(raw || '').trim();
  if (!text) throw new ValidationError('請貼上 Firebase Web config。');
  if (text.length > 10_000) throw new ValidationError('Firebase config 內容過長。');
  if (FORBIDDEN_MARKERS.some((marker) => text.toLowerCase().includes(marker.toLowerCase()))) throw new ValidationError('偵測到管理憑證或私鑰；本網站不接受這類敏感資料。');
  let parsed;
  try { parsed = JSON.parse(text.startsWith('{') ? normalizeObjectSyntax(text) : normalizeObjectSyntax(text)); }
  catch { throw new ValidationError('設定格式無法解析，請複製 Firebase Console 的 Web app config。'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new ValidationError('Firebase config 必須是物件。');
  const config = {};
  for (const field of ALLOWED_FIELDS) if (typeof parsed[field] === 'string' && parsed[field].trim()) config[field] = parsed[field].trim();
  const missing = REQUIRED_FIELDS.filter((field) => !config[field]);
  if (missing.length) throw new ValidationError(`Firebase config 缺少：${missing.join('、')}。`);
  if (!/^https:\/\/[a-z0-9.-]+\.(firebaseio\.com|firebasedatabase\.app)$/i.test(config.databaseURL)) throw new ValidationError('databaseURL 必須是 Firebase Realtime Database 的 HTTPS 網址。');
  if (!/^[a-z0-9-]+$/i.test(config.projectId)) throw new ValidationError('projectId 格式不正確。');
  return Object.freeze(config);
}

export function publicConnectionExport(config, includeGoogleKey = false) {
  const value = { schemaVersion:1, firebase:{ ...config.firebase } };
  if (includeGoogleKey && config.googleMapsKey) value.googleMapsKey = config.googleMapsKey;
  return value;
}
