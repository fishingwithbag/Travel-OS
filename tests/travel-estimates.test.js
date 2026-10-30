import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({legs:[],key:'synthetic-key',estimate:vi.fn()}));
vi.mock('../src/providers/google-routes.js',()=>({dailyTravelLegs:()=>mocks.legs,estimateTravel:mocks.estimate}));
vi.mock('../src/config/google-settings.js',()=>({googleKey:()=>mocks.key,googleSettingsChanged:new EventTarget()}));
import {setupTravelEstimates} from '../src/ui/travel-estimates.js';
let nodes,trip,date,ui;
const leg=(id,extra={})=>({id,group:'共用',from:{title:`起點${id}`,...extra},to:{title:'終點'},mode:'driving'});
beforeEach(()=>{
  mocks.key='synthetic-key';mocks.legs=[];mocks.estimate.mockReset().mockResolvedValue({distanceMeters:1000,minutes:5,warnings:[]});
  nodes=new Map();for(const selector of ['[data-travel-list]','[role="status"]','[data-travel-calculate]','[data-travel-reset]']) nodes.set(selector,{textContent:'',innerHTML:'',addEventListener:(_,fn)=>nodes.get(selector).click=fn});
  vi.stubGlobal('document',{querySelector:()=>({querySelector:s=>nodes.get(s)})});
  trip={id:'trip-a',revision:1};date='2026-12-31';ui=setupTravelEstimates({currentTrip:()=>trip,selectedDate:()=>date,escapeHtml:s=>String(s).replaceAll('<','&lt;')});
});
afterEach(()=>vi.unstubAllGlobals());
const click=()=>nodes.get('[data-travel-calculate]').click();
const content=()=>nodes.get('[data-travel-list]').innerHTML;
it('keeps manual zero-minute times and deduplicates shared group routes',async()=>{
  mocks.legs=[leg('a',{transitMinutes:0}),leg('b'),{...leg('b'),id:'c',group:'小隊'}];ui.render();await click();
  expect(mocks.estimate).toHaveBeenCalledTimes(1);expect(content()).toContain('手動時間：0');expect(content().match(/5 分鐘/g)).toHaveLength(2);
});
it('limits batches to 20 and resumes only remaining routes',async()=>{
  mocks.legs=Array.from({length:23},(_,i)=>leg(String(i)));ui.render();await click();expect(mocks.estimate).toHaveBeenCalledTimes(20);
  await click();expect(mocks.estimate).toHaveBeenCalledTimes(23);await click();expect(mocks.estimate).toHaveBeenCalledTimes(23);
});
it('ignores stale results after project clear or trip revision changes',async()=>{
  let finish;mocks.estimate.mockImplementation(()=>new Promise(resolve=>finish=resolve));mocks.legs=[leg('a')];ui.render();const pending=click();
  ui.clear();trip={id:'trip-a',revision:2};ui.render();finish({distanceMeters:2000,minutes:99});await pending;expect(content()).not.toContain('99 分鐘');expect(nodes.get('[data-travel-calculate]').disabled).toBe(false);
});
it('stops additional requests on service failure and escapes untrusted messages',async()=>{
  mocks.legs=[leg('a'),leg('b')];mocks.estimate.mockRejectedValue(Object.assign(new Error('<script>'),{stopBatch:true}));ui.render();await click();
  expect(mocks.estimate).toHaveBeenCalledTimes(1);expect(content()).not.toContain('<script>');expect(nodes.get('[role="status"]').textContent).toContain('已停止');
});
it('does not request without a key and clears results on date changes',async()=>{
  mocks.legs=[leg('a')];mocks.key='';ui.render();await click();expect(mocks.estimate).not.toHaveBeenCalled();
  mocks.key='synthetic-key';ui.render();await click();expect(content()).toContain('5 分鐘');date='2027-01-01';ui.render();expect(content()).not.toContain('5 分鐘');
});
