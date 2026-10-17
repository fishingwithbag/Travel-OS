import { describe, expect, it } from 'vitest';
import { itemMapUrl, mapSearchUrl, parkingMapUrl, routeMapUrl, dayRouteSections } from '../src/providers/maps.js';

describe('Google Maps external navigation', () => {
  it('uses an exact destination link and keeps parking navigation separate', () => {
    const item = { title:'Sample museum', location:'Sample City', mapsUrl:'https://maps.app.goo.gl/destination' };
    expect(itemMapUrl(item)).toBe('https://maps.app.goo.gl/destination');
    expect(parkingMapUrl({ name:'Sample garage' })).toBe(mapSearchUrl('Sample garage'));
    expect(itemMapUrl({ title:'Sample museum', location:'' })).toBe(mapSearchUrl('Sample museum'));
  });
  it('builds a keyless Maps URL with encoded input', () => {
    expect(mapSearchUrl('City Hall & Park')).toBe('https://www.google.com/maps/search/?api=1&query=City%20Hall%20%26%20Park');
  });
  it('rejects an empty navigation query', () => {
    expect(() => mapSearchUrl('   ')).toThrow(/地點/);
  });
  it('opens encoded driving and walking directions without a key', () => {
    const origin = { title:'A & B' }, destination = { location:'City Hall', title:'Hall' };
    const url = new URL(routeMapUrl(origin, destination, 'walking'));
    expect(url.searchParams.get('origin')).toBe('A & B');
    expect(url.searchParams.get('destination')).toBe('City Hall');
    expect(url.searchParams.get('travelmode')).toBe('walking');
    expect(new URL(routeMapUrl(origin, destination)).searchParams.get('travelmode')).toBe('driving');
    expect(url.searchParams.has('key')).toBe(false);
    expect(() => routeMapUrl(origin, destination, 'invalid')).toThrow();
  });
});

describe('daily group routes', () => {
  const stop = (title, startTime, groupId = '') => ({ title, startTime, groupId, type:'place' });
  it('includes shared stops without mixing groups and keeps return visits', () => {
    const items = [stop('Hotel','18:00'), stop('B only','10:00','b'), stop('Hotel','08:00'), stop('A only','09:00','a')];
    const routes = dayRouteSections(items, [{id:'a',name:'Team A'}, {id:'b',name:'Team B'}]);
    expect(routes[0].segments[0].titles).toEqual(['Hotel','A only','Hotel']);
    expect(routes[1].segments[0].titles).toEqual(['Hotel','B only','Hotel']);
    expect(new URL(routes[0].segments[0].url).searchParams.get('waypoints')).toBe('A only');
    expect(items[0].startTime).toBe('18:00');
  });
  it('splits long routes without dropping a stop or exceeding mobile waypoint limits', () => {
    const items = Array.from({length:11}, (_, i) => stop(`Stop ${i}`, `${String(i).padStart(2,'0')}:00`));
    const segments = dayRouteSections(items)[0].segments;
    expect(segments.map(s => s.titles.length)).toEqual([5,5,3]);
    expect(segments.flatMap((s,i) => i ? s.titles.slice(1) : s.titles)).toEqual(items.map(i=>i.title));
    for (const s of segments) {
      expect(new URL(s.url).searchParams.get('waypoints').split('|').length).toBeLessThanOrEqual(3);
      expect(s.url.length).toBeLessThanOrEqual(2048);
    }
  });
  it('handles zero stops, one stop, and an empty group without creating fake directions', () => {
    expect(dayRouteSections([])[0].segments).toEqual([]);
    expect(dayRouteSections([stop('Museum','09:00')])[0].segments[0].url).toBe(mapSearchUrl('Museum'));
    expect(dayRouteSections([{...stop('Flight','09:00'),type:'flight'}])[0].segments).toEqual([]);
    expect(dayRouteSections([stop('A','09:00','a')],[{id:'b',name:'B'}])[0].segments).toEqual([]);
  });
  it('never generates an overlong URL or silently drops unrouteable stops', () => {
    const items = [stop('館'.repeat(200),'08:00'),stop('站'.repeat(200),'09:00'),stop('Park','10:00')];
    const segments = dayRouteSections(items)[0].segments;
    expect(segments[0].url).toBe('');
    expect(segments[0].titles).toEqual(items.slice(0,2).map(i=>i.title));
    expect(segments[1].titles.at(-1)).toBe('Park');
    expect(segments.every(s=>s.url.length<=2048)).toBe(true);
  });
});
