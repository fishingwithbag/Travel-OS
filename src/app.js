import './styles.css';
import travelOsDatabaseRules from '../firebase/database.rules.json?raw';
import { addGroup, createBackup, createItem, createPlace, createTrip, editItem, expenseTotals, filterPlaces, placeItemInput, restoredTripCopy, touchTrip, tripDates, validateBackup, ValidationError } from './domain/trip.js';
import { IndexedDbTripStore } from './storage/indexed-db.js';
import { parseFirebaseConfigInput, parseRememberedConnection } from './config/firebase-config.js';
import { isSharedPublicDemo, shouldOpenCloudOnboarding } from './config/deployment.js';
import { FirebaseTripStore } from './storage/firebase-store.js';
import { prepareStoreSwitch,saveToActiveStore } from './storage/store-switch.js';
import { localStorageKey } from './storage/browser-scope.js';
import { itemMapUrl, parkingMapUrl, routeMapUrl, dayRouteSections } from './providers/maps.js';
import { nextStop } from './domain/next-stop.js';
import { formatFlightSchedule } from './domain/flight-schedule.js';
import { durationMinutes, scheduleWarnings } from './domain/schedule.js';
import { setupRentalUi } from './ui/rentals.js';
import { setupStayUi } from './ui/stays.js';
import { setupExpenseUi } from './ui/expenses.js';
import { setupGroupUi } from './ui/groups.js';
import {recoverMissingGroups} from './domain/groups.js';
import {setupPlaceSearch} from './ui/place-search.js';
import {setupGoogleSettings} from './ui/google-settings.js';
import {setupTravelEstimates} from './ui/travel-estimates.js';
import {googleKey} from './config/google-settings.js';

let store = new IndexedDbTripStore();
const state = { trips: [], currentTripId: '', selectedDate: '', mode:'local', connection:null, access:Object.create(null) };
let deferredLiveRender=false;
let memberSaving=false;
let groupRecoverySaving=false;
let migrationPreview=null,migrationSaving=false;
let pendingBackup = null;
let importSaving = false;
let itemEditor = null;
let itemSaving = false;
let placeEditor = null;
let placeSaving = false;
let placeFilterTripId = '';
let setupStep = 0;
let highestSetupStep = 0;
const $ = (selector) => document.querySelector(selector);
const typeLabels = { place: '景點', meal: '餐飲', stay: '住宿', flight: '航班', transport: '交通', other: '其他' };
const sharedPublicDemo = isSharedPublicDemo(location.hostname, location.pathname);
const STORAGE_KEYS = Object.freeze({
  theme:localStorageKey('theme'),
  onboardingMode:localStorageKey('onboarding-mode'),
  connection:localStorageKey('connection'),
});
const icons = Object.freeze({
  maps:'<svg class="gmap-icon" viewBox="0 0 36 36" aria-hidden="true"><circle class="gmap-icon__bg" cx="18" cy="18" r="16"/><path class="gmap-icon__green" d="M18 6.2c-5.05 0-9.15 4.05-9.15 9.05 0 6.8 9.15 14.55 9.15 14.55V19.1l-3.75-3.75L18 6.2z"/><path class="gmap-icon__blue" d="M18 29.8s9.15-7.75 9.15-14.55c0-2.45-.98-4.67-2.57-6.3L18 15.5v14.3z"/><path class="gmap-icon__yellow" d="M8.85 15.25c0 2.8 1.55 5.95 3.38 8.6L18 18.1v-2.6l-5.95-5.95a8.95 8.95 0 0 0-3.2 5.7z"/><path class="gmap-icon__red" d="M24.58 8.95A9.08 9.08 0 0 0 18 6.2a9.02 9.02 0 0 0-5.95 2.25L18 14.4l6.58-5.45z"/><circle class="gmap-icon__center" cx="18" cy="15.35" r="3.15"/></svg>',
  edit:'<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.5-.8 4.3 4.3-.8L19 8.5 15.5 5 4 16.5Z"/><path d="m13.8 6.7 3.5 3.5"/></svg>',
  parking:'<svg class="parking-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M9 17V7h4.2a3.2 3.2 0 0 1 0 6.4H9M9 13.4h4.2"/></svg>',
  heart:'<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.7a5.4 5.4 0 0 0-7.6 0L12 5.9l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 21l8.8-8.7a5.4 5.4 0 0 0 0-7.6Z"/></svg>',
});
const views = new Set(['dashboard','itinerary','places','more']);

function setActiveView(requestedView,{updateUrl=true,focus=false}={}) {
  const view=views.has(requestedView) ? requestedView : 'dashboard';
  document.body.dataset.view=view;
  for(const control of document.querySelectorAll('[data-view-target]')) {
    const active=control.dataset.viewTarget===view;
    control.classList.toggle('active',active);
    if(control.closest('.bottom-nav')) {
      if(active) control.setAttribute('aria-current','page');
      else control.removeAttribute('aria-current');
    }
  }
  if(updateUrl) {
    const url=new URL(location.href);
    if(view==='dashboard') url.searchParams.delete('view');
    else url.searchParams.set('view',view);
    history.replaceState(null,'',`${url.pathname}${url.search}${url.hash}`);
  }
  if(focus) {
    const targets={dashboard:'#trip-title',itinerary:'#day-heading',places:'#places-heading',more:'#tools-heading'};
    const heading=$(targets[view]);
    heading?.setAttribute('tabindex','-1');
    heading?.focus({preventScroll:true});
    $('#main')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  }
}

for(const control of document.querySelectorAll('[data-view-target]')) control.addEventListener('click',()=>{
  const view=control.dataset.viewTarget;
  if(control.id==='favorites-button') {
    const checkbox=$('#place-filters')?.elements?.favorites;
    if(checkbox) checkbox.checked=true;
    if(currentTrip()) renderPlaces();
  }
  setActiveView(view,{focus:true});
});
const rentalUi = setupRentalUi({currentTrip,saveTrip,openItemDialog,escapeHtml,openDialog,setError,showToast,canEdit:canEditTrip});
const stayUi = setupStayUi({currentTrip,saveTrip,openItemDialog,escapeHtml,openDialog,setError,showToast,canEdit:canEditTrip});
const expenseUi = setupExpenseUi({currentTrip,saveTrip,escapeHtml,openDialog,setError,showToast,canEdit:canEditTrip});
const groupUi = setupGroupUi({currentTrip,saveTrip,openDialog,setError,showToast,canEdit:canEditTrip});
setupPlaceSearch({sharedPublicDemo,canEdit:()=>canEditTrip() && !placeSaving});
setupGoogleSettings({sharedPublicDemo,openDialog});
const travelEstimates=setupTravelEstimates({currentTrip,selectedDate:()=>state.selectedDate,escapeHtml});

function formatDay(date) { return new Intl.DateTimeFormat('zh-TW', { month:'numeric', day:'numeric', weekday:'short', timeZone:'UTC' }).format(new Date(`${date}T00:00:00Z`)); }
function currentTrip() { return state.trips.find((trip) => trip.id === state.currentTripId); }
function canEditTrip() {return state.mode==='local' || (!store.needsMigration?.(state.currentTripId) && ['owner','editor'].includes(state.access[state.currentTripId]?.role));}
function upsertTrip(trip) {
  const existing=state.trips.find(entry=>entry.id===trip.id);
  if(existing && existing.revision>trip.revision) return;
  state.trips=existing ? state.trips.map(entry=>entry.id===trip.id ? trip : entry) : [...state.trips,trip];
}
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.hidden = false; clearTimeout(showToast.timer); showToast.timer = setTimeout(() => { toast.hidden = true; }, 3000); }
function setError(form, error) {
  const target = form.querySelector('.form-error');
  if (!error) { target.textContent = ''; return; }
  if (['PERMISSION_DENIED','database/permission-denied'].includes(error.code)) { target.textContent = '資料庫拒絕寫入。請確認此帳號有編輯權限，且已發布目前版本的 Firebase Rules；你輸入的內容仍保留在此視窗。'; return; }
  target.textContent = error instanceof ValidationError ? error.message : '發生未預期的錯誤，請再試一次。';
}
function openDialog(id) {
  const dialog = document.getElementById(id);
  for (const error of dialog.querySelectorAll('.form-error')) error.textContent = '';
  dialog.showModal();
  dialog.querySelector('input,select,textarea,button')?.focus();
}
function formData(form) { return Object.fromEntries(new FormData(form).entries()); }

