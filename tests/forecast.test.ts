import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSeasonality } from '../src/lib/finance/forecast-validation';
import type { CashRow } from '../src/lib/finance/assessment';
const rows:CashRow[]=Array.from({length:24},(_,i)=>({id:String(i),account_id:'a',occurred_on:new Date(Date.UTC(2023,i,1)).toISOString().slice(0,10),amount_paise:String((i%12+1)*10000),category:'BUSINESS_SALE',description:'fictional seasonal receipts',reference:''}));
test('walk-forward seasonal comparison excludes future input and withholds missing history',()=>{
 const r=validateSeasonality(rows,'2025-01-01');assert.equal(r.seasonalMaePaise,0);assert.ok(r.recentMeanMaePaise!>0);assert.equal(r.folds.length,12);
 const changed=rows.map((r,i)=>i===23?{...r,amount_paise:'999999'}:r);const next=validateSeasonality(changed,'2025-01-01');assert.equal(next.folds[11].seasonalPaise,r.folds[11].seasonalPaise);assert.equal(next.folds[11].recentMeanPaise,r.folds[11].recentMeanPaise);
 assert.equal(validateSeasonality(rows.slice(1,17),'2025-01-01').status,'INSUFFICIENT_HISTORY');assert.equal(validateSeasonality(rows.filter((_,i)=>i!==7),'2025-01-01').status,'INSUFFICIENT_HISTORY');assert.equal(validateSeasonality(rows,'2024-01-01').status,'INSUFFICIENT_HISTORY');
});

test('receipt ranges use earlier errors and independently measure the last six months',()=>{
 const history:CashRow[]=Array.from({length:30},(_,i)=>({
  ...rows[i%12],id:String(i),occurred_on:new Date(Date.UTC(2023,i,1)).toISOString().slice(0,10),
  amount_paise:i>=24?'999999':rows[i%12].amount_paise,
 }));
 assert.equal(validateSeasonality(history.slice(0,29),'2025-07-01').receiptRanges,null);
 assert.deepEqual(validateSeasonality(history,'2025-07-01').receiptRanges?.seasonal,{
  radiusPaise:0,calibrationMonths:12,heldOutMonths:6,withinRangeMonths:0,
 });
});
