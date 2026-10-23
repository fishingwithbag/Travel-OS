import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {dailyTravelLegs,estimateTravel} from '../src/providers/google-routes.js';
import {placeIdMapUrl} from '../src/providers/google-places.js';
const {compute,load}=vi.hoisted(()=>({compute:vi.fn(),load:vi.fn()}));
vi.mock('../src/providers/google-loader.js',()=>({loadGoogleLibrary:load}));
class Place {constructor(value){Object.assign(this,value);}}
beforeEach(()=>{vi.useFakeTimers();compute.mockReset();load.mockReset().mockImplementation(async()=>({Route:{computeRoutes:compute},Place}));});
afterEach(()=>vi.useRealTimers());
const stop=(id,time,groupId='',type='place')=>({id,title:id,date:'2027-01-01',startTime:time,groupId,type});
it('separates groups while retaining shared stops, and never bridges flights',()=>{
  const trip={groups:[{id:'a',name:'A'},{id:'b',name:'B'}],items:[stop('shared','08:00'),stop('a','09:00','a'),stop('b','10:00','b'),stop('end','11:00'),stop('flight','12:00','','flight'),stop('after','13:00')]};
  const legs=dailyTravelLegs(trip,'2027-01-01');
  expect(legs.map(l=>[l.group,l.from.id,l.to.id])).toEqual([['A','shared','a'],['A','a','end'],['B','shared','b'],['B','b','end']]);
  expect(dailyTravelLegs({...trip,groups:[],items:[stop('one','08:00')]},'2027-01-01')).toEqual([]);
});
it('requests minimal nontraffic fields using Place IDs, without fetching Place details',async()=>{
  compute.mockResolvedValue({routes:[{distanceMeters:1200,durationMillis:61000,warnings:['道路施工']}]});
  expect(await estimateTravel('synthetic',{title:'a',mapsUrl:placeIdMapUrl('a')},{title:'b'})).toEqual({distanceMeters:1200,minutes:2,warnings:['道路施工']});
  expect(compute).toHaveBeenCalledWith({origin:new Place({id:'a'}),destination:'b',travelMode:'DRIVING',routingPreference:'TRAFFIC_UNAWARE',fields:['distanceMeters','durationMillis','warnings']});
});
it('omits driving-only routing preference for walking and accepts zero duration',async()=>{
  compute.mockResolvedValue({routes:[{distanceMeters:0,durationMillis:0}]});
  expect((await estimateTravel('synthetic',{location:'A'},{title:'B'},'walking')).minutes).toBe(0);
  expect(compute.mock.calls[0][0]).not.toHaveProperty('routingPreference');
});
it('rejects unsupported modes without loading any SDK',async()=>{
  await expect(estimateTravel('synthetic',{},{} ,'transit')).rejects.toThrow(/手動/);expect(load).not.toHaveBeenCalled();
});
it('reports no routes and malformed responses without false success',async()=>{
  for(const routes of [[],[{distanceMeters:1,durationMillis:Infinity}],[{distanceMeters:-1,durationMillis:2}]]) {
    compute.mockResolvedValue({routes});await expect(estimateTravel('synthetic',{title:'A'},{title:'B'})).rejects.toThrow();
  }
});
it('sanitizes errors and bounds a hung route request',async()=>{
  compute.mockRejectedValueOnce(new Error('secret-debug-message'));
  await expect(estimateTravel('synthetic',{title:'A'},{title:'B'})).rejects.not.toThrow('secret-debug-message');
  compute.mockImplementation(()=>new Promise(()=>{}));
  const promise=estimateTravel('synthetic',{title:'A'},{title:'B'});const assertion=expect(promise).rejects.toThrow(/逾時/);
  await vi.advanceTimersByTimeAsync(20000);await assertion;
});
