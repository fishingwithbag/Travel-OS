import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {mountPlaceSearch,placeIdMapUrl} from '../src/providers/google-places.js';
import {createPlace,placeItemInput} from '../src/domain/trip.js';
import {routeMapUrl,dayRouteSections} from '../src/providers/maps.js';
const {load}=vi.hoisted(()=>({load:vi.fn()}));
vi.mock('../src/providers/google-loader.js',()=>({loadGoogleLibrary:load}));
class Widget extends EventTarget {
  setAttribute() {}
  remove=vi.fn();
}
let host,callbacks,widget;
beforeEach(()=>{
  vi.useFakeTimers();load.mockReset().mockResolvedValue({PlaceAutocompleteElement:Widget});
  host={replaceChildren:vi.fn(value=>{widget=value;})};
  callbacks={onLoading:vi.fn(),onSelect:vi.fn(),onError:vi.fn()};
});
afterEach(()=>vi.useRealTimers());
function choose(place) {const event=new Event('gmp-select');event.placePrediction={toPlace:()=>place};widget.dispatchEvent(event);}
function place(id='sample-id',fetchFields=vi.fn().mockResolvedValue({})) {return {id,displayName:'Google preview name',formattedAddress:'Preview address',location:{lat:()=>35,lng:()=>139},attributions:[],fetchFields};}
const flush=()=>vi.advanceTimersByTimeAsync(0);

it('requests details only after selection and returns a nonpersistent preview plus an ID link',async()=>{
  await mountPlaceSearch(host,'synthetic-key',callbacks);
  expect(callbacks.onSelect).not.toHaveBeenCalled();
  const result=place();choose(result);await flush();
  expect(result.fetchFields).toHaveBeenCalledWith({fields:['displayName','formattedAddress','location','attributions']});
  expect(callbacks.onSelect).toHaveBeenCalledWith(expect.objectContaining({coordinates:'35, 139',mapsUrl:placeIdMapUrl('sample-id')}));
  const saved=createPlace({title:'My museum stop',mapsUrl:callbacks.onSelect.mock.calls[0][0].mapsUrl});
  expect(JSON.stringify(saved)).not.toMatch(/Google preview name|Preview address|35, 139/);
  expect(placeItemInput(saved,'2027-01-01').mapsUrl).toBe(saved.mapsUrl);
});
it('ignores older detail results after a newer selection',async()=>{
  let finish;await mountPlaceSearch(host,'synthetic-key',callbacks);
  choose(place('old',()=>new Promise(resolve=>{finish=resolve;})));
  choose(place('new'));await flush();finish();await flush();
  expect(callbacks.onSelect).toHaveBeenCalledTimes(1);
  expect(callbacks.onSelect.mock.calls[0][0].mapsUrl).toBe(placeIdMapUrl('new'));
});
it('disposes event listeners and ignores pending details when closed',async()=>{
  let finish;const cleanup=await mountPlaceSearch(host,'synthetic-key',callbacks);
  choose(place('old',()=>new Promise(resolve=>{finish=resolve;})));cleanup();finish();await flush();choose(place());
  expect(callbacks.onSelect).not.toHaveBeenCalled();expect(callbacks.onLoading).toHaveBeenCalledTimes(1);expect(widget.remove).toHaveBeenCalled();
});
it('never mounts an old search after the dialog closes while loading',async()=>{
  let finish;load.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  const controller=new AbortController();const pending=mountPlaceSearch(host,'synthetic-key',{...callbacks,signal:controller.signal});
  controller.abort();finish({PlaceAutocompleteElement:Widget});await pending;
  expect(host.replaceChildren).not.toHaveBeenCalled();
});
it('reports widget errors and invalidates pending selections',async()=>{
  let finish;await mountPlaceSearch(host,'synthetic-key',callbacks);
  choose(place('old',()=>new Promise(resolve=>{finish=resolve;})));
  widget.dispatchEvent(new Event('gmp-error'));finish();await flush();
  expect(callbacks.onSelect).not.toHaveBeenCalled();expect(callbacks.onError).toHaveBeenCalledTimes(1);
});
it('bounds details requests and suppresses unsafe service error text',async()=>{
  await mountPlaceSearch(host,'synthetic-key',callbacks);choose(place('slow',()=>new Promise(()=>{})));
  await vi.advanceTimersByTimeAsync(20000);
  expect(callbacks.onError).toHaveBeenCalledTimes(1);
  choose(place('bad',()=>Promise.reject(new Error('sensitive-service-detail'))));await flush();
  expect(callbacks.onError.mock.calls[1][0].message).not.toContain('sensitive-service-detail');
});
it('prevents search Enter from submitting the enclosing place form',async()=>{
  await mountPlaceSearch(host,'synthetic-key',callbacks);
  const event=new Event('keydown',{cancelable:true});event.key='Enter';widget.dispatchEvent(event);expect(event.defaultPrevented).toBe(true);
});
it('rejects unsafe place IDs and preserves pinned destinations in route URLs',()=>{
  for(const id of ['',null,'x&key=secret','x'.repeat(257)]) expect(()=>placeIdMapUrl(id)).toThrow();
  const stops=['a','b','c'].map((id,i)=>({title:`My ${id}`,mapsUrl:placeIdMapUrl(id),type:'place',startTime:`0${i}:00`}));
  const route=new URL(dayRouteSections(stops)[0].segments[0].url);
  expect(route.searchParams.get('origin_place_id')).toBe('a');expect(route.searchParams.get('destination_place_id')).toBe('c');expect(route.searchParams.get('waypoint_place_ids')).toBe('b');
  const untrusted=new URL(routeMapUrl({...stops[0],mapsUrl:'https://example.test/maps/?query_place_id=bad'},stops[1]));
  expect(untrusted.searchParams.has('origin_place_id')).toBe(false);
});