function warnOpenDraft(message) {
  const form=document.querySelector('#item-dialog[open] form,#place-dialog[open] form,#rental-dialog[open] form,#stay-dialog[open] form,#expense-dialog[open] form,#group-edit-dialog[open] form');
  if(form && !itemSaving && !placeSaving && !rentalUi.isSaving() && !stayUi.isSaving() && !expenseUi.isSaving() && !groupUi.isSaving()) setError(form,new ValidationError(message));
}

function renderLive() {
  // Keep draft fields intact; revision guards reject stale saves until the user reopens the editor.
  if(document.querySelector('dialog[open]')) {deferredLiveRender=true;renderMembers();return;}
  render();
}

function renderMembers() {
  const cloud=state.mode==='cloud',trip=currentTrip(),access=state.access[trip?.id];
  $('#cloud-session').hidden=!cloud;
  $('#cloud-account').textContent=cloud ? `${state.connection.projectId} · ${state.connection.email || ''}` : '';
  $('#cloud-uid').textContent=cloud ? state.connection.uid : '';
  $('#members-panel').hidden=!cloud || !trip;
  const labels={owner:'擁有者',editor:'編輯者',viewer:'檢視者'};
  $('#member-role').textContent=access ? `你的權限：${labels[access.role]}${access.role==='viewer' ? '（唯讀）' : ''}` : '正在確認成員權限…';
  $('#member-list').innerHTML=Object.entries(access?.members || {}).map(([uid,role])=>`<li><span>${escapeHtml(uid)}</span><strong>${escapeHtml(labels[role] || '未知角色')}</strong>${access?.ownerId===state.connection?.uid && uid!==access.ownerId ? `<button class="text-button" type="button" data-edit-member="${escapeHtml(uid)}">修改權限</button><button class="text-button" type="button" data-remove-member="${escapeHtml(uid)}">移除成員</button>` : ''}</li>`).join('');
  const owner=cloud && access?.ownerId===state.connection?.uid;
  for(const control of $('#member-form').elements) control.disabled=memberSaving || !owner;
  for(const control of $('#member-list').querySelectorAll('button')) control.disabled=memberSaving;
}

$('#copy-uid-button').addEventListener('click',async()=>{
  try{await copyText(state.connection?.uid || '');showToast('已複製目前專案帳號的 UID。');}catch(error){showToast(error.message);}
});
$('#member-form').addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget;if(memberSaving) return;setError(form,'');
  const trip=currentTrip();
  try {
    if(state.mode!=='cloud' || state.access[trip?.id]?.ownerId!==state.connection?.uid) throw new ValidationError('只有旅程擁有者可以管理成員。');
    const input=formData(form);memberSaving=true;renderMembers();
    await store.setMember(trip.id,input.uid.trim(),input.role);
    form.reset();showToast('成員權限已儲存。請對方登入相同專案確認旅程。');
  }catch(error){setError(form,error);}finally{memberSaving=false;renderMembers();}
});
$('#member-list').addEventListener('click',async event=>{
  if(memberSaving) return;
  const edit=event.target.closest('[data-edit-member]');
  if(edit){$('#member-form').elements.uid.value=edit.dataset.editMember;$('#member-form').elements.role.value=state.access[state.currentTripId].members[edit.dataset.editMember];$('#member-form').elements.role.focus();return;}
  const button=event.target.closest('[data-remove-member]');if(!button) return;
  if(!button.dataset.confirm){button.dataset.confirm='true';button.textContent='再次點擊確認移除此成員';return;}
  try{memberSaving=true;renderMembers();await store.removeMember(state.currentTripId,button.dataset.removeMember);showToast('成員已移除，其旅程存取權限已撤銷。');}
  catch(error){setError($('#member-form'),error);}finally{memberSaving=false;renderMembers();}
});

function mapLink(item, label = '在 Google Maps 開啟') {
  if (!item.location && !item.mapsUrl && !['place', 'meal', 'stay'].includes(item.type)) return '';
  return `<a class="map-link" href="${escapeHtml(itemMapUrl(item))}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(`${label}：${item.title}`)}">${icons.maps}<span>${escapeHtml(label)}</span></a>`;
}

function parkingHtml(item) {
  const parking = item.parking;
  if (!parking) return '';
  const sets = parking.mode === 'split'
    ? currentTrip().groups.filter(group=>!item.groupId || group.id === item.groupId).map(group=>({name:group.name,set:parking.byGroup?.[group.id]}))
    : [{name:'共用停車',set:parking}];
  return sets.map(({name,set})=> {
    const rows = [['主要停車場',set?.primary],['備用停車場',set?.backup]].filter(([,spot])=>spot?.name);
    return `<div class="item-parking"><span class="parking-title">${icons.parking}<strong>停車</strong></span><div>${rows.map(([label,spot])=>`<a href="${escapeHtml(parkingMapUrl(spot))}" target="_blank" rel="noopener noreferrer" aria-label="在 Google Maps 開啟${escapeHtml(name)}${label}：${escapeHtml(spot.name)}"><small>${label}</small><span>${escapeHtml(spot.name)}</span><span aria-hidden="true">↗</span></a>${spot.walkMinutes == null ? '' : `<p>步行 ${spot.walkMinutes} 分鐘</p>`}${spot.feeMinor == null ? '' : `<p>預估停車費 ${escapeHtml(spot.currency)} ${(spot.feeMinor/100).toFixed(2)}</p>`}${spot.note ? `<p class="parking-notes">${escapeHtml(spot.note)}</p>` : ''}`).join('')}${set?.notes ? `<p class="parking-notes">${escapeHtml(set.notes)}</p>` : ''}${rows.length ? '' : '<p class="parking-unset">停車場未設定</p>'}</div></div>`;
  }).join('');
}

function buildParkingEditor(parking, trip) {
  const field = (prefix,key,label,value,type='text',attrs='') => `<label>${escapeHtml(label)}<input name="${prefix}${key}" type="${type}" value="${escapeHtml(value ?? '')}" ${attrs} /></label>`;
  const setFields = (prefix,name,set={}) => `<fieldset class="parking-set"><legend>${escapeHtml(name)}</legend>${['primary','backup'].map((kind,index)=> {
    const spot=set[kind] || {}; const label=`${name} ${index ? '備用' : '主要'}停車場`; const p=prefix+kind;
    return `<details ${index ? '' : 'open'}><summary>${index ? '備用停車場' : '主要停車場'}</summary>${field(p,'Name',label+'名稱',spot.name,'text','maxlength="120"')}${field(p,'Maps',label+' Google Maps 連結',spot.mapsUrl,'url','maxlength="600"')}
      <div class="field-pair">${field(p,'Walk',label+'步行分鐘',spot.walkMinutes,'number','min="0" max="1440" step="1"')}${field(p,'Fee',label+'預估費用',spot.feeMinor == null ? '' : spot.feeMinor/100,'number','min="0" max="1000000000" step="0.01"')}</div>
      ${field(p,'Currency',label+'幣別',spot.currency || trip.currency,'text','maxlength="3"')}${field(p,'Note',label+'備註',spot.note,'text','maxlength="300"')}</details>`;
  }).join('')}${field(prefix,'Notes',name+'停車備註',set.notes,'text','maxlength="300"')}</fieldset>`;
  const form=$('#item-form');
  form.elements.parkingMode.value=parking?.mode || 'shared';
  form.elements.parkingMode.querySelector('[value="split"]').disabled=!trip.groups.length;
  $('#parking-editor').innerHTML=`<div data-parking-mode="shared">${setFields('ps','共用',parking || {})}</div><div data-parking-mode="split">${trip.groups.map((group,index)=>setFields('pg'+index,group.name,parking?.byGroup?.[group.id])).join('')}</div>`;
  updateParkingMode();
}

