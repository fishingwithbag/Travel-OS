import {createExpense,expenseSplit,expenseTotals,ValidationError} from '../domain/trip.js';

export function setupExpenseUi({currentTrip,saveTrip,escapeHtml,openDialog,setError,showToast}) {
  const panel=document.querySelector('#expenses-panel'),dialog=document.querySelector('#expense-dialog'),form=document.querySelector('#expense-form');
  let editor=null,saving=false;
  const setSaving=busy=>{saving=busy;for(const control of [...form.elements,...panel.querySelectorAll('button')]) control.disabled=busy;};
  function render() {
    const trip=currentTrip(),expenses=trip.expenses || [];
    document.querySelector('#expense-empty').hidden=expenses.length>0;
    document.querySelector('#expense-totals').textContent=Object.entries(expenseTotals(expenses)).map(([currency,minor])=>`${currency} ${(minor/100).toFixed(2)}`).join(' / ');
    document.querySelector('#expense-list').innerHTML=expenses.map(expense=>{
      const split=expenseSplit(expense);
      return `<li class="place-card"><div class="panel-heading"><h3>${escapeHtml(expense.title)}</h3><strong>${escapeHtml(expense.currency)} ${(expense.amountMinor/100).toFixed(2)}</strong></div><p class="muted">${escapeHtml([expense.date,expense.category,expense.groupId ? trip.groups.find(group=>group.id===expense.groupId)?.name || '群組已不存在' : '所有人'].filter(Boolean).join(' · '))}</p><p>${expense.splitCount} 人分攤，每人 ${(split.baseMinor/100).toFixed(2)} ${escapeHtml(expense.currency)}${split.extraCount ? `；其中 ${split.extraCount} 人各多付 0.01` : ''}</p>${expense.payer ? `<p>付款人：${escapeHtml(expense.payer)}</p>` : ''}${expense.notes ? `<p class="parking-notes">${escapeHtml(expense.notes)}</p>` : ''}<button class="secondary" type="button" data-edit-expense="${escapeHtml(expense.id)}">編輯費用</button></li>`;
    }).join('');
    setSaving(saving);
  }
  function open(expense=null) {
    const trip=currentTrip();form.reset();editor={tripId:trip.id,revision:trip.revision,id:expense?.id || ''};
    form.elements.groupId.replaceChildren(new Option('所有人',''),...trip.groups.map(group=>new Option(group.name,group.id)));
    const values=expense ? {...expense,amount:expense.amountMinor/100} : {currency:trip.currency,date:trip.startDate,splitCount:1};
    for(const [name,value] of Object.entries(values)) {const control=form.elements.namedItem(name);if(control) control.value=value ?? '';}
    form.elements.date.min=trip.startDate;form.elements.date.max=trip.endDate;
    document.querySelector('#expense-dialog-title').textContent=expense ? '編輯費用' : '新增費用';
    document.querySelector('#expense-delete-button').hidden=!expense;document.querySelector('#expense-delete-button').textContent='刪除費用';document.querySelector('#expense-delete-warning').hidden=true;
    openDialog('expense-dialog');
  }
  function editingTrip() {
    const trip=currentTrip();
    if(!editor || editor.tripId!==trip?.id || editor.revision!==trip.revision) throw new ValidationError('旅程已更新，請保留內容並重新開啟費用。');
    return trip;
  }
  panel.addEventListener('click',event=>{
    if(saving) return;
    if(event.target.closest('[data-new-expense]')) {open();return;}
    const button=event.target.closest('[data-edit-expense]');if(!button) return;
    const expense=currentTrip()?.expenses?.find(entry=>entry.id===button.dataset.editExpense);if(expense) open(expense);
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(saving) return;setError(form,'');
    try {
      const trip=editingTrip(),expenses=trip.expenses || [];
      if(!editor.id && expenses.length>=10_000) throw new ValidationError('單一旅程最多支援 10000 筆獨立費用。');
      const expense=createExpense(Object.fromEntries(new FormData(form)),trip,editor.id || undefined);
      setSaving(true);await saveTrip({...trip,expenses:editor.id ? expenses.map(entry=>entry.id===editor.id ? expense : entry) : [...expenses,expense]});
      setSaving(false);dialog.close();showToast('費用已儲存。');
    } catch(error) {setError(form,error);} finally {setSaving(false);}
  });
  document.querySelector('#expense-delete-button').addEventListener('click',async event=>{
    if(saving) return;const warning=document.querySelector('#expense-delete-warning');
    if(warning.hidden) {warning.hidden=false;event.currentTarget.textContent='確定刪除費用';return;}
    try {const trip=editingTrip();setSaving(true);await saveTrip({...trip,expenses:(trip.expenses || []).filter(expense=>expense.id!==editor.id)});setSaving(false);dialog.close();showToast('獨立費用已刪除。');}
    catch(error) {setError(form,error);} finally {setSaving(false);}
  });
  dialog.addEventListener('cancel',event=>{if(saving) event.preventDefault();});
  dialog.addEventListener('close',()=>{editor=null;panel.querySelector('[data-new-expense]').focus();});
  return {render,isSaving:()=>saving};
}
