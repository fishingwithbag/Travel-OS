import {groupImpact,renameGroup,removeGroup} from '../domain/groups.js';
import {ValidationError} from '../domain/trip.js';

export function setupGroupUi({currentTrip,saveTrip,openDialog,setError,showToast,canEdit}) {
  const dialog=document.querySelector('#group-edit-dialog'),form=document.querySelector('#group-edit-form');
  const remove=document.querySelector('#group-remove'),warning=document.querySelector('#group-remove-warning');
  let editor=null,saving=false;
  function busy(value) {saving=value;for(const control of form.elements) control.disabled=value;}
  function editingTrip() {
    const trip=currentTrip();
    if(!canEdit()) throw new ValidationError('目前帳號無編輯權限。');
    if(!editor || trip?.id!==editor.tripId || trip.revision!==editor.revision) throw new ValidationError('旅程已更新，請保留輸入內容並重新開啟群組，確認最新影響範圍。');
    return trip;
  }
  document.querySelector('#more-group-list').addEventListener('click',event=>{
    const button=event.target.closest('[data-edit-group]');if(!button || saving || !canEdit()) return;
    const trip=currentTrip(),group=trip.groups.find(entry=>entry.id===button.dataset.editGroup);if(!group) return;
    editor={tripId:trip.id,revision:trip.revision,id:group.id};form.reset();
    form.elements.name.value=group.name;
    form.elements.targetId.replaceChildren(new Option('所有人／共用',''),...trip.groups.filter(entry=>entry.id!==group.id).map(entry=>new Option(entry.name,entry.id)));
    const impact=groupImpact(trip,group.id);
    document.querySelector('#group-impact').textContent=`刪除時移轉：${impact.items} 筆行程、${impact.parking} 筆停車設定、${impact.rentals} 筆租車、${impact.stays} 筆住宿、${impact.expenses} 筆費用。保留內容及金額，不重新計算分攤人數。`;
    warning.hidden=true;remove.textContent='刪除並移轉資料';busy(false);openDialog('group-edit-dialog');
  });
  form.elements.targetId.addEventListener('change',()=>{warning.hidden=true;remove.textContent='刪除並移轉資料';});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(saving) return;setError(form,'');
    try {const trip=editingTrip();const next=renameGroup(trip,editor.id,form.elements.name.value);busy(true);await saveTrip(next);dialog.close();showToast('群組名稱已更新，原有資料關聯已保留。');}
    catch(error) {setError(form,error);} finally {busy(false);}
  });
  remove.addEventListener('click',async()=>{
    if(saving) return;setError(form,'');
    try {
      const trip=editingTrip(),next=removeGroup(trip,editor.id,form.elements.targetId.value);
      if(warning.hidden) {warning.hidden=false;warning.textContent=`確認刪除「${trip.groups.find(group=>group.id===editor.id).name}」，並將上述資料移轉至「${form.elements.targetId.selectedOptions[0].textContent}」？`;remove.textContent='確認刪除並移轉';return;}
      busy(true);await saveTrip(next);dialog.close();showToast('群組已刪除，相關資料已移轉。');
    } catch(error) {setError(form,error);} finally {busy(false);}
  });
  dialog.addEventListener('cancel',event=>{if(saving) event.preventDefault();});
  dialog.addEventListener('close',()=>{editor=null;document.querySelector('[data-open="group-dialog"]')?.focus();});
  return {isSaving:()=>saving};
}