function updateParkingMode() {
  for (const section of $('#parking-editor').querySelectorAll('[data-parking-mode]')) {
    section.hidden=section.dataset.parkingMode !== $('#item-form').elements.parkingMode.value;
    for (const control of section.querySelectorAll('input')) control.disabled=section.hidden || itemSaving;
  }
}

function readParkingEditor(trip) {
  const form=$('#item-form'); const value=name=>form.elements.namedItem(name)?.value || '';
  const readSet=prefix=>({
    ...Object.fromEntries(['primary','backup'].map(kind=>{const p=prefix+kind;return [kind,{name:value(p+'Name'),mapsUrl:value(p+'Maps'),walkMinutes:value(p+'Walk'),feeMinor:value(p+'Fee') === '' ? '' : Math.round(Number(value(p+'Fee'))*100),currency:value(p+'Currency'),note:value(p+'Note')}];})),
    notes:value(prefix+'Notes'),
  });
  const byGroup=Object.fromEntries(trip.groups.map((group,index)=>[group.id,readSet('pg'+index)]).filter(([,set])=>set.notes || [set.primary,set.backup].some(spot=>spot.name || spot.mapsUrl || spot.walkMinutes !== '' || spot.feeMinor !== '' || spot.note)));
  return {...readSet('ps'),mode:value('parkingMode'),byGroup};
}

function itemNotesHtml(item) {
  return item.notes ? `<p class="item-notes"><strong>備註</strong><span>${escapeHtml(item.notes)}</span></p>` : '';
}

function flightScheduleHtml(item) {
  const schedule = formatFlightSchedule(item);
  return schedule ? `<p class="item-notes"><strong>起降</strong><span>${escapeHtml(schedule)}</span></p>` : '';
}

function itemTimingHtml(item) {
  const duration = durationMinutes(item);
  const mode = {driving:'開車',walking:'步行',transit:'大眾交通',other:'其他'}[item.transitMode];
  return `${duration == null ? '' : `<p class="timeline-meta">至 ${escapeHtml(item.endDate !== item.date ? item.endDate + ' ' : '')}${escapeHtml(item.endTime)} · ${duration} 分鐘（旅程當地時間）</p>`}${mode ? `<p class="timeline-meta">前往下一站：${mode}${item.transitMinutes == null ? ' · 時間未設定' : ` · ${item.transitMinutes} 分鐘（手動）`}</p>` : ''}`;
}

function openItemDialog(item = null, seed = {}) {
  const trip = currentTrip();
  if (!trip) return;
  if(!canEditTrip()){showToast('目前旅程為唯讀，請向擁有者申請編輯權限。');return;}
  const form = $('#item-form');
  form.reset();
  itemEditor = { tripId:trip.id, id:item?.id || '', revision:trip.revision };
  const values = item ? { ...item, ...item.flight, amount:item.amountMinor == null ? '' : item.amountMinor / 100,
    parkingPrimaryName:item.parking?.primary?.name || '', parkingPrimaryMapsUrl:item.parking?.primary?.mapsUrl || '',
    parkingBackupName:item.parking?.backup?.name || '', parkingBackupMapsUrl:item.parking?.backup?.mapsUrl || '', parkingNotes:item.parking?.notes || '' }
    : { date:state.selectedDate, currency:trip.currency, ...seed };
  for (const [name,value] of Object.entries(values)) {
    const control = form.elements.namedItem(name);
    if (control && typeof value !== 'object') control.value = value ?? '';
  }
  form.elements.date.min = trip.startDate; form.elements.date.max = trip.endDate;
  form.elements.endDate.min = trip.startDate; form.elements.endDate.max = trip.endDate;
  buildParkingEditor(item?.parking,trip);
  $('#flight-fields').hidden = values.type !== 'flight';
  $('#end-fields').hidden = values.type === 'flight';
  $('#item-dialog-title').textContent = item ? '編輯安排' : '新增安排';
  $('#item-save-button').textContent = item ? '儲存變更' : '加入行程';
  $('#item-delete-button').hidden = !item;
  $('#item-delete-button').textContent = '刪除安排';
  $('#item-delete-warning').hidden = true;
  openDialog('item-dialog');
}

function editingTrip() {
  const trip = currentTrip();
  if (!itemEditor || trip?.id !== itemEditor.tripId || trip.revision !== itemEditor.revision) throw new ValidationError('旅程已變更，請關閉視窗後重新開啟安排。');
  return trip;
}

function setItemSaving(busy) {
  itemSaving = busy;
  for (const control of $('#item-form').querySelectorAll('input,select,textarea,button')) control.disabled = busy || (control.tagName==='BUTTON' && !canEditTrip() && !control.hasAttribute('data-close'));
  updateParkingMode();
}

function renderFirebasePreview(config) {
  const preview = $('#firebase-config-preview');
  preview.innerHTML = `<strong>✓ Firebase Web config 已辨識</strong><span>Project ID：${escapeHtml(config.projectId)}</span><span>Auth Domain：${escapeHtml(config.authDomain)}</span><span>Realtime Database：${escapeHtml(config.databaseURL)}</span>`;
}

function renderVerificationSummary() {
  const form = $('#connection-form');
  try {
    const input = formData(form);
    const config = parseFirebaseConfigInput(input);
    $('#verification-summary').innerHTML = `<strong>準備驗證以下設定</strong><span>Firebase：${escapeHtml(config.projectId)}</span><span>Database：${escapeHtml(config.databaseURL)}</span><span>登入帳號：${escapeHtml(input.email || '')}</span><span>Google：${googleKey() ? '已設定 Key，搜尋／估算需分別實測' : '未設定 Key，使用外部導航與手動安排'}</span><span>本步僅驗證 Firebase 登入與本人範圍讀寫。</span>`;
  } catch (error) {
    $('#verification-summary').textContent = error instanceof ValidationError ? error.message : '設定尚未完成。';
  }
}

function setSetupStep(nextStep) {
  setupStep = Math.max(0, Math.min(5, Number(nextStep) || 0));
  highestSetupStep = Math.max(highestSetupStep, setupStep);
  for (const panel of document.querySelectorAll('[data-setup-step]')) panel.hidden = Number(panel.dataset.setupStep) !== setupStep;
  for (const button of document.querySelectorAll('[data-setup-jump]')) {
    const index = Number(button.dataset.setupJump);
    if (index === setupStep) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    button.dataset.complete = String(index < highestSetupStep || (state.mode === 'cloud' && index < 5));
    button.disabled = index > highestSetupStep && state.mode !== 'cloud';
  }
  $('#setup-back-button').hidden = setupStep === 0;
  $('#setup-next-button').hidden = sharedPublicDemo ? setupStep >= 5 : setupStep >= 4;
  $('#setup-verify-button').hidden = sharedPublicDemo || setupStep !== 4;
  $('#setup-create-trip-button').hidden = sharedPublicDemo || setupStep !== 5 || state.trips.length > 0;
  $('#setup-finish-button').hidden = setupStep !== 5;
  if (setupStep === 4) renderVerificationSummary();
  setError($('#connection-form'), '');
}

