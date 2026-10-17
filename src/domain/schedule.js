// Wall-clock planning in the trip's timezone; flights use their own timezone display.
const minute = (date, time) => Date.parse(`${date}T${time}:00Z`) / 60000;

export function durationMinutes(item) {
  if (item.type === 'flight' || !item.startTime || !item.endTime) return null;
  return minute(item.endDate || item.date, item.endTime) - minute(item.date, item.startTime);
}

export function scheduleWarnings(items, groups) {
  const warnings = new Map();
  for (const group of groups.length ? groups : [{id:'', name:'所有人'}]) {
    const timeline = items.filter(item => item.type !== 'flight' && item.startTime && (!item.groupId || item.groupId === group.id))
      .slice().sort((a,b) => minute(a.date,a.startTime) - minute(b.date,b.startTime));
    let longest = null;
    let latestEnd = -Infinity;
    for (let index = 0; index < timeline.length; index++) {
      const current = timeline[index];
      const start = minute(current.date,current.startTime);
      const previous = timeline[index-1];
      const transit = previous?.endTime && previous.type !== 'transport' && current.type !== 'transport' ? previous.transitMinutes || 0 : 0;
      const previousReady = previous?.endTime ? minute(previous.endDate || previous.date,previous.endTime) + transit : -Infinity;
      const ready = Math.max(latestEnd,previousReady);
      const before = previousReady >= latestEnd ? previous : longest;
      if (ready > start) {
        const message = `${group.name}：與「${before.title}」時間衝突，至少需延後 ${ready-start} 分鐘${before === previous && transit ? '（含手動交通時間）' : ''}。`;
        warnings.set(current.id, [...(warnings.get(current.id) || []), message]);
      }
      const end = current.endTime ? minute(current.endDate || current.date,current.endTime) : -Infinity;
      // Preserve a long earlier interval even if a shorter overlapping visit follows it.
      if (end > latestEnd) { latestEnd = end; longest = current; }
    }
  }
  return warnings;
}
