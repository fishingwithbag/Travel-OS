import { ValidationError } from '../domain/trip.js';

export function mapSearchUrl(query) {
  const value = String(query || '').trim();
  if (!value) throw new ValidationError('需要地點名稱或地址。');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
}

export function itemMapUrl(item) {
  return item.mapsUrl || mapSearchUrl(item.location || item.title);
}

export function parkingMapUrl(spot) {
  if (!spot?.name) return '';
  return spot.mapsUrl || mapSearchUrl(spot.name);
}

function savedPlaceId(item) {
  try {
    const url=new URL(item.mapsUrl);
    const id=url.searchParams.get('query_place_id');
    return url.protocol==='https:' && ['www.google.com','google.com'].includes(url.hostname) && url.pathname.startsWith('/maps/') && /^[A-Za-z0-9_-]{1,256}$/.test(id || '') ? id : '';
  } catch {return '';}
}

export function routeMapUrl(origin, destination, mode = 'driving') {
  if (!['driving', 'walking'].includes(mode)) throw new ValidationError('不支援的路線模式。');
  const from = String(origin.location || origin.title || '').trim();
  const to = String(destination.location || destination.title || '').trim();
  if (!from || !to) throw new ValidationError('路線需要起點與目的地。');
  let url=`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=${mode}`;
  for(const [name,item] of [['origin',origin],['destination',destination]]) {const id=savedPlaceId(item);if(id) url+=`&${name}_place_id=${encodeURIComponent(id)}`;}
  return url;
}

// Maps URLs supports only three intermediate stops in mobile browsers.
// Keep the connecting stop in both segments and preserve return visits.
export function dayRouteSections(items, groups = []) {
  const sorted = items.filter((item) => !['flight', 'transport'].includes(item.type))
    .slice().sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));
  const lanes = groups.length ? groups : [{ id:'', name:'所有人' }];
  return lanes.map((group) => {
    const stops = sorted.filter((item) => !item.groupId || item.groupId === group.id);
    const segments = [];
    let start = 0;
    while (start < stops.length) {
      if (start === stops.length - 1) {
        if (!segments.length) segments.push({ url:itemMapUrl(stops[start]), titles:[stops[start].title] });
        break;
      }
      let end = Math.min(start + 4, stops.length - 1);
      let url;
      do {
        url = routeMapUrl(stops[start], stops[end]);
        const middle = stops.slice(start + 1, end).map((item) => item.location || item.title);
        if (middle.length) url += `&waypoints=${encodeURIComponent(middle.join('|'))}`;
        const ids=stops.slice(start+1,end).map(savedPlaceId);
        if(ids.length && ids.every(Boolean)) url+=`&waypoint_place_ids=${encodeURIComponent(ids.join('|'))}`;
        if (url.length <= 2048 || end === start + 1) break;
        end--;
      } while (end > start);
      segments.push({ url:url.length <= 2048 ? url : '', titles:stops.slice(start, end + 1).map((item) => item.title) });
      start = end;
    }
    return { groupId:group.id, name:group.name, segments };
  });
}
