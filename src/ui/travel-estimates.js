import {dailyTravelLegs,estimateTravel} from '../providers/google-routes.js';
import {googleKey,googleSettingsChanged} from '../config/google-settings.js';
import {ValidationError} from '../domain/trip.js';

export function setupTravelEstimates({currentTrip,selectedDate,escapeHtml}) {
  const panel=document.querySelector('#travel-estimates'),list=panel.querySelector('[data-travel-list]'),status=panel.querySelector('[role="status"]'),button=panel.querySelector('[data-travel-calculate]');
  let context='',generation=0,busy=false,legs=[],results=new Map();
  function render() {
    const trip=currentTrip(),next=JSON.stringify([trip?.id,trip?.revision,selectedDate(),googleKey()]);
    if(next!==context){context=next;generation++;busy=false;results.clear();status.textContent='';}
    legs=trip ? dailyTravelLegs(trip,selectedDate()) : [];
    panel.hidden=!trip;
    list.innerHTML=legs.map(leg=>{
      const manual=leg.from.transitMinutes,result=results.get(leg.id);
      const message=manual!=null ? `手動時間：${manual} 分鐘（優先採用）` : result?.error || (result ? `約 ${(result.distanceMeters/1000).toFixed(1)} 公里 · ${result.minutes} 分鐘` : '尚未估算');
      return `<li><strong>${escapeHtml(leg.group)}：${escapeHtml(leg.from.title)} → ${escapeHtml(leg.to.title)}</strong><p>${escapeHtml(message)}</p>${result?.warnings?.map(w=>`<p>${escapeHtml(w)}</p>`).join('') || ''}</li>`;
    }).join('');
    if(!legs.length) list.innerHTML='<li>同一天至少需要兩個可銜接的地點。航班與交通安排不跨接估算。</li>';
    button.disabled=busy || !legs.length;
  }
  panel.querySelector('[data-travel-reset]').addEventListener('click',()=>{generation++;busy=false;results.clear();status.textContent='已清除估算，手動時間保持不變。';render();});
  button.addEventListener('click',async()=>{
    if(busy) return;
    const pending=legs.filter(leg=>leg.from.transitMinutes==null && !results.has(leg.id));
    if(!pending.length){status.textContent='所有路段已有結果或手動時間；要重試請先清除估算。';return;}
    if(!googleKey()){status.textContent='請先開啟 Google 功能設定並套用自己的 Key。';return;}
    const request=++generation,requestContext=context,batch=pending.slice(0,20),dedup=new Map();busy=true;render();
    let stopped=false;
    for(let i=0;i<batch.length;i++) {
      if(request!==generation || requestContext!==context) break;
      const leg=batch[i];status.textContent=`正在估算 ${i+1}／${batch.length}，本批最多 20 個路段…`;
      try{
        const identity=JSON.stringify([leg.from.location,leg.from.title,leg.from.mapsUrl,leg.to.location,leg.to.title,leg.to.mapsUrl,leg.mode]);
        if(!dedup.has(identity)) dedup.set(identity,estimateTravel(googleKey(),leg.from,leg.to,leg.mode));
        const result=await dedup.get(identity);
        if(request===generation && requestContext===context) results.set(leg.id,result);
      }catch(error){if(request===generation && requestContext===context) results.set(leg.id,{error:error instanceof ValidationError ? error.message : '估算失敗，請使用手動時間。'});if(error.stopBatch){stopped=true;break;}}
      if(request===generation) render();
    }
    if(request===generation){busy=false;status.textContent=stopped ? 'Google 服務失敗，本批已停止，沒有繼續送出其他路段。請修正設定後清除估算再試。' : pending.length>20 ? '本批已完成，按「估算剩餘路段」繼續。' : '本批已完成。失敗路段請依提示修正後清除估算再試。';render();}
  });
  googleSettingsChanged.addEventListener('change',render);
  return {render,clear:()=>{context='';generation++;busy=false;results.clear();}};
}
