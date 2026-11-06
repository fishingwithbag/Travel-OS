import {checkGoogleKeySwitch,parseGoogleBrowserKey} from '../providers/google-loader.js';
import {localStorageKey} from '../storage/browser-scope.js';
let key='';
export const googleSettingsChanged=new EventTarget();
export const googleKey=()=>key;
export function setGoogleKey(value,remember=false) {
  const next=value.trim() ? checkGoogleKeySwitch(value) : '';
  const storageKey=localStorageKey('google-browser-key');
  if(next && remember) localStorage.setItem(storageKey,next);else localStorage.removeItem(storageKey);
  key=next;googleSettingsChanged.dispatchEvent(new Event('change'));
}
export function restoreGoogleKey(sharedDemo=false) {
  const storageKey=localStorageKey('google-browser-key');
  if(sharedDemo){localStorage.removeItem(storageKey);key='';return;}
  const saved=localStorage.getItem(storageKey);
  if(!saved) return;
  try {key=parseGoogleBrowserKey(saved);}catch{localStorage.removeItem(storageKey);key='';}
}
