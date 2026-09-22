import './styles.css';
import { addGroup, createBackup, createItem, createTrip, expenseTotals, touchTrip, tripDates, validateBackup, ValidationError } from './domain/trip.js';
import { IndexedDbTripStore } from './storage/indexed-db.js';
import { parseFirebaseConfigInput } from './config/firebase-config.js';
import { isSharedPublicDemo } from './config/deployment.js';
import { FirebaseTripStore } from './storage/firebase-store.js';
import { prepareStoreSwitch } from './storage/store-switch.js';
import { mapSearchUrl, validateMapsBrowserKey, verifyMapsBrowserKey } from './providers/maps.js';

let store = new IndexedDbTripStore();
const state = { trips: [], currentTripId: '', selectedDate: '', mode:'local', connection:null, googleMapsKey:'' };
let pendingBackup = null;
const $ = (selector) => document.querySelector(selector);
const typeLabels = { place: '景點', meal: '餐飲', stay: '住宿', flight: '航班', transport: '交通', other: '其他' };
const sharedPublicDemo = isSharedPublicDemo(location.hostname);

function formatDay(date) { return new Intl.DateTimeFormat('zh-TW', { month:'numeric', day:'numeric', weekday:'short', timeZone:'UTC' }).format(new Date(`${date}T00:00:00Z`)); }
function currentTrip() { return state.trips.find((trip) => trip.id === state.currentTripId); }
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.hidden = false; clearTimeout(showToast.timer); showToast.timer = setTimeout(() => { toast.hidden = true; }, 3000); }
function setError(form, error) { form.querySelector('.form-error').textContent = error instanceof ValidationError ? error.message : '發生未預期的錯誤，請再試一次。'; }
function openDialog(id) {
  const dialog = document.getElementById(id);
  for (const error of dialog.querySelectorAll('.form-error')) error.textContent = '';
  dialog.showModal();
  dialog.querySelector('input,select,button')?.focus();
}
function formData(form) { return Object.fromEntries(new FormData(form).entries()); }

async function saveTrip(trip) {
  const updated = touchTrip(trip);
  await store.saveTrip(updated);
  state.trips = state.trips.map((entry) => entry.id === updated.id ? updated : entry);
  $('#save-status').textContent = '已儲存在本機';
  if (state.mode === 'cloud') $('#save-status').textContent = '已同步至自己的 Firebase';
  render();
}

function render() {
  const trip = currentTrip();
  $('#welcome').hidden = Boolean(trip);
  $('#workspace').hidden = !trip;
  if (!trip) return;
  const dates = tripDates(trip.startDate, trip.endDate);
  if (!dates.includes(state.selectedDate)) state.selectedDate = dates[0];
  $('#trip-title').textContent = trip.title;
  $('#trip-destination').textContent = trip.destination;
  $('#trip-dates').textContent = `${trip.startDate} — ${trip.endDate}`;
  const tripSelect = $('#trip-select');
  tripSelect.replaceChildren(...state.trips.map((entry) => new Option(entry.title, entry.id, false, entry.id === trip.id)));
  $('#day-tabs').innerHTML = dates.map((date, index) => `<button class="day-tab" type="button" data-date="${date}" role="tab" aria-selected="${date === state.selectedDate}"><small>DAY ${index + 1}</small><strong>${formatDay(date)}</strong></button>`).join('');
  const items = trip.items.filter((item) => item.date === state.selectedDate).sort((a,b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));
  $('#day-heading').textContent = formatDay(state.selectedDate);
  $('#timeline').innerHTML = items.map((item) => `<li class="timeline-item"><div class="timeline-time">${escapeHtml(item.startTime || '彈性')}</div><div><h3>${escapeHtml(item.title)}</h3><p class="timeline-meta">${escapeHtml([item.location, item.flight ? `${item.flight.origin || '—'} → ${item.flight.destination || '—'}` : '', item.groupId ? trip.groups.find((group) => group.id === item.groupId)?.name : ''].filter(Boolean).join(' · '))}</p>${item.location ? `<a class="map-link" href="${mapSearchUrl(item.location)}" target="_blank" rel="noopener noreferrer">在 Google Maps 開啟</a>` : ''}</div><span class="type-badge">${typeLabels[item.type]}</span></li>`).join('');
  $('#timeline-empty').hidden = items.length > 0;
  $('#summary-days').textContent = dates.length;
  $('#summary-items').textContent = trip.items.length;
  $('#summary-groups').textContent = trip.groups.length;
  const totals = expenseTotals(trip.items);
  $('#summary-cost').textContent = Object.keys(totals).length ? Object.entries(totals).map(([currency, minor]) => `${currency} ${(minor / 100).toLocaleString('zh-TW')}`).join(' / ') : '—';
  $('#group-list').innerHTML = trip.groups.map((group) => `<li>${escapeHtml(group.name)}</li>`).join('');
  $('#group-empty').hidden = trip.groups.length > 0;
  const groupSelect = $('#item-form select[name="groupId"]');
  groupSelect.replaceChildren(new Option('所有人', ''), ...trip.groups.map((group) => new Option(group.name, group.id)));
  $('#item-form input[name="currency"]').value = trip.currency;
}