function validateSetupStep(step) {
  const form = $('#connection-form');
  const input = formData(form);
  if (step === 0 && !form.elements.siteReady.checked) throw new ValidationError('請先確認你已經能從自己的 Travel OS 網址開啟網站。');
  if (step === 1) {
    const config = parseFirebaseConfigInput(input);
    renderFirebasePreview(config);
  }
  if (step === 3) {
    if (!String(input.email || '').trim()) throw new ValidationError('請輸入你在 Firebase Authentication → Users 建立的 Email。');
    if (String(input.password || '').length < 6) throw new ValidationError('請輸入 Firebase 使用者密碼。');
  }
}

async function copyText(value) {
  if (!navigator.clipboard?.writeText) throw new ValidationError('目前瀏覽器無法直接複製，請開啟 repository 的 firebase/database.rules.json 手動複製。');
  await navigator.clipboard.writeText(value);
}

async function saveTrip(trip,confirmGroupRecovery=false) {
  if(!canEditTrip()) throw new ValidationError('目前帳號無編輯權限；請保留表單內容並聯絡旅程擁有者。');
  if(!confirmGroupRecovery && store.groupRecovery?.(trip.id).length) throw new ValidationError('請先關閉表單並確認旅程上方的群組修復預覽，再重新開啟編輯。輸入內容仍保留。');
  const updated = touchTrip(trip);
  await saveToActiveStore(()=>store,updated);
  upsertTrip(updated);
  $('#save-status').textContent = '已儲存在本機';
  if (state.mode === 'cloud') $('#save-status').textContent = '已同步至自己的 Firebase';
  render();
}

function render() {
  const trip = currentTrip();
  const legacy=Boolean(trip && store.needsMigration?.(trip.id));
  $('#storage-migration').hidden=!legacy;
  if(migrationPreview && (migrationPreview.store!==store || migrationPreview.trip.id!==trip?.id || migrationPreview.trip.revision!==trip.revision)) migrationPreview=null;
  $('#migration-preview').hidden=!migrationPreview;
  $('#migration-prepare').disabled=migrationSaving || state.access[trip?.id]?.role!=='owner';
  $('#migration-confirm').disabled=migrationSaving || !migrationPreview || !$('#migration-ack').checked;
  const waitingForOwner='請聯絡旅程擁有者下載備份並升級；你目前可繼續閱讀。';
  if(legacy && state.access[trip.id]?.role!=='owner') $('#migration-status').textContent=waitingForOwner;
  else if($('#migration-status').textContent===waitingForOwner) $('#migration-status').textContent='';
  const recovered=trip ? store.groupRecovery?.(trip.id) || [] : [];
  $('#group-recovery').hidden=!recovered.length;
  $('#group-recovery-summary').textContent=recovered.map(group=>`${group.name}（${group.id}）`).join('、');
  $('#group-recovery-save').disabled=groupRecoverySaving || !canEditTrip();
  $('#group-recovery-status').textContent=recovered.length && legacy ? '請先由擁有者完成上方的備份與升級確認；遺失群組將列在升級預覽中。' : recovered.length && !canEditTrip() ? '目前為唯讀權限，請聯絡旅程擁有者或編輯者確認修復。' : '';
  renderMembers();
  $('#welcome').hidden = Boolean(trip);
  $('#workspace').hidden = !trip;
  travelEstimates.render();
  if (!trip) {
    for(const id of ['timeline','place-list','rental-list','stay-list','expense-list','next-stop-details','group-list','day-routes','trip-title','trip-destination','trip-dates']) document.getElementById(id).replaceChildren();
    $('#trip-select').replaceChildren();
    return;
  }
  const dates = tripDates(trip.startDate, trip.endDate);
  if (!dates.includes(state.selectedDate)) state.selectedDate = dates[0];
  travelEstimates.render();
  $('#trip-title').textContent = trip.title;
  $('#trip-destination').textContent = trip.destination;
  $('#trip-dates').textContent = `${trip.startDate} — ${trip.endDate}`;
  const tripSelect = $('#trip-select');
  tripSelect.replaceChildren(...state.trips.map((entry) => new Option(entry.title, entry.id, false, entry.id === trip.id)));
  $('#day-tabs').innerHTML = dates.map((date, index) => `<button class="day-tab" type="button" data-date="${date}" role="tab" aria-selected="${date === state.selectedDate}"><small>DAY ${index + 1}</small><strong>${formatDay(date)}</strong></button>`).join('');
  const items = trip.items.filter((item) => item.date === state.selectedDate).sort((a,b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));
  $('#day-routes').innerHTML = dayRouteSections(items, trip.groups).map(({ name, segments }) => `<div class="day-route-group"><strong>${escapeHtml(name)}</strong>${segments.length ? segments.map((segment, index) => `<div>${segment.url ? `<a href="${escapeHtml(segment.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(name)}${segment.titles.length === 1 ? '地點' : '今日開車路線'}${segments.length > 1 ? ` · 第 ${index + 1} 段` : ''} ↗</a>` : '<p>地址過長，無法建立此段 Google Maps 連結；請使用各站地圖入口。</p>'}<small>${segment.titles.map(escapeHtml).join(' → ')}</small></div>`).join('') : '<small>今天尚無可導航的地點</small>'}</div>`).join('');
  const upcoming = nextStop(items, state.selectedDate, trip.timeZone);
  const warnings = scheduleWarnings(trip.items, trip.groups);
  $('#next-stop').hidden = !upcoming;
  if (upcoming) {
    $('#next-stop-heading').textContent = upcoming.title;
    $('#next-stop-details').innerHTML = `<p class="next-stop-meta">${escapeHtml(upcoming.startTime || '彈性時間')} · ${escapeHtml(typeLabels[upcoming.type])}</p>${itemTimingHtml(upcoming)}${flightScheduleHtml(upcoming)}${itemNotesHtml(upcoming)}${parkingHtml(upcoming)}${!upcoming.parking && ['place', 'meal', 'stay'].includes(upcoming.type) ? '<p class="parking-unset">停車資訊未設定</p>' : ''}<div class="next-stop-actions">${mapLink(upcoming, 'Google Maps')}<button class="secondary icon-label-button" data-edit-item="${escapeHtml(upcoming.id)}" type="button">${icons.edit}<span>詳情・編輯</span></button></div>`;
  }
  $('#day-heading').textContent = formatDay(state.selectedDate);
  $('#timeline').innerHTML = items.map((item, index) => {
    const next = items[index + 1];
    const canRoute = next && ['place','meal','stay','transport'].includes(item.type) && ['place','meal','stay','transport'].includes(next.type) && (!item.groupId || !next.groupId || item.groupId === next.groupId);
    const route = canRoute ? `<div class="route-leg"><a href="${escapeHtml(routeMapUrl(item, next, 'driving'))}" target="_blank" rel="noopener noreferrer">Google Maps 開車路線 ↗</a><a href="${escapeHtml(routeMapUrl(item, next, 'walking'))}" target="_blank" rel="noopener noreferrer">Google Maps 步行路線 ↗</a><span>路程與時間請在 Google Maps 查看。</span></div>` : '';
    const warningHtml = warnings.has(item.id) ? `<ul class="schedule-warnings">${warnings.get(item.id).map(message=>`<li>${escapeHtml(message)}</li>`).join('')}</ul>` : '';
    return `<li class="timeline-item"><div class="timeline-time">${escapeHtml(item.startTime || '彈性')}</div><div><h3>${escapeHtml(item.title)}</h3><p class="timeline-meta">${escapeHtml([item.location, item.flight ? `${item.flight.origin || '—'} → ${item.flight.destination || '—'}` : '', item.groupId ? trip.groups.find((group) => group.id === item.groupId)?.name : ''].filter(Boolean).join(' · '))}</p>${itemTimingHtml(item)}${warningHtml}${flightScheduleHtml(item)}${itemNotesHtml(item)}${parkingHtml(item)}${mapLink(item)}${route}<button class="text-button item-edit" type="button" data-edit-item="${escapeHtml(item.id)}" aria-label="編輯安排：${escapeHtml(item.title)}">編輯</button></div><span class="type-badge">${typeLabels[item.type]}</span></li>`;
  }).join('');
  $('#timeline-empty').hidden = items.length > 0;
  $('#summary-days').textContent = dates.length;
  $('#summary-items').textContent = trip.items.length;
  $('#summary-groups').textContent = trip.groups.length;
  const totals = expenseTotals([...trip.items,...(trip.expenses || [])]);
  $('#summary-cost').textContent = Object.keys(totals).length ? Object.entries(totals).map(([currency, minor]) => `${currency} ${(minor / 100).toLocaleString('zh-TW')}`).join(' / ') : '—';
  $('#group-list').innerHTML = trip.groups.map((group) => `<li>${escapeHtml(group.name)} <button class="text-button" type="button" data-edit-group="${escapeHtml(group.id)}" ${canEditTrip() ? '' : 'disabled'} aria-label="管理群組：${escapeHtml(group.name)}">管理</button></li>`).join('');
  $('#group-empty').hidden = trip.groups.length > 0;
  if(!$('#item-dialog').open) {
    const groupSelect = $('#item-form select[name="groupId"]');
    groupSelect.replaceChildren(new Option('所有人', ''), ...trip.groups.map((group) => new Option(group.name, group.id)));
    $('#item-form input[name="currency"]').value = trip.currency;
  }
  renderPlaces();
  rentalUi.render();
  stayUi.render();
  expenseUi.render();
  for(const control of document.querySelectorAll('[data-open="item-dialog"],[data-open="group-dialog"],[data-edit-item]')) control.disabled=!canEditTrip();
}

