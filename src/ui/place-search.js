import {mountPlaceSearch} from '../providers/google-places.js';
import {ValidationError} from '../domain/trip.js';

export function setupPlaceSearch({sharedPublicDemo,canEdit}) {
  const dialog=document.querySelector('#place-dialog'),panel=document.querySelector('#google-place-search');
  const key=panel.querySelector('input'),load=panel.querySelector('[data-google-load]'),clear=panel.querySelector('[data-google-clear]');
  const host=panel.querySelector('[data-google-widget]'),status=panel.querySelector('[role="status"]'),preview=panel.querySelector('[data-google-preview]');
  const apply=panel.querySelector('[data-google-apply]');
  let cleanup,controller,version=0,selection=null;
  const reset=()=>{version++;controller?.abort();cleanup?.();cleanup=null;selection=null;host.replaceChildren();preview.replaceChildren();apply.hidden=true;status.textContent='';load.disabled=false;};
  const showError=error=>{selection=null;apply.hidden=true;preview.replaceChildren();status.textContent=error instanceof ValidationError ? error.message : '搜尋暫時無法使用，請繼續手動填寫。';};
  load.addEventListener('click',async()=>{
    if(sharedPublicDemo || !canEdit()) return;
    reset();controller=new AbortController();const request=version;load.disabled=true;status.textContent='正在載入 Google 搜尋…';
    try {
      const dispose=await mountPlaceSearch(host,key.value,{
        signal:controller.signal,
        onLoading:()=>{selection=null;apply.hidden=true;preview.replaceChildren();status.textContent='正在取得地點資料…';},
        onError:showError,
        onSelect:value=>{
          selection=value;preview.replaceChildren();
          for(const text of [value.name,value.address,value.coordinates].filter(Boolean)) {const p=document.createElement('p');p.textContent=text;preview.append(p);}
          const brand=document.createElement('span');brand.textContent='Google Maps';brand.className='google-attribution';brand.translate=false;preview.append(brand);
          for(const attribution of value.attributions) {
            const span=document.createElement('span');span.textContent=attribution.provider || '';
            try {const url=new URL(attribution.providerURI);if(url.protocol==='https:'){const link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent=span.textContent;preview.append(link);continue;}} catch { /* Display attribution text even without a safe URL. */ }
            preview.append(span);
          }
          apply.hidden=false;status.textContent='確認地點後，按「使用此地點連結」。';
        },
      });
      if(request!==version || !dialog.open) {dispose();return;}
      cleanup=dispose;status.textContent='請輸入地點並從 Google 建議中選取。';
    } catch(error) {if(request===version) showError(error);}
    finally {if(request===version) load.disabled=false;}
  });
  apply.addEventListener('click',()=>{
    if(!selection || !canEdit()) return;
    dialog.querySelector('[name="mapsUrl"]').value=selection.mapsUrl;
    status.textContent='已帶入地點連結。請填寫自己的景點名稱與備註，再按「儲存景點」。';
  });
  clear.addEventListener('click',()=>{reset();key.value='';status.textContent='搜尋已關閉，Key 輸入已清除。若要更換 Key，請保存草稿後重新載入頁面。';});
  dialog.addEventListener('close',()=>{reset();key.value='';panel.open=false;});
  key.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();load.click();}});
  if(sharedPublicDemo) {panel.querySelector('fieldset').disabled=true;load.hidden=true;clear.hidden=true;status.textContent='公開體驗站不接受 Key；請在自己的網站使用搜尋。';}
}
