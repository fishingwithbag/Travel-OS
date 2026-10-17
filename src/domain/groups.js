import {addGroup,validateTrip,ValidationError} from './trip.js';

function requireGroup(trip,id) {
  if(!trip.groups.some(group=>group.id===id)) throw new ValidationError('群組已不存在，請重新開啟。');
}

export function groupImpact(trip,id) {
  requireGroup(trip,id);
  return Object.fromEntries(['items','rentals','stays','expenses'].map(key=>[key,(trip[key] || []).filter(entry=>entry.groupId===id).length]).concat([
    ['parking',trip.items.filter(item=>Object.hasOwn(item.parking?.byGroup || {},id)).length],
  ]));
}

export function renameGroup(trip,id,name) {
  requireGroup(trip,id);
  const renamed=addGroup({...trip,groups:trip.groups.filter(group=>group.id!==id)},name,id);
  return validateTrip({...trip,groups:trip.groups.map(group=>group.id===id ? renamed : group)});
}

const hasParking=set=>Boolean(set && (set.notes || [set.primary,set.backup].some(spot=>spot && (spot.name || spot.mapsUrl || spot.note || spot.walkMinutes!=null || spot.feeMinor!=null))));

export function removeGroup(trip,id,targetId) {
  requireGroup(trip,id);
  if(typeof targetId!=='string' || targetId===id) throw new ValidationError('請選擇資料移轉對象。');
  if(targetId) requireGroup(trip,targetId);
  const copy=structuredClone(trip);
  copy.groups=copy.groups.filter(group=>group.id!==id);
  for(const key of ['items','rentals','stays','expenses']) {
    for(const entry of copy[key] || []) if(entry.groupId===id) entry.groupId=targetId;
  }
  for(const item of copy.items) {
    const parking=item.parking;
    if(!parking) continue;
    const source=parking.byGroup?.[id];
    if(hasParking(source)) {
      if(!targetId && Object.entries(parking.byGroup).some(([key,set])=>key!==id && hasParking(set))) throw new ValidationError(`「${item.title}」還有其他群組的停車資訊，請移轉到另一群組，或先整理為共用停車後再刪除。`);
      const destination=targetId ? parking.byGroup?.[targetId] : parking;
      if(hasParking(destination)) throw new ValidationError(`「${item.title}」的目標已有停車資料，請先在安排內整理兩組停車資訊，再刪除群組；目前未變更任何資料。`);
      if(targetId) parking.byGroup[targetId]=source;
      else Object.assign(parking,source);
    }
    if(parking.byGroup) {
      delete parking.byGroup[id];
      if(!Object.keys(parking.byGroup).length) delete parking.byGroup;
    }
    // Shared parking remains available when split parking is no longer applicable.
    if(!copy.groups.length || (!targetId && source && !parking.byGroup)) parking.mode='shared';
  }
  return validateTrip(copy);
}
