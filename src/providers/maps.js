import { ValidationError } from '../domain/trip.js';

export function mapSearchUrl(query) {
  const value = String(query || '').trim();
  if (!value) throw new ValidationError('需要地點名稱或地址。');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
}

export function validateMapsBrowserKey(value) {
  const key = String(value || '').trim();
  if (!key) return '';
  if (!/^AIza[0-9A-Za-z_-]{20,}$/.test(key)) throw new ValidationError('Google Maps browser key 格式不正確。');
  return key;
}

export async function verifyMapsBrowserKey(value, timeoutMs = 12_000) {
  const key = validateMapsBrowserKey(value);
  if (!key) return { enabled:false, message:'未設定；外部導航仍可使用。' };
  if (globalThis.google?.maps?.importLibrary) return { enabled:true, message:'Maps JavaScript API 已載入。' };
  await new Promise((resolve, reject) => {
    const callback = `travelOsMapsReady_${crypto.randomUUID().replaceAll('-', '')}`;
    const script = document.createElement('script');
    const timer = setTimeout(() => finish(new ValidationError('Google Maps API 驗證逾時，請檢查網路與 key 限制。')), timeoutMs);
    const finish = (error) => { clearTimeout(timer); delete globalThis[callback]; script.onerror = null; error ? reject(error) : resolve(); };
    globalThis[callback] = () => finish();
    script.onerror = () => finish(new ValidationError('Google Maps API 無法載入；請確認 API 已啟用、網域限制與額度。'));
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&loading=async&callback=${callback}`;
    script.async = true;
    script.referrerPolicy = 'no-referrer-when-downgrade';
    document.head.append(script);
  });
  return { enabled:true, message:'Maps JavaScript API 與 Places 功能已載入。' };
}
