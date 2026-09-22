export const SCHEMA_VERSION = 1;

export class ValidationError extends Error {
  constructor(message, field = '') {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const isoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const clockTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

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

function cleanOptional(value, max, field) {
  const text = String(value ?? '').trim();
  if (text.length > max) throw new ValidationError(`${field}格式不正確。`, field);
  return text;
}

function validTimeZone(value, field) {
  const timeZone = clean(value, 64, field);
  try { new Intl.DateTimeFormat('zh-TW', { timeZone }).format(); }
  catch { throw new ValidationError(`請輸入有效的 IANA ${field}。`, field); }
  return timeZone;
}

function uniqueIds(entries, label) {
  const ids = new Set();
  for (const entry of entries) {
    if (ids.has(entry.id)) throw new ValidationError(`${label}包含重複 ID。`, 'id');
    ids.add(entry.id);
  }
  return ids;
}

export function createTrip(input, id = crypto.randomUUID()) {
  const title = clean(input.title, 80, '旅程名稱');
  const destination = clean(input.destination, 120, '目的地');
  const dates = tripDates(input.startDate, input.endDate);
  const currency = clean(input.currency || 'TWD', 3, '幣別').toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new ValidationError('幣別請使用三碼代號。', 'currency');
  const timeZone = validTimeZone(input.timeZone || 'UTC', '時區');
  const now = new Date().toISOString();
  return { schemaVersion: SCHEMA_VERSION, id, title, destination, startDate: dates[0], endDate: dates.at(-1), timeZone, currency, groups: [], items: [], createdAt: now, updatedAt: now, revision: 1 };
}

export function createItem(input, trip, id = crypto.randomUUID(), options = {}) {
  if (!tripDates(trip.startDate, trip.endDate).includes(input.date)) throw new ValidationError('日期不在旅程範圍內。', 'date');
  const allowedTypes = new Set(['place', 'meal', 'stay', 'flight', 'transport', 'other']);
  if (!allowedTypes.has(input.type)) throw new ValidationError('行程類型不支援。', 'type');
  const currency = String(input.currency || trip.currency).trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new ValidationError('幣別請使用三碼代號。', 'currency');
  const amount = input.amount === '' || input.amount == null ? null : Number(input.amount);
  if (amount != null && (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000)) throw new ValidationError('費用金額不正確。', 'amount');
  const startTime = cleanOptional(input.startTime, 5, '開始時間');
  if (startTime && !clockTime.test(startTime)) throw new ValidationError('開始時間格式不正確。', 'startTime');
  const groupId = cleanOptional(input.groupId, 100, '群組 ID');
  if (groupId && !trip.groups.some((group) => group.id === groupId)) throw new ValidationError('行程包含不存在的群組。', 'groupId');
  const item = {
    id, date: input.date, type: input.type, title: clean(input.title, 100, '名稱'),
    startTime, location: cleanOptional(input.location, 200, '地址／位置'),
    notes: cleanOptional(input.notes, 1000, '備註'), groupId,
    amountMinor: amount == null ? null : Math.round(amount * 100), currency,
  };
  if (input.type === 'flight') {
    const departureTimeZone = cleanOptional(input.departureTimeZone, 64, '出發時區');
    const arrivalTimeZone = cleanOptional(input.arrivalTimeZone, 64, '抵達時區');
    if (!options.allowLegacyFlightTimeZones && departureTimeZone) validTimeZone(departureTimeZone, '出發時區');
    if (!options.allowLegacyFlightTimeZones && arrivalTimeZone) validTimeZone(arrivalTimeZone, '抵達時區');
    const arrivalDateTime = cleanOptional(input.arrivalDateTime, 32, '抵達日期與時間');
    if (arrivalDateTime && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(arrivalDateTime)) throw new ValidationError('抵達日期與時間格式不正確。', 'arrivalDateTime');
    item.flight = {
      origin: cleanOptional(input.origin, 12, '出發機場').toUpperCase(),
      destination: cleanOptional(input.destination, 12, '抵達機場').toUpperCase(),
      departureTimeZone,
      arrivalTimeZone,
      arrivalDateTime,
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

export function validateTrip(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.schemaVersion !== SCHEMA_VERSION) throw new ValidationError('旅程資料版本不支援。');
  if (!Array.isArray(value.items) || !Array.isArray(value.groups)) throw new ValidationError('旅程資料結構不完整。');
  if (value.items.length > 10_000) throw new ValidationError('單一旅程的項目數量超過上限。');
  if (value.groups.length > 1_000) throw new ValidationError('單一旅程的群組數量超過上限。');
  const id = clean(value.id, 100, '旅程 ID');
  const normalized = createTrip(value, id);
  const groups = value.groups.map((group) => ({ id:clean(group?.id,100,'群組 ID'), name:clean(group?.name,50,'群組名稱') }));
  uniqueIds(groups, '群組');
  const base = { ...normalized, groups };
  const items = value.items.map((item) => {
    const amountMinor = item?.amountMinor;
    if (amountMinor != null && (!Number.isSafeInteger(Number(amountMinor)) || Number(amountMinor) < 0 || Number(amountMinor) > 100_000_000_000)) throw new ValidationError('費用金額不正確。', 'amountMinor');
    return createItem({
      ...item,
      amount:amountMinor == null ? '' : Number(amountMinor) / 100,
      origin:item.flight?.origin,
      destination:item.flight?.destination,
      departureTimeZone:item.flight?.departureTimeZone,
      arrivalTimeZone:item.flight?.arrivalTimeZone,
      arrivalDateTime:item.flight?.arrivalDateTime,
    }, base, clean(item?.id,100,'行程 ID'), { allowLegacyFlightTimeZones:true });
  });
  uniqueIds(items, '行程');
  const revision = Number(value.revision);
  if (!Number.isSafeInteger(revision) || revision < 1) throw new ValidationError('旅程版本號不正確。', 'revision');
  const createdAt = String(value.createdAt || '');
  const updatedAt = String(value.updatedAt || '');
  if (!isoDateTime.test(createdAt) || !isoDateTime.test(updatedAt) || !Number.isFinite(Date.parse(createdAt)) || !Number.isFinite(Date.parse(updatedAt)) || Date.parse(updatedAt) < Date.parse(createdAt)) throw new ValidationError('旅程時間戳記格式不正確。');
  return { ...base, items, createdAt, updatedAt, revision };
}

export function validateBackup(value) {
  if (!value || typeof value !== 'object' || value.schemaVersion !== SCHEMA_VERSION || !Array.isArray(value.trips)) throw new ValidationError('這不是支援的 Travel OS 備份。');
  if (value.trips.length > 100) throw new ValidationError('備份內的旅程數量超過上限。');
  const trips = value.trips.map(validateTrip);
  uniqueIds(trips, '旅程');
  return { schemaVersion:SCHEMA_VERSION, exportedAt:String(value.exportedAt || ''), mode:value.mode === 'share' ? 'share' : 'private', trips };
}

export function createBackup(trips, mode = 'private') {
  const privateCopy = structuredClone(trips);
  const exportTrips = mode === 'share' ? privateCopy.map((trip) => ({
    ...trip,
    groups:[],
    items:trip.items.map(({ notes, groupId, amountMinor, currency, ...item }) => ({ ...item, notes:'', groupId:'', amountMinor:null, currency:trip.currency })),
  })) : privateCopy;
  return { schemaVersion:SCHEMA_VERSION, exportedAt:new Date().toISOString(), mode:mode === 'share' ? 'share' : 'private', trips:exportTrips };
}
