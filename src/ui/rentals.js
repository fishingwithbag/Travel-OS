import { createRental, rentalItemInput, ValidationError } from '../domain/trip.js';
import { mapSearchUrl } from '../providers/maps.js';

export function setupRentalUi({currentTrip,saveTrip,openItemDialog,escapeHtml,openDialog,setError,showToast}) {
  const panel=document.querySelector('.rental-panel');
  const dialog=document.querySelector('#rental-dialog');
  const form=document.querySelector('#rental-form');
  let editor=null, saving=false;
  const setSaving=busy=>{
    saving=busy;
    for (const control of [...form.elements,...panel.querySelectorAll('button')]) control.disabled=busy;
  };
  function render() {
    const trip=currentTrip(); const rentals=trip.rentals || [];
    document.querySelector('#rental-empty').hidden=rentals.length > 0;
    document.querySelector('#rental-list').innerHTML=rentals.map(rental=>`<li class="place-card"><h3>${escapeHtml(rental.company)}</h3><p class="eyebrow">${escapeHtml(rental.groupId ? trip.groups.find(group=>group.id === rental.groupId)?.name || '群組已不存在' : '所有人共用')}</p><p>${escapeHtml([rental.branch,rental.car].filter(Boolean).join(' · '))}</p>
      ${['pickup','return'].map(event=>`<p>${event === 'pickup' ? '取車' : '還車'}：${escapeHtml(rental[`${event}Date`])} ${escapeHtml(rental[`${event}Time`])}<br /><a class="map-link" href="${escapeHtml(rental[`${event}MapsUrl`] || mapSearchUrl(rental[`${event}Location`]))}" target="_blank" rel="noopener noreferrer">${escapeHtml(rental[`${event}Location`])} ↗</a></p>`).join('')}
      ${rental.amountMinor == null ? '' : `<p>預訂費用：${escapeHtml(rental.currency)} ${(rental.amountMinor/100).toFixed(2)}</p>`}${rental.booking ? `<p>預訂編號：${escapeHtml(rental.booking)}</p>` : ''}${rental.notes ? `<p class="parking-notes">${escapeHtml(rental.notes)}</p>` : ''}
      <div class="next-stop-actions"><button class="secondary" type="button" data-edit-rental="${escapeHtml(rental.id)}">編輯租車</button><button class="secondary" type="button" data-rental-id="${escapeHtml(rental.id)}" data-rental-event="pickup">取車加入行程</button><button class="secondary" type="button" data-rental-id="${escapeHtml(rental.id)}" data-rental-event="return">還車加入行程</button></div></li>`).join('');
    setSaving(saving);
  }
  function open(rental=null) {
    const trip=currentTrip(); form.reset();
    editor={tripId:trip.id,revision:trip.revision,id:rental?.id || ''};
    form.elements.groupId.replaceChildren(new Option('所有人共用',''),...trip.groups.map(group=>new Option(group.name,group.id)));
    const values=rental ? {...rental,amount:rental.amountMinor == null ? '' : rental.amountMinor/100} : {currency:trip.currency,pickupDate:trip.startDate,returnDate:trip.endDate};
    for (const [name,value] of Object.entries(values)) { const control=form.elements.namedItem(name); if (control) control.value=value ?? ''; }
    for (const name of ['pickupDate','returnDate']) {form.elements[name].min=trip.startDate;form.elements[name].max=trip.endDate;}
    document.querySelector('#rental-dialog-title').textContent=rental ? '編輯租車' : '新增租車';
    document.querySelector('#rental-delete-button').hidden=!rental;
    document.querySelector('#rental-delete-button').textContent='刪除租車';
    document.querySelector('#rental-delete-warning').hidden=true;
    openDialog('rental-dialog');
  }
  function editingTrip() {
    const trip=currentTrip();
    if (!editor || editor.tripId !== trip?.id || editor.revision !== trip.revision) throw new ValidationError('旅程已更新，請保留內容並重新開啟租車資料。');
    return trip;
  }
  panel.addEventListener('click',event=>{
    if (saving) return;
    if (event.target.closest('[data-new-rental]')) {open();return;}
    const button=event.target.closest('[data-edit-rental],[data-rental-id]'); if (!button) return;
    const rental=currentTrip()?.rentals?.find(entry=>entry.id === (button.dataset.editRental || button.dataset.rentalId)); if (!rental) return;
    if (button.dataset.editRental) open(rental); else openItemDialog(null,rentalItemInput(rental,button.dataset.rentalEvent));
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault(); if (saving) return; setError(form,'');
    try {
      const trip=editingTrip(); const rentals=trip.rentals || [];
      if (!editor.id && rentals.length >= 1000) throw new ValidationError('單一旅程最多支援 1000 筆租車。');
      const rental=createRental(Object.fromEntries(new FormData(form)),trip,editor.id || undefined);
      setSaving(true); await saveTrip({...trip,rentals:editor.id ? rentals.map(entry=>entry.id === editor.id ? rental : entry) : [...rentals,rental]});
      setSaving(false); dialog.close(); showToast('租車資料已儲存。');
    } catch (error) {setError(form,error);} finally {setSaving(false);}
  });
  document.querySelector('#rental-delete-button').addEventListener('click',async event=>{
    if (saving) return;
    const warning=document.querySelector('#rental-delete-warning');
    if (warning.hidden) {warning.hidden=false;event.currentTarget.textContent='確定刪除租車';return;}
    try {const trip=editingTrip();setSaving(true);await saveTrip({...trip,rentals:(trip.rentals || []).filter(rental=>rental.id !== editor.id)});setSaving(false);dialog.close();showToast('租車已刪除；取還車安排仍保留。');}
    catch(error) {setError(form,error);} finally {setSaving(false);}
  });
  dialog.addEventListener('cancel',event=>{if(saving) event.preventDefault();});
  dialog.addEventListener('close',()=>{editor=null;panel.querySelector('[data-new-rental]').focus();});
  return {render,isSaving:()=>saving};
}