function escapeHtml(value) { const element = document.createElement('span'); element.textContent = value ?? ''; return element.innerHTML; }

document.addEventListener('click', (event) => {
  const opener = event.target.closest('[data-open]');
  if (opener) openDialog(opener.dataset.open);
  const day = event.target.closest('[data-date]');
  if (day) { state.selectedDate = day.dataset.date; render(); }
  if (event.target.closest('[data-close]')) event.target.closest('dialog')?.close();
});

$('#trip-select').addEventListener('change', (event) => { state.currentTripId = event.target.value; state.selectedDate = ''; render(); });
$('#settings-button').addEventListener('click', () => openDialog('settings-dialog'));
$('#theme-button').addEventListener('click', () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = next; localStorage.setItem('travel-os:theme', next); });

$('#trip-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; setError(form, '');
  try { const trip = createTrip(formData(form)); await store.saveTrip(trip); state.trips.push(trip); state.currentTripId = trip.id; state.selectedDate = trip.startDate; form.reset(); form.elements.timeZone.value = 'Asia/Taipei'; form.elements.currency.value = 'TWD'; form.closest('dialog').close(); render(); showToast('旅程已建立並儲存在本機。'); } catch (error) { setError(form, error); }
});

$('#item-form select[name="type"]').addEventListener('change', (event) => { $('#flight-fields').hidden = event.target.value !== 'flight'; });
$('#item-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; setError(form, '');
  try { const trip = currentTrip(); const item = createItem({ ...formData(form), date: state.selectedDate }, trip); await saveTrip({ ...trip, items:[...trip.items,item] }); form.reset(); $('#flight-fields').hidden = true; form.closest('dialog').close(); showToast('安排已加入行程。'); } catch (error) { setError(form, error); }
});

$('#group-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; setError(form, '');
  try { const trip = currentTrip(); const group = addGroup(trip, formData(form).name); await saveTrip({ ...trip, groups:[...trip.groups,group] }); form.reset(); form.closest('dialog').close(); showToast('群組已新增。'); } catch (error) { setError(form, error); }
});

function updateConnectionSummary() {
  const summary = $('#connection-summary');
  if (state.mode === 'cloud') {
    summary.innerHTML = `<strong>Firebase 模式</strong><span>${escapeHtml(state.connection.projectId)} · ${escapeHtml(state.connection.email || '')}</span>`;
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
  state.mode = mode; state.connection = connection;
  state.trips = nextTrips;
  state.currentTripId = state.trips[0]?.id || ''; state.selectedDate = '';
  updateConnectionSummary(); render();
  return warnings;
}

$('#connection-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget; setError(form, '');
  const progress = $('#connection-progress'); progress.innerHTML = '<span>1／3　正在檢查設定格式…</span>';
  try {
    if (sharedPublicDemo) throw new ValidationError('公開體驗站僅提供本機模式；請先建立由自己控制的網站副本。');
    const input = formData(form);
    const intent = event.submitter?.value || 'login';
    const mapsKey = validateMapsBrowserKey(input.googleMapsKey);
    if (intent === 'maps') {
      progress.innerHTML = '<span>正在驗證 Google Maps browser key…</span>';
      const result = await verifyMapsBrowserKey(mapsKey);
      state.googleMapsKey = mapsKey;
      if (input.remember) {
        let previous = {};
        try { previous = JSON.parse(localStorage.getItem('travel-os:connection') || '{}'); } catch { previous = {}; }
        localStorage.setItem('travel-os:connection', JSON.stringify({ ...previous, googleMapsKey:mapsKey }));
      }
      progress.innerHTML = `<span>${escapeHtml(result.message)}</span>`;
      showToast(result.enabled ? 'Google Maps 選配功能已啟用。' : '未設定 key；外部導航仍可使用。');
      return;
    }
    if (!input.email || !input.password) throw new ValidationError('請輸入 Firebase Email 與密碼。');
    const config = parseFirebaseConfigInput(input);
    progress.innerHTML += '<span>2／3　正在登入指定的 Firebase 專案…</span>';
    const cloudStore = new FirebaseTripStore();
    const connection = await cloudStore.connect(config, { email:input.email, password:input.password });
    progress.innerHTML += '<span>3／3　測試資料讀寫已完成。</span>';
    state.googleMapsKey = mapsKey;
    if (input.remember) localStorage.setItem('travel-os:connection', JSON.stringify({ firebase:config, googleMapsKey:state.googleMapsKey }));
    else localStorage.removeItem('travel-os:connection');
    const warnings = await activateStore(cloudStore, 'cloud', connection);
    form.elements.password.value = '';
    setTimeout(() => form.closest('dialog').close(), 350);
    showToast(warnings.length ? `已連接 ${connection.projectId}；另略過 ${warnings.length} 筆失效或損壞的雲端資料。` : `已連接 ${connection.projectId}；目前顯示這個帳號的雲端旅程。`);
  } catch (error) { progress.textContent = ''; setError(form, error); }
});