function renderPlaces() {
  const trip = currentTrip();
  const filters = $('#place-filters');
  if (placeFilterTripId !== trip.id) { filters.reset(); placeFilterTripId = trip.id; }
  const places = trip.places || [];
  for (const [name,label] of [['region','地區'],['category','類別'],['subcategory','子類別']]) {
    const control = filters.elements.namedItem(name); const selected = control.value;
    const choices = [...new Set(places.filter(place=>name !== 'subcategory' || !filters.elements.category.value || place.category === filters.elements.category.value).map(place=>place[name]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-Hant'));
    control.replaceChildren(new Option(`全部${label}`,''),...choices.map(value=>new Option(value,value)));
    control.value = choices.includes(selected) ? selected : '';
  }
  const shown = filterPlaces(places,{...formData(filters),favorites:filters.elements.favorites.checked});
  $('#places-count').textContent = `${shown.length} / ${places.length} 個景點 · ${places.filter(place=>place.favorite).length} 個收藏`;
  $('#places-empty').hidden = shown.length > 0;
  $('#places-empty').textContent = places.length ? '沒有符合篩選的景點，請調整搜尋條件。' : '尚無景點。新增想去的地點，就能保存備註並加入每日行程。';
  $('#place-list').innerHTML = shown.map(place=>`<li class="place-card"><div class="panel-heading"><div><p class="eyebrow">${escapeHtml([place.region,place.category,place.subcategory].filter(Boolean).join(' · '))}</p><h3>${escapeHtml(place.title)}</h3></div><button class="place-icon-button favorite-button${place.favorite ? ' is-favorite' : ''}" type="button" data-favorite-place="${escapeHtml(place.id)}" aria-pressed="${place.favorite}" aria-label="${place.favorite ? '取消收藏' : '收藏'}：${escapeHtml(place.title)}">${icons.heart}</button></div>
    ${place.location ? `<p class="muted compact">${escapeHtml(place.location)}</p>` : ''}${place.hours ? `<p class="compact">營業時間：${escapeHtml(place.hours)}</p>` : ''}${itemNotesHtml(place)}
    <div class="next-stop-actions">${mapLink({...place,type:'place'},'Google Maps')}<button class="secondary icon-label-button" type="button" data-edit-place="${escapeHtml(place.id)}">${icons.edit}<span>編輯</span></button><button class="primary" type="button" data-schedule-place="${escapeHtml(place.id)}">加入行程</button></div></li>`).join('');
  setPlaceSaving(placeSaving);
}

function openPlaceDialog(place = null) {
  const trip = currentTrip(); if (!trip) return;
  const form = $('#place-form'); form.reset();
  placeEditor = {tripId:trip.id,revision:trip.revision,id:place?.id || ''};
  if (place) for (const [name,value] of Object.entries(place)) {
    const control = form.elements.namedItem(name);
    if (control) { if (control.type === 'checkbox') control.checked = value; else control.value = value; }
  }
  $('#place-dialog-title').textContent = place ? '編輯景點' : '新增景點';
  $('#place-delete-button').hidden = !place;
  $('#place-delete-button').textContent = '刪除景點'; $('#place-delete-warning').hidden = true;
  openDialog('place-dialog');
}

function editingPlaceTrip() {
  const trip = currentTrip();
  if (!placeEditor || trip?.id !== placeEditor.tripId || trip.revision !== placeEditor.revision) throw new ValidationError('旅程已變更，請保留輸入內容並重新開啟景點。');
  return trip;
}

function setPlaceSaving(busy) {
  placeSaving = busy;
  for (const control of document.querySelectorAll('#place-form input,#place-form textarea,#place-form button,#place-list button,[data-new-place]')) control.disabled = busy || (control.tagName==='BUTTON' && !canEditTrip() && !control.hasAttribute('data-close'));
}

$('#place-filters').addEventListener('submit',event=>event.preventDefault());
$('#place-filters').addEventListener('input',renderPlaces);
$('#place-dialog').addEventListener('cancel',event=>{ if (placeSaving) event.preventDefault(); });
$('#place-dialog').addEventListener('close',()=>{ placeEditor = null; $('[data-new-place]')?.focus(); });
$('#place-form').addEventListener('submit',async event=>{
  event.preventDefault(); const form = event.currentTarget; setError(form,''); if (placeSaving) return;
  try {
    const trip = editingPlaceTrip(); const places = trip.places || [];
    if (!placeEditor.id && places.length >= 10_000) throw new ValidationError('單一旅程最多支援 10000 個景點。');
    const place = createPlace({...formData(form),favorite:form.elements.favorite.checked},placeEditor.id || undefined);
    if (placeEditor.id && !places.some(entry=>entry.id === placeEditor.id)) throw new ValidationError('此景點已不存在，請重新載入。');
    setPlaceSaving(true);
    await saveTrip({...trip,places:placeEditor.id ? places.map(entry=>entry.id === place.id ? place : entry) : [...places,place]});
    setPlaceSaving(false); $('#place-dialog').close(); showToast('景點已儲存。');
  } catch (error) { setError(form,error); } finally { setPlaceSaving(false); }
});
$('#place-delete-button').addEventListener('click',async()=>{
  if (placeSaving) return;
  if ($('#place-delete-warning').hidden) { $('#place-delete-warning').hidden = false; $('#place-delete-button').textContent = '確定刪除景點'; return; }
  try {
    const trip = editingPlaceTrip(); setPlaceSaving(true);
    await saveTrip({...trip,places:(trip.places || []).filter(place=>place.id !== placeEditor.id)});
    setPlaceSaving(false); $('#place-dialog').close(); showToast('景點已刪除；每日安排仍保留。');
  } catch (error) { setError($('#place-form'),error); } finally { setPlaceSaving(false); }
});
$('#place-library').addEventListener('click',async event=>{
  if (placeSaving) return;
  if (event.target.closest('[data-new-place]')) { openPlaceDialog(); return; }
  const button = event.target.closest('[data-edit-place],[data-favorite-place],[data-schedule-place]'); if (!button) return;
  const trip = currentTrip(); const id = button.dataset.editPlace || button.dataset.favoritePlace || button.dataset.schedulePlace;
  const place = trip?.places?.find(entry=>entry.id === id); if (!place) return;
  $('#places-error').textContent = '';
  if (button.hasAttribute('data-edit-place')) { openPlaceDialog(place); return; }
  if (button.hasAttribute('data-schedule-place')) { openItemDialog(null,placeItemInput(place,state.selectedDate)); return; }
  try {
    setPlaceSaving(true);
    await saveTrip({...trip,places:trip.places.map(entry=>entry.id === id ? {...entry,favorite:!entry.favorite} : entry)});
    setPlaceSaving(false);
    const target = Array.from($('#place-list').querySelectorAll('[data-favorite-place]')).find(control=>control.dataset.favoritePlace === id);
    (target || $('#place-filters').elements.favorites).focus();
  } catch (error) { setError($('#place-library'),error); } finally { setPlaceSaving(false); }
});

function escapeHtml(value) { const element = document.createElement('span'); element.textContent = value ?? ''; return element.innerHTML; }

document.addEventListener('click', (event) => {
  const opener = event.target.closest('[data-open]');
  if (opener) {
    if (opener.dataset.open === 'settings-dialog') setSetupStep(state.mode === 'cloud' ? 4 : 0);
    if (opener.dataset.open === 'item-dialog') openItemDialog(); else openDialog(opener.dataset.open);
  }
  const editButton = event.target.closest('[data-edit-item]');
  if (editButton) { const item = currentTrip()?.items.find(item=>item.id === editButton.dataset.editItem); if (item) openItemDialog(item); }
  const setupJump = event.target.closest('[data-setup-jump]');
  if (setupJump && !setupJump.disabled) setSetupStep(Number(setupJump.dataset.setupJump));
  const day = event.target.closest('[data-date]');
  if (day) { state.selectedDate = day.dataset.date; render(); }
  if (event.target.closest('[data-import]')) $('#import-file').click();
  if (event.target.closest('[data-close]')) event.target.closest('dialog')?.close();
});

$('#trip-select').addEventListener('change', (event) => { state.currentTripId = event.target.value; state.selectedDate = ''; render(); });
$('#settings-button').addEventListener('click', () => {
  if (!sharedPublicDemo) setSetupStep(state.mode === 'cloud' ? 5 : 0);
  openDialog('settings-dialog');
});
$('#theme-button').addEventListener('click', () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = next; localStorage.setItem(STORAGE_KEYS.theme, next); });

$('#trip-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; setError(form, '');
  try { const trip = createTrip(formData(form)); await saveToActiveStore(()=>store,trip); upsertTrip(trip); state.currentTripId = trip.id; state.selectedDate = trip.startDate; form.reset(); form.elements.timeZone.value = 'Asia/Taipei'; form.elements.currency.value = 'TWD'; form.closest('dialog').close(); render(); showToast(state.mode === 'cloud' ? '旅程已建立並同步到自己的 Firebase。' : '旅程已建立並儲存在本機。'); } catch (error) { setError(form, error); }
});

$('#item-form select[name="type"]').addEventListener('change', (event) => { $('#flight-fields').hidden = event.target.value !== 'flight'; $('#end-fields').hidden = event.target.value === 'flight'; });
$('#item-form select[name="parkingMode"]').addEventListener('change', updateParkingMode);
$('#item-dialog').addEventListener('cancel', event => { if (itemSaving) event.preventDefault(); });
$('#item-dialog').addEventListener('close', () => {
  const id = itemEditor?.id; itemEditor = null;
  const target = Array.from($('#timeline').querySelectorAll('[data-edit-item]')).find(button=>button.dataset.editItem === id);
  (target || document.querySelector('[data-open="item-dialog"]'))?.focus();
});
$('#item-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; setError(form, '');
  if (itemSaving) return;
  try {
    const trip = editingTrip(); const input = {...formData(form),parking:readParkingEditor(trip)}; const editing = Boolean(itemEditor.id);
    const updated = editing ? editItem(trip,itemEditor.id,input) : { ...trip, items:[...trip.items,createItem(input,trip)] };
    setItemSaving(true); await saveTrip(updated); state.selectedDate = input.date; render();
    form.closest('dialog').close(); showToast(editing ? '安排已更新。' : '安排已加入行程。');
  } catch (error) { setError(form, error); } finally { setItemSaving(false); }
});
$('#item-delete-button').addEventListener('click', async () => {
  if (itemSaving) return;
  if ($('#item-delete-warning').hidden) { $('#item-delete-warning').hidden = false; $('#item-delete-button').textContent = '確定刪除此安排'; return; }
  try {
    const trip = editingTrip(); setItemSaving(true);
    await saveTrip({ ...trip, items:trip.items.filter(item=>item.id !== itemEditor.id) });
    $('#item-dialog').close(); showToast('安排已刪除。');
  } catch (error) { setError($('#item-form'),error); } finally { setItemSaving(false); }
});

