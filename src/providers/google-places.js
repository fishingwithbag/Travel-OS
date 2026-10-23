import {loadGoogleLibrary} from './google-loader.js';
import {ValidationError} from '../domain/trip.js';

export function placeIdMapUrl(id) {
  if(typeof id!=='string' || !/^[A-Za-z0-9_-]{1,256}$/.test(id)) throw new ValidationError('Google 未提供可保存的地點識別碼，請改用手動地圖連結。');
  return `https://www.google.com/maps/search/?${new URLSearchParams({api:'1',query:'地點',query_place_id:id})}`;
}

// Only this ephemeral preview receives Google content. Persist only mapsUrl (Place ID).
export async function mountPlaceSearch(container,key,{onLoading,onSelect,onError,signal}) {
  const {PlaceAutocompleteElement}=await loadGoogleLibrary(key,'places');
  if(signal?.aborted) return ()=>{};
  const widget=new PlaceAutocompleteElement();
  widget.placeholder='搜尋景點、餐廳或地址';
  widget.setAttribute('aria-label','Google 地點搜尋');
  let version=0,disposed=false;
  const select=async event=>{
    const request=++version; onLoading();
    let timer;
    try {
      const place=event.placePrediction.toPlace();
      await Promise.race([
        place.fetchFields({fields:['displayName','formattedAddress','location','attributions']}),
        new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),20000);}),
      ]);
      if(disposed || request!==version) return;
      const lat=place.location?.lat(),lng=place.location?.lng();
      onSelect({mapsUrl:placeIdMapUrl(place.id),name:place.displayName || '',address:place.formattedAddress || '',
        coordinates:Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180 ? `${lat}, ${lng}` : '',
        attributions:place.attributions || []});
    } catch {
      if(!disposed && request===version) onError(new ValidationError('無法取得地點資料。請檢查 Places API (New)、Key 網站／API 限制、網路及額度，再重新選取；手動資料仍保留。'));
    } finally {clearTimeout(timer);}
  };
  const failed=()=>{version++;onError(new ValidationError('Google 搜尋無法完成。請檢查 Places API (New)、Key 限制、網路及額度；可繼續手動填寫。'));};
  widget.addEventListener('gmp-select',select);
  widget.addEventListener('gmp-error',failed);
  // Enter in Google's search must not submit the enclosing trip/place form.
  const keydown=event=>{if(event.key==='Enter') event.preventDefault();};
  widget.addEventListener('keydown',keydown);
  container.replaceChildren(widget);
  const dispose=()=>{disposed=true;version++;widget.removeEventListener('gmp-select',select);widget.removeEventListener('gmp-error',failed);widget.removeEventListener('keydown',keydown);widget.remove();signal?.removeEventListener('abort',dispose);};
  signal?.addEventListener('abort',dispose,{once:true});
  return dispose;
}
