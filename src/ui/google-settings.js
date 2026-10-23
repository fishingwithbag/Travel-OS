import {googleKey,setGoogleKey,restoreGoogleKey} from '../config/google-settings.js';
import {loadGoogleLibrary} from '../providers/google-loader.js';
import {localStorageKey} from '../storage/browser-scope.js';
import {ValidationError} from '../domain/trip.js';

export function setupGoogleSettings({sharedPublicDemo,openDialog}) {
  const dialog=document.querySelector('#google-settings-dialog'),form=dialog.querySelector('form'),status=form.querySelector('[role="status"]');
  let generation=0;
  try{restoreGoogleKey(sharedPublicDemo);}catch{status.textContent='瀏覽器設定儲存空間無法使用，請檢查隱私設定。';}
  document.addEventListener('click',event=>{
    if(!event.target.closest('[data-google-settings]')) return;
    form.elements.key.value=googleKey();
    try{form.elements.remember.checked=Boolean(localStorage.getItem(localStorageKey('google-browser-key')));}catch{form.elements.remember.checked=false;}
    status.textContent=sharedPublicDemo ? '公開體驗站不接受 Key，請先建立自己的網站。' : '設定只在你明確套用後生效；搜尋與估算各自檢查。';
    openDialog('google-settings-dialog');
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();if(sharedPublicDemo) return;
    try{setGoogleKey(form.elements.key.value,form.elements.remember.checked);generation++;status.textContent=googleKey() ? '設定已套用。請在景點搜尋及路程估算各做一次實際操作，才能確認服務可用。' : '已停用 Google API 並移除記住的 Key。外部導航仍可使用。';}
    catch(error){status.textContent=error instanceof ValidationError ? error.message : '設定無法保存，請檢查瀏覽器儲存空間。';}
  });
  form.querySelector('[data-google-forget]').addEventListener('click',()=>{form.elements.key.value='';form.elements.remember.checked=false;form.requestSubmit();});
  for(const button of form.querySelectorAll('[data-google-check]')) button.addEventListener('click',async()=>{
    if(sharedPublicDemo) return;
    const request=++generation;button.disabled=true;
    status.textContent='正在檢查已套用設定的 SDK 載入…';
    try{await loadGoogleLibrary(googleKey(),button.dataset.googleCheck);if(request===generation) status.textContent='SDK 已載入；這不代表 API 請求或額度驗證成功，請繼續實際搜尋／估算。';}
    catch(error){if(request===generation) status.textContent=error instanceof ValidationError ? error.message : '無法載入，請檢查設定與網路。';}
    finally{button.disabled=sharedPublicDemo;}
  });
  dialog.addEventListener('close',()=>{generation++;form.elements.key.value='';});
  form.querySelector('fieldset').disabled=sharedPublicDemo;
}