$('#group-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; setError(form, '');
  try { const trip = currentTrip(); const group = addGroup(trip, formData(form).name); await saveTrip({ ...trip, groups:[...trip.groups,group] }); form.reset(); form.closest('dialog').close(); showToast('群組已新增。'); } catch (error) { setError(form, error); }
});

function updateConnectionSummary() {
  const summary = $('#connection-summary');
  if (state.mode === 'cloud') {
    summary.innerHTML = `<strong>雲端同步已啟用</strong><span>${escapeHtml(state.connection.projectId)} · ${escapeHtml(state.connection.email || '')}</span>`;
    $('#save-status').textContent = '已連接自己的 Firebase';
  } else if (sharedPublicDemo) {
    summary.innerHTML = '<strong>公開體驗站</strong><span>僅限本機模式，不接受雲端設定或帳密</span>';
    $('#save-status').textContent = '本機模式';
  } else {
    summary.innerHTML = '<strong>本機模式</strong><span>資料只保存在這台裝置</span>';
    $('#save-status').textContent = '本機模式';
  }
}

async function activateStore(nextStore, mode, connection = null) {
  const nextTrips = await prepareStoreSwitch(store, nextStore);
  const warnings = nextStore.consumeWarnings?.() || [];
  store = nextStore;
  travelEstimates.clear();
  state.mode = mode; state.connection = connection;
  state.access=Object.create(null);
  for(const id of ['item-form','place-form','rental-form','stay-form','expense-form','group-form','member-form']) document.getElementById(id).reset();
  itemEditor=placeEditor=null;pendingBackup=null;
  state.trips = nextTrips;
  state.currentTripId = state.trips[0]?.id || ''; state.selectedDate = '';
  updateConnectionSummary(); render();
  if(mode==='cloud') nextStore.subscribe({
    onTrip:(trip,access)=>{
      if(store!==nextStore) return;
      const previous=state.trips.find(entry=>entry.id===trip.id);
      upsertTrip(trip);state.access[trip.id]=access;
      if(!state.currentTripId) state.currentTripId=trip.id;
      if(previous && previous.revision!==trip.revision) warnOpenDraft('旅程已由其他裝置更新，未儲存內容仍保留。請先複製內容，再重新開啟表單後編輯。');
      renderLive();
    },
    onRemove:id=>{
      if(store!==nextStore) return;
      state.trips=state.trips.filter(trip=>trip.id!==id);delete state.access[id];
      if(state.currentTripId===id){state.currentTripId=state.trips[0]?.id || '';state.selectedDate='';warnOpenDraft('此旅程已刪除或權限已移除；草稿仍保留，請先複製需要的內容。');}
      render();
    },
    onError:error=>{if(store===nextStore){$('#cloud-sync-status').textContent=error instanceof ValidationError ? error.message : '即時更新失敗，請確認連線與成員權限，再重新登入。';}},
    onConnection:connected=>{if(store===nextStore) $('#cloud-sync-status').textContent=connected ? '已連線，正在接收旅程更新。' : '雲端連線中斷；請保留草稿，恢復連線後再儲存。';},
  });
  return warnings;
}

