import { parseFirebaseConfig } from './firebase-config.js';
import { parseGoogleBrowserKey } from '../providers/google-loader.js';
import { ValidationError } from '../domain/trip.js';

export function parseSiteConfig(input) {
  const text = typeof input === 'string' ? input : JSON.stringify(input);
  if (!text || text.length > 20_000 || /"(?:password|private_key|client_email|refreshToken|accessToken|idToken|serviceAccount|secret)"\s*:/i.test(text)) {
    throw new ValidationError('網站連線設定只接受公開 Web config，不接受密碼、登入 token 或管理憑證。');
  }
  let value;
  try { value = JSON.parse(text); }
  catch { throw new ValidationError('網站連線設定不是有效的 JSON。'); }
  if (!value || Array.isArray(value) || value.schemaVersion !== 1 || !value.firebase || Object.keys(value).some(key => !['schemaVersion','firebase','googleMapsKey'].includes(key))) {
    throw new ValidationError('網站連線設定格式不正確，請由網站建立者重新匯出。');
  }
  return Object.freeze({schemaVersion:1, firebase:parseFirebaseConfig(JSON.stringify(value.firebase)),
    ...(value.googleMapsKey ? {googleMapsKey:parseGoogleBrowserKey(value.googleMapsKey)} : {})});
}

export async function loadSiteConfig(baseUrl, fetcher = fetch) {
  let response;
  try { response = await fetcher(new URL('./site-config.json', baseUrl), {cache:'no-store', credentials:'omit', redirect:'error', signal:AbortSignal.timeout(8000)}); }
  catch { throw new ValidationError('網站登入設定暫時無法載入，請檢查網路或聯絡網站建立者；仍可使用本機模式。'); }
  if (response.status === 404) return null;
  // Vite preview returns the app shell for an absent optional configuration file.
  if (response.ok && response.headers.get('content-type')?.includes('text/html')) return null;
  if (!response.ok) throw new ValidationError('網站登入設定無法讀取，請聯絡網站建立者。');
  return parseSiteConfig(await response.text());
}
