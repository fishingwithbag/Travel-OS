const wallMinute = (date, time) => Date.parse(`${date}T${time}:00Z`) / 60000;
const formatterCache = new Map();

function formatter(timeZone) {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(timeZone,new Intl.DateTimeFormat('en-CA',{
      timeZone,calendar:'iso8601',numberingSystem:'latn',hourCycle:'h23',
      year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',
    }));
  }
  return formatterCache.get(timeZone);
}

function zonedParts(timestamp,timeZone) {
  return Object.fromEntries(formatter(timeZone).formatToParts(new Date(timestamp))
    .filter(part=>part.type!=='literal').map(part=>[part.type,Number(part.value)]));
}

function offsetMinutes(timestamp,timeZone) {
  const parts=zonedParts(timestamp,timeZone);
  return (Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second)-timestamp)/60000;
}

function zonedCandidates(date,time,timeZone) {
  const [year,month,day]=date.split('-').map(Number);
  const [hour,minute]=time.split(':').map(Number);
  const localTimestamp=Date.UTC(year,month-1,day,hour,minute);
  const offsets=new Set([-36,-12,0,12,36].map(hours=>offsetMinutes(localTimestamp+hours*3600000,timeZone)));
  const matches=[];
  for(const offset of offsets) {
    const timestamp=localTimestamp-offset*60000;
    const parts=zonedParts(timestamp,timeZone);
    if(parts.year===year && parts.month===month && parts.day===day && parts.hour===hour && parts.minute===minute) matches.push(timestamp/60000);
  }
  return [...new Set(matches)].sort((a,b)=>a-b);
}

function timelineMinute(date,time,timeZone) {
  const candidates=zonedCandidates(date,time,timeZone);
  return candidates.length===1 ? candidates[0] : wallMinute(date,time);
}

export function durationDetails(item,timeZone='UTC') {
  if (item.type === 'flight' || !item.startTime || !item.endTime) return null;
  const endDate=item.endDate || item.date;
  const wallMinutes=wallMinute(endDate,item.endTime)-wallMinute(item.date,item.startTime);
  const starts=zonedCandidates(item.date,item.startTime,timeZone);
  const ends=zonedCandidates(endDate,item.endTime,timeZone);
  if(starts.length!==1 || ends.length!==1) {
    const missing=starts.length===0 || ends.length===0;
    return {minutes:wallMinutes,wallMinutes,adjusted:false,issue:missing ? '此時間在旅程時區不存在（夏令時間切換）' : '此時間在旅程時區重複，實際時長無法唯一判定'};
  }
  const minutes=ends[0]-starts[0];
  return {minutes,wallMinutes,adjusted:minutes!==wallMinutes,issue:''};
}

export function durationMinutes(item,timeZone='UTC') {
  return durationDetails(item,timeZone)?.minutes ?? null;
}

export function itemsForGroup(items,groupId='all') {
  return groupId==='all' ? [...items] : items.filter(item=>!item.groupId || item.groupId===groupId);
}

export function parkingSetsForGroup(item,groups,groupId='all') {
  if(!item.parking) return [];
  if(item.parking.mode!=='split') return [{name:'共用停車',set:item.parking}];
  return groups.filter(group=>(!item.groupId || group.id===item.groupId) && (groupId==='all' || group.id===groupId))
    .map(group=>({name:group.name,set:item.parking.byGroup?.[group.id]})).filter(({set})=>set);
}

export function scheduleWarnings(items, groups, timeZone='UTC') {
  const warnings = new Map();
  for (const group of groups.length ? groups : [{id:'', name:'所有人'}]) {
    const timeline = items.filter(item => item.type !== 'flight' && item.startTime && (!item.groupId || item.groupId === group.id))
      .slice().sort((a,b) => timelineMinute(a.date,a.startTime,timeZone) - timelineMinute(b.date,b.startTime,timeZone));
    let longest = null;
    let latestEnd = -Infinity;
    for (let index = 0; index < timeline.length; index++) {
      const current = timeline[index];
      const start = timelineMinute(current.date,current.startTime,timeZone);
      const previous = timeline[index-1];
      const transit = previous?.endTime && previous.type !== 'transport' && current.type !== 'transport' ? previous.transitMinutes || 0 : 0;
      const previousReady = previous?.endTime ? timelineMinute(previous.endDate || previous.date,previous.endTime,timeZone) + transit : -Infinity;
      const ready = Math.max(latestEnd,previousReady);
      const before = previousReady >= latestEnd ? previous : longest;
      if (ready > start) {
        const message = `${group.name}：與「${before.title}」時間衝突，至少需延後 ${ready-start} 分鐘${before === previous && transit ? '（含手動交通時間）' : ''}。`;
        warnings.set(current.id, [...(warnings.get(current.id) || []), message]);
      }
      const end = current.endTime ? timelineMinute(current.endDate || current.date,current.endTime,timeZone) : -Infinity;
      // Preserve a long earlier interval even if a shorter overlapping visit follows it.
      if (end > latestEnd) { latestEnd = end; longest = current; }
    }
  }
  return warnings;
}