$('#connection-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget; setError(form, '');
  if (setupStep !== 4) {
    try { validateSetupStep(setupStep); setSetupStep(setupStep + 1); }
    catch (error) { setError(form, error); }
    return;
  }
  const progress = $('#connection-progress'); progress.innerHTML = '<span>1／3　正在檢查 Firebase 設定…</span>';
  try {
    if (sharedPublicDemo) throw new ValidationError('公開體驗站僅提供本機模式；請先建立由自己控制的網站副本。');
    const input = formData(form);
    if (!input.email || !input.password) throw new ValidationError('請輸入 Firebase Email 與密碼。');
    const config = parseFirebaseConfigInput(input);
    progress.innerHTML += '<span>2／3　正在登入指定的 Firebase 專案，並測試本人範圍讀寫…</span>';
    const cloudStore = new FirebaseTripStore();
    const connection = await cloudStore.connect(config, { email:input.email, password:input.password });
    progress.innerHTML += '<span>3／3　Firebase 診斷讀寫已完成，正在載入旅程…</span>';
    const warnings = await activateStore(cloudStore, 'cloud', connection);
    localStorage.setItem(STORAGE_KEYS.onboardingMode, 'cloud');
    const mapsStatus = googleKey() ? '已設定 Key；請分別實測景點搜尋與路程估算' : '免 Key 外部導航與手動安排';
    if (input.remember) localStorage.setItem(STORAGE_KEYS.connection, JSON.stringify({ firebase:config }));
    else localStorage.removeItem(STORAGE_KEYS.connection);
    form.elements.password.value = '';
    $('#setup-complete-summary').innerHTML = `<strong>✓ 雲端同步已啟用</strong><span>Firebase：${escapeHtml(connection.projectId)}</span><span>帳號：${escapeHtml(connection.email || '')}</span><span>Google Maps：${escapeHtml(mapsStatus)}</span><span>Firebase 同步不需要 Blaze 或 Functions；Google API 另依設定與額度使用。</span>`;
    setSetupStep(5);
    showToast(warnings.length ? `已連接 ${connection.projectId}；另略過 ${warnings.length} 筆失效或損壞的雲端資料。` : `已連接 ${connection.projectId}；目前顯示這個帳號的雲端旅程。`);
  } catch (error) {
    progress.innerHTML += `<span>✕ 驗證失敗：${escapeHtml(error instanceof Error ? error.message : '未知錯誤')}</span>`;
    setError(form, error);
  }
});

$('#setup-next-button').addEventListener('click', () => {
  const form = $('#connection-form'); setError(form, '');
  if (sharedPublicDemo) { setSetupStep(setupStep + 1); return; }
  try { validateSetupStep(setupStep); setSetupStep(setupStep + 1); }
  catch (error) { setError(form, error); }
});

$('#setup-back-button').addEventListener('click', () => setSetupStep(setupStep - 1));

$('#copy-rules-button').addEventListener('click', async () => {
  try { await copyText(travelOsDatabaseRules); showToast('Travel OS Realtime Database Rules 已複製。'); }
  catch (error) { setError($('#connection-form'), error); }
});

function updateFirebaseConfigPreview() {
  try { renderFirebasePreview(parseFirebaseConfigInput(formData($('#connection-form')))); }
  catch (error) { $('#firebase-config-preview').innerHTML = `<strong>設定尚未完成</strong><span>${escapeHtml(error instanceof ValidationError ? error.message : '請貼上 Firebase Web config。')}</span>`; }
}

$('#connection-form').elements.firebaseConfig.addEventListener('input', updateFirebaseConfigPreview);
$('#connection-form').elements.firebase_databaseURL.addEventListener('input', updateFirebaseConfigPreview);

$('#setup-create-trip-button').addEventListener('click', () => {
  $('#settings-dialog').close();
  openDialog('trip-dialog');
});

$('#setup-finish-button').addEventListener('click', () => $('#settings-dialog').close());

$('#local-mode-button').addEventListener('click', async () => {
  const localStore = await new IndexedDbTripStore().connect();
  await activateStore(localStore, 'local');
  localStorage.setItem(STORAGE_KEYS.onboardingMode, 'local');
  $('#connection-form').closest('dialog').close();
  showToast('已進入本機模式；之後仍可從設定啟用雲端同步。');
});

