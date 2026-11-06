import {loadGoogleLibrary} from './google-loader.js';
import {savedPlaceId} from './maps.js';
import {ValidationError} from '../domain/trip.js';

export function dailyTravelLegs(trip,date) {
  const sorted=trip.items.filter(item=>item.date===date).slice().sort((a,b)=>(a.startTime || '99:99').localeCompare(b.startTime || '99:99'));
  return (trip.groups.length ? trip.groups : [{id:'',name:'所有人'}]).flatMap(group=>{
    const lane=sorted.filter(item=>!item.groupId || item.groupId===group.id);
    return lane.slice(0,-1).flatMap((from,i)=>{
      const to=lane[i+1];
      if([from,to].some(item=>['flight','transport'].includes(item.type))) return [];
      return [{id:JSON.stringify([group.id,from.id,to.id]),group:group.name,from,to,mode:from.transitMode || 'driving'}];
    });
  });
}
export async function estimateTravel(key,from,to,mode='driving') {
  if(!['driving','walking'].includes(mode)) throw new ValidationError('此交通方式請使用手動時間或外部導航。');
  let Route,Place;
  try{[{Route},{Place}]=await Promise.all([loadGoogleLibrary(key,'routes'),loadGoogleLibrary(key,'places')]);}
  catch(error){error.stopBatch=true;throw error;}
  const endpoint=item=>{const id=savedPlaceId(item);if(id) return new Place({id});const text=(item.location || item.title || '').trim();if(!text) throw new ValidationError('請先填寫起點與目的地。');return text;};
  const request={origin:endpoint(from),destination:endpoint(to),travelMode:mode.toUpperCase(),fields:['distanceMeters','durationMillis','warnings']};
  if(mode==='driving') request.routingPreference='TRAFFIC_UNAWARE';
  let timer;
  try{
    const response=await Promise.race([Route.computeRoutes(request),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),20000);})]);
    const route=response.routes?.[0];
    if(!route) throw new ValidationError('找不到可用路線，請確認地址或改用手動時間。');
    if(!Number.isFinite(route.distanceMeters)||route.distanceMeters<0||!Number.isFinite(route.durationMillis)||route.durationMillis<0) throw new ValidationError('路線資料不完整，請重新估算或使用手動時間。');
    return {distanceMeters:route.distanceMeters,minutes:Math.ceil(route.durationMillis/60000),warnings:(route.warnings || []).map(String)};
  }catch(error){if(error instanceof ValidationError) throw error;const failure=new ValidationError('路程估算失敗或逾時。請檢查 Routes API、Key 限制、網路與額度；手動行程未變更。');failure.stopBatch=true;throw failure;}
  finally{clearTimeout(timer);}
}
