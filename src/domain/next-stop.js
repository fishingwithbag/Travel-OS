export function nextStop(items, selectedDate, timeZone, now = new Date()) {
  if (!items.length) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', hour12:false, hourCycle:'h23',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const today = `${values.year}-${values.month}-${values.day}`;
  if (today !== selectedDate) return items[0];
  const clock = `${values.hour}:${values.minute}`;
  return items.find((item) => item.startTime && item.startTime >= clock)
    || items.find((item) => !item.startTime)
    || null;
}
