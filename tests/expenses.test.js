import {describe,expect,it} from 'vitest';
import {createBackup,createExpense,createTrip,expenseSplit,expenseTotals,validateBackup,validateTrip} from '../src/domain/trip.js';
import {parseFirebaseTrip,serializeFirebaseTrip} from '../src/storage/firebase-store.js';
const trip=()=>createTrip({title:'Sample',destination:'Anywhere',startDate:'2027-01-01',endDate:'2027-01-02',timeZone:'UTC',currency:'USD'},'trip');
const input=()=>({title:'Dinner',date:'2027-01-01',amount:'10.00',currency:'USD',splitCount:3,payer:'Sample person',notes:'Receipt reminder'});
describe('independent expenses',()=>{
  it('splits integer minor units without losing or inventing money',()=>{
    for(const amount of ['10.00','0.01','0.29','0']) for(const splitCount of [1,3,7,1000]) {
      const expense=createExpense({...input(),amount,splitCount},trip());const split=expenseSplit(expense);
      expect(split.baseMinor*splitCount+split.extraCount).toBe(expense.amountMinor);
      expect(split.extraCount).toBeLessThan(splitCount);
    }
    expect(expenseSplit(createExpense(input(),trip()))).toEqual({baseMinor:333,extraCount:1});
  });
  it('keeps independent expenses and item charges separated by currency',()=>{
    const first=createExpense(input(),trip(),'one'),second=createExpense({...input(),currency:'EUR',amount:'20'},trip(),'two');
    expect(expenseTotals([first,second,{amountMinor:200,currency:'USD'}])).toEqual({USD:1200,EUR:2000});
  });
  it('rejects missing money, invalid groups, dates and split counts',()=>{
    for(const change of [{amount:''},{amount:-1},{amount:'NaN'},{date:'2027-02-30'},{date:'2027-01-03'},{currency:'x'},{splitCount:0},{splitCount:1.5},{splitCount:1001},{groupId:'missing'}]) expect(()=>createExpense({...input(),...change},trip())).toThrow();
  });
  it('round-trips private backups and Firebase but strips share records',()=>{
    const current=trip();current.expenses=[createExpense(input(),current,'one')];
    expect(validateBackup(createBackup([current])).trips[0].expenses).toEqual(current.expenses);
    expect(parseFirebaseTrip(serializeFirebaseTrip(current)).expenses).toEqual(current.expenses);
    expect(validateBackup(createBackup([current],'share')).trips[0].expenses).toEqual([]);
    const legacy=trip();delete legacy.expenses;expect(validateTrip(legacy).expenses).toEqual([]);
    expect(()=>validateTrip({...current,expenses:[...current.expenses,...current.expenses]})).toThrow(/重複/);
    expect(()=>validateTrip({...current,expenses:[{...current.expenses[0],amountMinor:1.5}]})).toThrow();
  });
});
