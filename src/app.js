import './styles.css';
import { addGroup, createItem, createTrip, expenseTotals, touchTrip, tripDates, validateBackup, ValidationError } from './domain/trip.js';
import { IndexedDbTripStore } from './storage/indexed-db.js';

const store = new IndexedDbTripStore();
const state = { trips: [], currentTripId: '', selectedDate: '' };
const $ = (selector) => document.querySelector(selector);
const typeLabels = { place: '景點', meal: '餐飲', stay: '住宿', flight: '航班', transport: '交通', other: '其他' };

function formatDay(date) { return new Intl.DateTimeFormat('zh-TW', { month:'numeric', day:'numeric', weekday:'short', timeZone:'UTC' }).format(new Date(`${date}T00:00:00Z`)); }
function currentTrip() { return state.trips.find((trip) => trip.id === state.currentTripId); }
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.hidden = false; clearTimeout(showToast.timer); showToast.timer = setTimeout(() => { toast.hidden = true; }, 3000); }
function setError(form, error) { form.querySelector('.form-error').textContent = error instanceof ValidationError ? error.message : '發生未預期的錯誤，請再試一次。'; }
function openDialog(id) { const dialog = document.getElementById(id); dialog.showModal(); dialog.querySelector('input,select,button')?.focus(); }
function formData(form) { return Object.fromEntries(new FormData(form).entries()); }

async function saveTrip(trip) {
  const updated = touchTrip(trip);
  await store.saveTrip(updated);
  state.trips = state.trips.map((entry) => entry.id === updated.id ? updated : entry);
  $('#save-status').textContent = '已儲存在本機';
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
  $('#trip-select').innerHTML = state.trips.map((entry) => `<option value="${entry.id}" ${entry.id === trip.id ? 'selected' : ''}>${escapeHtml(entry.title)}</option>`).join('');
  $('#day-tabs').innerHTML = dates.map((date, index) => `<button class="day-tab" type="button" data-date="${date}" role="tab" aria-selected="${date === state.selectedDate}"><small>DAY ${index + 1}</small><strong>${formatDay(date)}</strong></button>`).join('');
  const items = trip.items.filter((item) => item.date === state.selectedDate).sort((a,b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));
  $('#day-heading').textContent = formatDay(state.selectedDate);
  $('#timeline').innerHTML = items.map((item) => `<li class="timeline-item"><div class="timeline-time">${escapeHtml(item.startTime || '彈性')}</div><div><h3>${escapeHtml(item.title)}</h3><p class="timeline-meta">${escapeHtml([item.location, item.flight ? `${item.flight.origin || '—'} → ${item.flight.destination || '—'}` : '', item.groupId ? trip.groups.find((group) => group.id === item.groupId)?.name : ''].filter(Boolean).join(' · '))}</p></div><span class="type-badge">${typeLabels[item.type]}</span></li>`).join('');
  $('#timeline-empty').hidden = items.length > 0;
  $('#summary-days').textContent = dates.length;
  $('#summary-items').textContent = trip.items.length;
  $('#summary-groups').textContent = trip.groups.length;
  const totals = expenseTotals(trip.items);
  $('#summary-cost').textContent = Object.keys(totals).length ? Object.entries(totals).map(([currency, minor]) => `${currency} ${(minor / 100).toLocaleString('zh-TW')}`).join(' / ') : '—';
  $('#group-list').innerHTML = trip.groups.map((group) => `<li>${escapeHtml(group.name)}</li>`).join('');
  $('#group-empty').hidden = trip.groups.length > 0;
  const groupSelect = $('#item-form select[name="groupId"]');
  groupSelect.innerHTML = '<option value="">所有人</option>' + trip.groups.map((group) => `<option value="${group.id}">${escapeHtml(group.name)}</option>`).join('');
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

$('#export-button').addEventListener('click', () => {
  const backup = { schemaVersion:1, exportedAt:new Date().toISOString(), trips:state.trips };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type:'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob); link.download = `travel-os-backup-${new Date().toISOString().slice(0,10)}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});
$('#import-button').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  if (file.size > 5_000_000) { showToast('備份檔案不可超過 5 MB。'); return; }
  try {
    const backup = validateBackup(JSON.parse(await file.text()));
    await store.replaceAll(backup.trips); state.trips = backup.trips; state.currentTripId = state.trips[0]?.id || ''; state.selectedDate = ''; render(); showToast(`已還原 ${backup.trips.length} 趟旅程。`);
  } catch (error) { showToast(error instanceof ValidationError ? error.message : '備份檔案無法解析。'); }
  event.target.value = '';
});

for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });

async function start() {
  document.documentElement.dataset.theme = localStorage.getItem('travel-os:theme') || 'light';
  await store.connect(); state.trips = await store.listTrips(); state.trips.sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)); state.currentTripId = state.trips[0]?.id || ''; render();
}

start().catch(() => { $('#save-status').textContent = '儲存空間無法使用'; showToast('無法開啟本機儲存空間，請檢查瀏覽器設定。'); });
