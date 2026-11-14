import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parsePaise,sumPaise } from '../src/lib/finance/money';
import { parseBankCsv,parseDate,categorize } from '../src/lib/ingestion/bank-csv';
import { financialMetrics } from '../src/lib/finance/metrics';
import { devInboxEnabled } from '../src/lib/security/mailpit';

test('money uses exact paise with Indian grouping, signs and parentheses',()=>{
  assert.equal(parsePaise('₹ 1,23,456.78'),12345678);
  assert.equal(parsePaise('(1,000.01)'),-100001);
  assert.equal(sumPaise([parsePaise('0.1'),parsePaise('0.2')]),30);
  for(const invalid of ['NaN','Infinity','1e6','12.345','1,2,3','-','999999999999999999'])assert.throws(()=>parsePaise(invalid));
});
test('calendar validation rejects rollover and ambiguous formats',()=>{
  assert.equal(parseDate('29/02/2024'),'2024-02-29');
  assert.equal(parseDate('2026-11-12'),'2026-11-12');
  for(const invalid of ['29/02/2025','31/04/2026','2026-13-01','1/2/26'])assert.throws(()=>parseDate(invalid));
});
test('deposits, loan proceeds, capital, internal transfers and refunds are not automatically sales',()=>{
  for(const description of ['UPI A','loan disbursement','owner contribution','internal transfer','refund received','sale reversal'])assert.notEqual(categorize(description,10000).category,'BUSINESS_SALE');
  assert.equal(categorize('Customer payment shop',10000).category,'BUSINESS_SALE');
  assert.equal(categorize('Customer payment shop',-10000).category,'UNKNOWN');
  assert.equal(categorize('Customer refund',-10000).category,'CUSTOMER_REFUND');
});
test('fictional sample validates rows, deduplicates and reconciles exactly',async()=>{
  const preview=parseBankCsv(await readFile('public/samples/fictional-bank.csv','utf8'));
  assert.equal(preview.rows.length,10);assert.equal(preview.skipped.length,1);assert.equal(preview.rejected.length,1);
  assert.equal(preview.warnings.length,1);
  const metrics=financialMetrics(preview.rows.map(r=>({occurred_on:r.date,amount_paise:r.amountPaise,balance_paise:r.balancePaise,account_id:'sample',category:r.category})));
  assert.equal(metrics.inflowPaise,20575050);assert.equal(metrics.outflowPaise,3650025);
  assert.equal(metrics.netMovementPaise,16925025);assert.equal(metrics.salesReceiptsPaise,5500050);
  assert.equal(metrics.customerRefundsPaise,100000);assert.equal(metrics.unknownCount,1);
  assert.equal(metrics.score,null);assert.equal(metrics.defaultProbability,null);
});
test('custom mapping handles quoted narration, signed amounts and balance warnings',()=>{
  const preview=parseBankCsv('When,Details,Value,Cash\n2026-01-01,"Sale, shop",100.01,100.01\n2026-01-02,Fee,-1.01,98.00',{date:'When',description:'Details',amount:'Value',balance:'Cash'});
  assert.equal(preview.rows[0].description,'Sale, shop');assert.equal(preview.rows[1].amountPaise,-101);
  assert.ok(preview.warnings.some(w=>w.reason.includes('does not reconcile')));
});
test('invalid rows report currency and debit/credit errors',()=>{
  const preview=parseBankCsv('Date,Description,Debit,Credit,Currency\n2026-01-01,x,1,2,INR\n2026-01-02,x,,2,USD\n2026-01-03,x,-1,,INR\n2026-01-04,x,0,0,INR\n2026-01-05,x,,,INR');
  assert.equal(preview.rows.length,0);assert.equal(preview.rejected.length,5);
});
test('binary files, duplicate headers, oversized input and row limits are rejected',()=>{
  for(const invalid of ['%PDF\u0000','Date,Date\n1,2','x'.repeat(512001),'Date,Description,Amount\n'+'2026-01-01,x,1\n'.repeat(1001)])assert.throws(()=>parseBankCsv(invalid));
});
test('empty evidence is missing, and production cannot enable local inbox',()=>{
  const empty=financialMetrics([]);assert.equal(empty.score,null);assert.equal(empty.transactionCount,0);assert.equal(empty.monthly.length,0);
  assert.equal(devInboxEnabled({NODE_ENV:'production',AUTH_DELIVERY:'mailpit'}),false);
  assert.equal(devInboxEnabled({NODE_ENV:'test',AUTH_DELIVERY:'mailpit'}),false);
  assert.equal(devInboxEnabled({NODE_ENV:'development',AUTH_DELIVERY:'mailpit'}),true);
});
