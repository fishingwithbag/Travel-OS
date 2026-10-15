import {createStay,stayItemInput,ValidationError} from '../domain/trip.js';
import {itemMapUrl} from '../providers/maps.js';

export function setupStayUi({currentTrip,saveTrip,openItemDialog,escapeHtml,openDialog,setError,showToast}) {
  const panel=document.querySelector('#stays-panel'),dialog=document.querySelector('#stay-dialog'),form=document.querySelector('#stay-form');
  let editor=null,saving=false;
  const setSaving=busy=>{saving=busy;for(const control of [...form.elements,...panel.querySelectorAll('button')]) control.disabled=busy;};
  function render() {
    const trip=currentTrip(),stays=trip.stays || [];
    document.querySelector('#stay-empty').hidden=stays.length>0;
    document.querySelector('#stay-list').innerHTML=stays.map(stay=>`<li class="place-card"><h3>${escapeHtml(stay.title)}</h3><p class="eyebrow">${escapeHtml(stay.groupId ? trip.groups.find(group=>group.id===stay.groupId)?.name || '群組已不存在' : '所有人共用')}</p><a class="map-link" href="${escapeHtml(itemMapUrl(stay))}" target="_blank" rel="noopener noreferrer">${escapeHtml(stay.location)} ↗</a><p>入住：${escapeHtml(stay.checkInDate)} ${escapeHtml(stay.checkInTime)}<br />退房：${escapeHtml(stay.checkOutDate)} ${escapeHtml(stay.checkOutTime)}</p><p>${escapeHtml(stay.room)} · ${stay.guests} 人</p>${stay.booking ? `<p>預訂編號：${escapeHtml(stay.booking)}</p>` : ''}${stay.amountMinor == null ? '' : `<p>預訂費用：${escapeHtml(stay.currency)} ${(stay.amountMinor/100).toFixed(2)}</p>`}${stay.notes ? `<p class="parking-notes">${escapeHtml(stay.notes)}</p>` : ''}<div class="next-stop-actions"><button class="secondary" type="button" data-edit-stay="${escapeHtml(stay.id)}">編輯住宿</button><button class="secondary" type="button" data-stay-id="${escapeHtml(stay.id)}" data-stay-event="checkIn">入住加入行程</button><button class="secondary" type="button" data-stay-id="${escapeHtml(stay.id)}" data-stay-event="checkOut">退房加入行程</button></div></li>`).join('');
    setSaving(saving);
  }
  function open(stay=null) {
    const trip=currentTrip();form.reset();editor={tripId:trip.id,revision:trip.revision,id:stay?.id || ''};
    form.elements.groupId.replaceChildren(new Option('所有人共用',''),...trip.groups.map(group=>new Option(group.name,group.id)));
    const values=stay ? {...stay,amount:stay.amountMinor == null ? '' : stay.amountMinor/100} : {currency:trip.currency,checkInDate:trip.startDate,checkOutDate:trip.endDate};
    for(const [name,value] of Object.entries(values)) {const control=form.elements.namedItem(name);if(control) control.value=value ?? '';}
    for(const name of ['checkInDate','checkOutDate']) {form.elements[name].min=trip.startDate;form.elements[name].max=trip.endDate;}
    document.querySelector('#stay-dialog-title').textContent=stay ? '編輯住宿' : '新增住宿';
    document.querySelector('#stay-delete-button').hidden=!stay;document.querySelector('#stay-delete-button').textContent='刪除住宿';document.querySelector('#stay-delete-warning').hidden=true;
    openDialog('stay-dialog');
  }
  function editingTrip() {
    const trip=currentTrip();
    if(!editor || editor.tripId!==trip?.id || editor.revision!==trip.revision) throw new ValidationError('旅程已更新，請保留內容並重新開啟住宿資料。');
    return trip;
  }
  panel.addEventListener('click',event=>{
    if(saving) return;
    if(event.target.closest('[data-new-stay]')) {open();return;}
    const button=event.target.closest('[data-edit-stay],[data-stay-id]');if(!button) return;
    const stay=currentTrip()?.stays?.find(entry=>entry.id===(button.dataset.editStay || button.dataset.stayId));if(!stay) return;
    if(button.dataset.editStay) open(stay);else openItemDialog(null,stayItemInput(stay,button.dataset.stayEvent));
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(saving) return;setError(form,'');
    try {
      const trip=editingTrip(),stays=trip.stays || [];
      if(!editor.id && stays.length>=1000) throw new ValidationError('單一旅程最多支援 1000 筆住宿。');
      const stay=createStay(Object.fromEntries(new FormData(form)),trip,editor.id || undefined);
      setSaving(true);await saveTrip({...trip,stays:editor.id ? stays.map(entry=>entry.id===editor.id ? stay : entry) : [...stays,stay]});
      setSaving(false);dialog.close();showToast('住宿資料已儲存。');
    } catch(error) {setError(form,error);} finally {setSaving(false);}
  });
  document.querySelector('#stay-delete-button').addEventListener('click',async event=>{
    if(saving) return;const warning=document.querySelector('#stay-delete-warning');
    if(warning.hidden) {warning.hidden=false;event.currentTarget.textContent='確定刪除住宿';return;}
    try {const trip=editingTrip();setSaving(true);await saveTrip({...trip,stays:(trip.stays || []).filter(stay=>stay.id!==editor.id)});setSaving(false);dialog.close();showToast('住宿已刪除；每日安排仍保留。');}
    catch(error) {setError(form,error);} finally {setSaving(false);}
  });
  dialog.addEventListener('cancel',event=>{if(saving) event.preventDefault();});
  dialog.addEventListener('close',()=>{editor=null;panel.querySelector('[data-new-stay]').focus();});
  return {render,isSaving:()=>saving};
}
