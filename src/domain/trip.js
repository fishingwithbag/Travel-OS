export const SCHEMA_VERSION = 1;

export class ValidationError extends Error {
  constructor(message, field = '') {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export function isRealDate(value) {
  if (!isoDate.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function tripDates(startDate, endDate) {
  if (!isRealDate(startDate) || !isRealDate(endDate) || startDate > endDate) {
    throw new ValidationError('請選擇有效且依序排列的旅程日期。', 'startDate');
  }
  const dates = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  if (dates.length > 180) throw new ValidationError('單一旅程最多支援 180 天。', 'endDate');
  return dates;
}

function clean(value, max, field) {
  const text = String(value ?? '').trim();
  if (!text || text.length > max) throw new ValidationError(`${field}格式不正確。`, field);
  return text;
}

export function createTrip(input, id = crypto.randomUUID()) {
  const title = clean(input.title, 80, '旅程名稱');
  const destination = clean(input.destination, 120, '目的地');
  const dates = tripDates(input.startDate, input.endDate);
  const currency = clean(input.currency || 'TWD', 3, '幣別').toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new ValidationError('幣別請使用三碼代號。', 'currency');
  const timeZone = clean(input.timeZone || 'UTC', 64, '時區');
  try { new Intl.DateTimeFormat('zh-TW', { timeZone }).format(); } catch { throw new ValidationError('請輸入有效的 IANA 時區。', 'timeZone'); }
  const now = new Date().toISOString();
  return { schemaVersion: SCHEMA_VERSION, id, title, destination, startDate: dates[0], endDate: dates.at(-1), timeZone, currency, groups: [], items: [], createdAt: now, updatedAt: now, revision: 1 };
}

export function createItem(input, trip, id = crypto.randomUUID()) {
  if (!tripDates(trip.startDate, trip.endDate).includes(input.date)) throw new ValidationError('日期不在旅程範圍內。', 'date');
  const allowedTypes = new Set(['place', 'meal', 'stay', 'flight', 'transport', 'other']);
  if (!allowedTypes.has(input.type)) throw new ValidationError('行程類型不支援。', 'type');
  const currency = String(input.currency || trip.currency).trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new ValidationError('幣別請使用三碼代號。', 'currency');
  const amount = input.amount === '' || input.amount == null ? null : Number(input.amount);
  if (amount != null && (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000)) throw new ValidationError('費用金額不正確。', 'amount');
  const item = {
    id, date: input.date, type: input.type, title: clean(input.title, 100, '名稱'),
    startTime: String(input.startTime || ''), location: String(input.location || '').trim().slice(0, 200),
    notes: String(input.notes || '').trim().slice(0, 1000), groupId: String(input.groupId || ''),
    amountMinor: amount == null ? null : Math.round(amount * 100), currency,
  };
  if (input.type === 'flight') {
    item.flight = {
      origin: String(input.origin || '').trim().toUpperCase().slice(0, 12),
      destination: String(input.destination || '').trim().toUpperCase().slice(0, 12),
      departureTimeZone: String(input.departureTimeZone || '').trim().slice(0, 64),
      arrivalTimeZone: String(input.arrivalTimeZone || '').trim().slice(0, 64),
      arrivalDateTime: String(input.arrivalDateTime || ''),
    };
  }
  return item;
}

export function addGroup(trip, name, id = crypto.randomUUID()) {
  const normalized = clean(name, 50, '群組名稱');
  if (trip.groups.some((group) => group.name.toLocaleLowerCase() === normalized.toLocaleLowerCase())) throw new ValidationError('已經有同名群組。', 'name');
  return { id, name: normalized };
}

export function expenseTotals(items) {
  return items.reduce((totals, item) => {
    if (item.amountMinor != null) totals[item.currency] = (totals[item.currency] || 0) + item.amountMinor;
    return totals;
  }, {});
}

export function touchTrip(trip) {
  return { ...trip, revision: Number(trip.revision || 0) + 1, updatedAt: new Date().toISOString() };
}

export function validateBackup(value) {
  if (!value || typeof value !== 'object' || value.schemaVersion !== SCHEMA_VERSION || !Array.isArray(value.trips)) throw new ValidationError('這不是支援的 Travel OS 備份。');
  if (value.trips.length > 100) throw new ValidationError('備份內的旅程數量超過上限。');
  value.trips.forEach((trip) => {
    createTrip(trip, trip.id);
    if (!Array.isArray(trip.items) || !Array.isArray(trip.groups)) throw new ValidationError('旅程資料結構不完整。');
    if (trip.items.length > 10_000) throw new ValidationError('單一旅程的項目數量超過上限。');
  });
  return value;
}