$('#local-mode-button').addEventListener('click', async () => {
  const localStore = await new IndexedDbTripStore().connect();
  await activateStore(localStore, 'local');
  $('#connection-form').closest('dialog').close();
  showToast('已切換至這台裝置的本機旅程。');
});

function downloadBackup(mode) {
  const backup = createBackup(state.trips, mode);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type:'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob); link.download = `travel-os-${mode}-${new Date().toISOString().slice(0,10)}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
$('#export-button').addEventListener('click', () => downloadBackup('private'));
$('#share-export-button').addEventListener('click', () => downloadBackup('share'));
$('#import-button').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  if (file.size > 5_000_000) { showToast('備份檔案不可超過 5 MB。'); return; }
  try {
    if (state.mode !== 'local') throw new ValidationError('請先切換至本機模式，再預覽及匯入備份。');
    pendingBackup = validateBackup(JSON.parse(await file.text()));
    const itemCount = pendingBackup.trips.reduce((sum, trip) => sum + trip.items.length, 0);
    $('#import-summary').innerHTML = `<strong>${pendingBackup.trips.length} 趟旅程</strong><span>${itemCount} 筆安排 · ${pendingBackup.mode === 'share' ? '分享副本' : '完整備份'}</span>`;
    openDialog('import-dialog');
  } catch (error) { showToast(error instanceof ValidationError ? error.message : '備份檔案無法解析。'); }
  event.target.value = '';
});
$('#import-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!pendingBackup || state.mode !== 'local') return;
  try {
    await store.replaceAll(pendingBackup.trips);
    state.trips = pendingBackup.trips; state.currentTripId = state.trips[0]?.id || ''; state.selectedDate = '';
    const count = pendingBackup.trips.length; pendingBackup = null; event.currentTarget.closest('dialog').close(); render(); showToast(`已還原 ${count} 趟旅程。`);
  } catch {
    showToast('備份還原失敗；請確認瀏覽器儲存空間後重試。');
  }
});

for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });

async function start() {
  document.documentElement.dataset.theme = localStorage.getItem('travel-os:theme') || 'light';
  if (sharedPublicDemo) {
    localStorage.removeItem('travel-os:connection');
    $('#shared-host-warning').hidden = false;
    $('#external-service-fields').disabled = true;
    for (const button of $('#connection-form').querySelectorAll('button[name="intent"]')) button.disabled = true;
    $('#connection-summary').innerHTML = '<strong>公開體驗站</strong><span>僅限本機模式，不接受雲端設定或帳密</span>';
  }
  const remembered = localStorage.getItem('travel-os:connection');
  if (remembered) {
    try {
      const connection = JSON.parse(remembered);
      $('#connection-form').elements.firebaseConfig.value = JSON.stringify(connection.firebase, null, 2);
      $('#connection-form').elements.googleMapsKey.value = connection.googleMapsKey || '';
      state.googleMapsKey = connection.googleMapsKey || '';
      $('#connection-form').elements.remember.checked = true;
    } catch { localStorage.removeItem('travel-os:connection'); }
  }
  await store.connect(); state.trips = await store.listTrips(); state.trips.sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)); state.currentTripId = state.trips[0]?.id || ''; render();
}

start().catch(() => { $('#save-status').textContent = '儲存空間無法使用'; showToast('無法開啟本機儲存空間，請檢查瀏覽器設定。'); });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
