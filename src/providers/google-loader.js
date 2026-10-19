import { ValidationError } from '../domain/trip.js';
import { isSharedPublicDemo } from '../config/deployment.js';

const TIMEOUT_MS = 20000;
let loadedKey = '', bootstrap, failure;
const libraries = new Map();

export function parseGoogleBrowserKey(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{20,200}$/.test(value.trim())) {
    throw new ValidationError('請只貼上 Google Maps 瀏覽器 API Key，不接受網址、JSON 或私鑰。');
  }
  return value.trim();
}

export function checkGoogleKeySwitch(value) {
  const key=parseGoogleBrowserKey(value);
  if(loadedKey && loadedKey!==key) throw error('請先保存草稿並重新載入頁面，再設定另一組 Google Key。');
  return key;
}

function error(message) { return new ValidationError(message); }

// One SDK/key per document: removing a script cannot unload its global SDK.
// The settings UI must preserve drafts and reload before changing Google projects.
function loadSdk(key) {
  if (loadedKey && loadedKey !== key) throw error('此分頁已載入另一組 Google 設定。請先保存草稿，再重新載入頁面以切換 Key。');
  if (failure) throw failure;
  if (bootstrap) return bootstrap;
  if (window.google?.maps || document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
    throw error('此頁已有來源未確認的 Google Maps SDK。請重新載入乾淨的頁面，避免使用另一組 Key。');
  }
  loadedKey = key;
  bootstrap = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    let settled = false;
    const fail = message => {
      failure = error(message);
      clearTimeout(timer);
      script.remove();
      if (!settled) { settled = true; reject(failure); }
    };
    const timer = setTimeout(() => fail('Google Maps 載入逾時。請檢查網路或內容封鎖設定，保存草稿後重新載入再試。'), TIMEOUT_MS);
    window.__travelOsMapsReady = () => {
      if (settled) return;
      if (typeof window.google?.maps?.importLibrary !== 'function') {
        fail('Google Maps SDK 未完整載入。請保存草稿後重新載入再試。'); return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(window.google.maps);
    };
    window.gm_authFailure = () => fail('Google Maps 授權失敗。請檢查 Key、網站網址限制、API 啟用與 Google Maps 計費設定；修正後保存草稿並重新載入。');
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({key,loading:'async',callback:'__travelOsMapsReady',v:'weekly',language:'zh-TW'})}`;
    script.nonce = document.querySelector('script[nonce]')?.nonce || '';
    script.onerror = () => fail('無法下載 Google Maps。請檢查網路或內容封鎖設定，保存草稿後重新載入再試。');
    document.head.append(script);
  });
  return bootstrap;
}

export async function loadGoogleLibrary(rawKey, library) {
  if (isSharedPublicDemo(window.location.hostname, window.location.pathname)) throw error('公開體驗站不接受 Google Key；請在自己控制的 Travel OS 網站設定。');
  const key = parseGoogleBrowserKey(rawKey);
  if (!['places','routes'].includes(library)) throw error('不支援的 Google 功能。');
  const maps = await loadSdk(key);
  if (failure) throw failure;
  if (!libraries.has(library)) {
    const pending = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(error('Google 功能載入逾時。請檢查網路後再試；手動安排仍可使用。')), TIMEOUT_MS);
      Promise.resolve().then(() => maps.importLibrary(library)).then(resolve, () => reject(error('Google 功能無法載入。請確認對應 API 已啟用、Key 的 API 限制及可用額度，再試一次。'))).finally(() => clearTimeout(timer));
    });
    libraries.set(library, pending);
    pending.catch(() => { if (libraries.get(library) === pending) libraries.delete(library); });
  }
  const result = await libraries.get(library);
  if (failure) throw failure;
  return result;
}
