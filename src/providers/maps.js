import { ValidationError } from '../domain/trip.js';

let loaderPromise;
let loadedKey = '';

export function mapSearchUrl(query) {
  const value = String(query || '').trim();
  if (!value) throw new ValidationError('需要地點名稱或地址。');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
}

export function itemMapUrl(item) {
  return item.mapsUrl || mapSearchUrl(item.location || item.title);
}

export function parkingMapUrl(spot) {
  if (!spot?.name) return '';
  return spot.mapsUrl || mapSearchUrl(spot.name);
}

export function validateMapsBrowserKey(value) {
  const key = String(value || '').trim();
  if (!/^AIza[0-9A-Za-z_-]{20,}$/.test(key)) throw new ValidationError('Google Maps Browser Key 格式不正確。');
  return key;
}

export function recommendedWebsiteRestriction(origin = globalThis.location?.origin) {
  const value = String(origin || '').trim();
  if (!/^https?:\/\/[^/]+$/i.test(value)) return '';
  return `${value}/*`;
}

export async function verifyMapsBrowserKey(value, timeoutMs = 12_000) {
  const key = validateMapsBrowserKey(value);
  if (globalThis.google?.maps?.importLibrary) {
    if (loadedKey && loadedKey !== key) throw new ValidationError('這個頁面已用另一把 Google Maps Browser Key 載入；請重新整理頁面後再驗證新 Key。');
    if (!loadedKey) throw new ValidationError('Google Maps 已由其他程式載入，無法確認目前輸入的 Browser Key；請重新整理後重試。');
    await globalThis.google.maps.importLibrary('places');
    return { enabled:true, message:'Maps JavaScript API 與 Places 已驗證。' };
  }
  if (!globalThis.document?.head) throw new ValidationError('目前環境無法載入 Google Maps JavaScript API。');
  if (!loaderPromise) {
    loaderPromise = new Promise((resolve, reject) => {
      const callback = `travelOsMapsReady_${crypto.randomUUID().replaceAll('-', '')}`;
      const script = document.createElement('script');
      const timer = setTimeout(() => finish(new ValidationError('Google Maps API 驗證逾時，請檢查 API、網站限制、帳務與網路。')), timeoutMs);
      const finish = (error) => {
        clearTimeout(timer);
        delete globalThis[callback];
        script.onerror = null;
        script.remove?.();
        if (error) {
          loaderPromise = undefined;
          reject(error);
        } else {
          loadedKey = key;
          resolve();
        }
      };
      globalThis[callback] = () => finish();
      script.onerror = () => finish(new ValidationError('Google Maps API 無法載入；請確認 Browser Key、Website restrictions、API restrictions 與 Billing。'));
      const params = new URLSearchParams({
        key,
        loading:'async',
        v:'weekly',
        auth_referrer_policy:'origin',
        callback,
      });
      script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
      script.async = true;
      script.referrerPolicy = 'strict-origin-when-cross-origin';
      document.head.append(script);
    });
  }
  await loaderPromise;
  if (!globalThis.google?.maps?.importLibrary) throw new ValidationError('Maps JavaScript API 已載入，但 importLibrary 不可用。');
  try { await globalThis.google.maps.importLibrary('places'); }
  catch { throw new ValidationError('Places 無法載入；請確認 Places API 與 Places API (New) 已啟用並加入 API restrictions。'); }
  return { enabled:true, message:'Maps JavaScript API 與 Places 已驗證。' };
}