function downloadBackup(mode) {
  const backup = createBackup(state.trips, mode);
  downloadJson(backup,`travel-os-${mode}-${new Date().toISOString().slice(0,10)}.json`);
}
function downloadJson(backup,name) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type:'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob); link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
$('#export-button').addEventListener('click', () => downloadBackup('private'));
$('#share-export-button').addEventListener('click', () => downloadBackup('share'));
$('#migration-ack').addEventListener('change',()=>{$('#migration-confirm').disabled=migrationSaving || !migrationPreview || !$('#migration-ack').checked;});
$('#migration-prepare').addEventListener('click',async()=>{
  if(migrationSaving) return;
  const activeStore=store,id=currentTrip()?.id;migrationSaving=true;render();
  try {
    const preview=await activeStore.prepareMigration(id);
    if(store!==activeStore || currentTrip()?.id!==id) throw new ValidationError('連線或旅程已切換，請在目前旅程重新下載備份。');
    downloadJson(preview.backup,`travel-os-before-upgrade-${new Date().toISOString().slice(0,10)}.json`);
    migrationPreview={...preview,store:activeStore};$('#migration-ack').checked=false;
    $('#migration-summary').textContent=`版本 ${preview.trip.revision} → ${preview.trip.revision+1}；${preview.trip.items.length} 筆行程、${preview.trip.places.length} 個景點、${preview.trip.rentals.length} 筆租車、${preview.trip.stays.length} 筆住宿、${preview.trip.expenses.length} 筆費用。`+(preview.recovered.length ? ` 將補回遺失群組：${preview.recovered.map(group=>`${group.name}（${group.id}）`).join('、')}。原有群組 ID 與資料參照會保留。` : ' 無需補回群組。');
    $('#migration-status').textContent='請先確認下載資料夾內的備份已保存，再勾選並確認升級。';
  } catch(error) {$('#migration-status').textContent=error instanceof ValidationError ? error.message : '無法準備升級，請確認連線、擁有者權限及目前版本 Rules。';}
  finally {migrationSaving=false;render();}
});
$('#migration-confirm').addEventListener('click',async()=>{
  if(migrationSaving || !migrationPreview || !$('#migration-ack').checked) return;
  const preview=migrationPreview;
  if(store!==preview.store || currentTrip()?.id!==preview.trip.id) {migrationPreview=null;render();return;}
  migrationSaving=true;render();
  try {
    const updated=await preview.store.migrateTrip(preview.trip.id,preview.trip.revision);
    if(store!==preview.store) throw new ValidationError('連線已切換，請回原專案確認升級結果。');
    upsertTrip(updated);migrationPreview=null;$('#migration-status').textContent='';showToast('旅程已升級，內容與成員權限已保留。');
  } catch(error) {$('#migration-status').textContent=error instanceof ValidationError ? error.message : '升級未完成；請保留備份，確認連線及目前版本 Rules 後重試。';}
  finally {migrationSaving=false;render();}
});
$('#group-recovery-save').addEventListener('click',async event=>{
  if(groupRecoverySaving) return;groupRecoverySaving=true;
  const button=event.currentTarget;button.disabled=true;
  try {await saveTrip(currentTrip(),true);showToast('群組修復已保存；請確認群組名稱及內容。');}
  catch(error) {$('#group-recovery-status').textContent=error instanceof ValidationError ? error.message : '修復保存失敗，請檢查連線與編輯權限後重試。';}
  finally {groupRecoverySaving=false;button.disabled=!canEditTrip();}
});
$('#import-file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  if (file.size > 5_000_000) { showToast('備份檔案不可超過 5 MB。'); return; }
  try {
    const raw=JSON.parse(await file.text());
    let recoveryCount=0;
    if(Array.isArray(raw?.trips) && raw.trips.length<=100) raw.trips=raw.trips.map(value=>{
      const result=recoverMissingGroups(value);recoveryCount+=result.recovered.length;return result.trip;
    });
    pendingBackup = validateBackup(raw);
    const itemCount = pendingBackup.trips.reduce((sum, trip) => sum + trip.items.length, 0);
    const placeCount = pendingBackup.trips.reduce((sum, trip) => sum + trip.places.length, 0);
    $('#import-summary').innerHTML = `<strong>${pendingBackup.trips.length} 趟旅程</strong><span>${itemCount} 筆安排 · ${placeCount} 個景點 · ${pendingBackup.mode === 'share' ? '分享副本' : '完整備份'}</span>`;
    $('#import-cloud-choice').hidden = state.mode !== 'cloud';
    $('#import-trip-select').replaceChildren(...pendingBackup.trips.map((trip,index)=>new Option(`${trip.title} · ${trip.startDate} — ${trip.endDate}`,String(index))));
    $('#import-warning').textContent = state.mode === 'cloud' ? '只匯入所選的一趟，建立全新旅程並由目前登入帳號擁有；既有旅程不會被覆蓋。備份不包含原專案設定或成員權限。' : '匯入會取代目前本機模式的所有旅程；請先匯出現有資料的完整備份。';
    if(recoveryCount) $('#import-warning').textContent+=` 備份另有 ${recoveryCount} 組遺失群組參照，確認匯入時將以「待確認群組」補回原 ID；保留原有行程、停車、預訂與費用。原名稱無法還原，匯入後可更名或移轉。`;
    $('#import-confirm').textContent = state.mode === 'cloud' ? '匯入為新的雲端旅程' : '確認取代本機資料';
    $('#import-confirm').disabled = !pendingBackup.trips.length && state.mode === 'cloud';
    openDialog('import-dialog');
  } catch (error) { showToast(error instanceof ValidationError ? error.message : '備份檔案無法解析。'); }
  event.target.value = '';
});
$('#import-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!pendingBackup) return;
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  if (button.disabled) return;
  importSaving = true;
  for (const control of form.elements) control.disabled = true;
  try {
    if (state.mode === 'cloud') {
      const source=pendingBackup.trips[Number($('#import-trip-select').value)];
      if (!source) throw new ValidationError('請選擇一趟旅程。');
      const copy=restoredTripCopy(source);
      await saveToActiveStore(()=>store,copy);
      upsertTrip(copy);state.currentTripId=copy.id;state.selectedDate=copy.startDate;
      pendingBackup=null;form.closest('dialog').close();render();showToast('已還原為新的雲端旅程；原旅程保留。');
      return;
    }
    await store.replaceAll(pendingBackup.trips);
    state.trips = pendingBackup.trips; state.currentTripId = state.trips[0]?.id || ''; state.selectedDate = '';
    const count = pendingBackup.trips.length; pendingBackup = null; form.closest('dialog').close(); render(); showToast(`已還原 ${count} 趟旅程。`);
  } catch (error) {
    setError(form,error instanceof ValidationError ? error : new ValidationError(state.mode === 'cloud' ? '雲端還原失敗；請檢查連線、Rules 與旅程數量限制，再重試。原旅程未被覆蓋。' : '備份還原失敗；請確認瀏覽器儲存空間後重試。'));
  } finally { importSaving = false; for (const control of form.elements) control.disabled = false; }
});
$('#import-dialog').addEventListener('cancel',event=>{if(importSaving) event.preventDefault();});

for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', (event) => { if (event.target === dialog && !importSaving && !itemSaving && !placeSaving && !rentalUi.isSaving() && !stayUi.isSaving() && !expenseUi.isSaving() && !groupUi.isSaving()) dialog.close(); });
for(const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('close',()=>{if(deferredLiveRender && !document.querySelector('dialog[open]')){deferredLiveRender=false;render();}});

async function start() {
  document.documentElement.dataset.theme = localStorage.getItem(STORAGE_KEYS.theme) || 'light';
  setActiveView(new URL(location.href).searchParams.get('view') || 'dashboard',{updateUrl:false});
  $('#current-site-url').textContent = location.href.split('#')[0].split('?')[0];
  let initialSetupStep = 0;
  if (sharedPublicDemo) {
    localStorage.removeItem(STORAGE_KEYS.connection);
    $('#official-demo-url-warning').hidden = false;
    $('#shared-host-warning').hidden = false;
    $('#connection-form').classList.add('setup-readonly');
    highestSetupStep = 5;
    for (const field of $('#external-service-fields').querySelectorAll('input, textarea')) field.disabled = true;
    $('#connection-summary').innerHTML = '<strong>公開體驗站 · 教學模式</strong><span>可完整閱讀設定指南；Firebase config 與帳密輸入已停用</span>';
    $('#cloud-setup-button').hidden = true;
    $('#local-start-button').textContent = '建立第一趟旅程';
  }
  const remembered = localStorage.getItem(STORAGE_KEYS.connection);
  if (remembered) {
    try {
      const connection = parseRememberedConnection(remembered);
      $('#connection-form').elements.firebaseConfig.value = JSON.stringify(connection.firebase, null, 2);
      $('#connection-form').elements.remember.checked = true;
      localStorage.setItem(STORAGE_KEYS.connection, JSON.stringify(connection));
      highestSetupStep = 3;
      initialSetupStep = 3;
      renderFirebasePreview(connection.firebase);
    } catch { localStorage.removeItem(STORAGE_KEYS.connection); }
  }
  await store.connect(); state.trips = await store.listTrips(); state.trips.sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)); state.currentTripId = state.trips[0]?.id || ''; render();
  if (sharedPublicDemo) setSetupStep(0); else setSetupStep(initialSetupStep);
  if (shouldOpenCloudOnboarding(location.hostname, location.pathname, localStorage.getItem(STORAGE_KEYS.onboardingMode) || '')) openDialog('settings-dialog');
}

start().catch(() => { $('#save-status').textContent = '儲存空間無法使用'; showToast('無法開啟本機儲存空間，請檢查瀏覽器設定。'); });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
