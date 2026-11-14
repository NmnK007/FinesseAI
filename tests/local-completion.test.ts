import { test,before,after } from 'node:test';
import assert from 'node:assert/strict';
import { readdir,readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import type { Database,Sql } from '../src/lib/db';
import { businessStore } from '../src/lib/db/businesses';
import { intelligenceStore } from '../src/lib/db/intelligence';
import { exportBusiness } from '../src/lib/db/export';
import { retention } from '../src/lib/db/retention';
import { advancedAlerts } from '../src/lib/finance/advanced-alerts';
import { simulate } from '../src/lib/finance/scenario';
import type { CashRow,Evidence } from '../src/lib/finance/assessment';
let pg:PGlite,db:Database;const owner={id:randomUUID(),email:'local-owner@finnese.test',role:'customer' as const},other={id:randomUUID(),email:'local-other@finnese.test',role:'customer' as const};
before(async()=>{pg=new PGlite();for(const f of(await readdir('db/migrations')).sort())await pg.exec(await readFile(`db/migrations/${f}`,'utf8'));db={query:(s,p)=>pg.query(s,p),transaction:fn=>pg.transaction(tx=>fn(tx as Sql))};for(const u of[owner,other])await db.query('INSERT INTO users(id,email) VALUES ($1,$2)',[u.id,u.email]);});after(async()=>pg.close());
test('saved alternate previews resume only with ownership and active consent; exports exclude revoked facts',async()=>{
 const b=await businessStore(db).create(owner,'Resume example'),store=intelligenceStore(db),job=await store.preview(owner,b.id,'INVOICE',await readFile('public/samples/invoice.csv','utf8'),'invoice.csv');
 assert.deepEqual((await store.job(owner,b.id,job.id)).preview,job.preview);await assert.rejects(store.job(other,b.id,job.id),/access/);
 await store.commit(owner,b.id,job.id);await store.snapshot(owner,b.id,'2026-11-13');
 const exported=await exportBusiness(db,owner,b.id);assert.equal(exported.evidence.length,3);assert.equal(exported.assessments.length,1);await assert.rejects(exportBusiness(db,other,b.id),/access/);
 const consent=(await db.query<{consent_id:string}>('SELECT consent_id FROM evidence_batches WHERE id=$1',[job.id])).rows[0].consent_id;await businessStore(db).revoke(owner,b.id,consent);
 await assert.rejects(store.job(owner,b.id,job.id),/consent/);const revoked=await exportBusiness(db,owner,b.id);assert.equal(revoked.evidence.length,0);assert.equal(revoked.assessments.length,0);
});
test('retention defaults to dry-run, observes grace period and preserves active source facts',async()=>{
 const b=await businessStore(db).create(owner,'Retention example'),store=intelligenceStore(db);
 const expired=await store.preview(owner,b.id,'INVOICE',await readFile('public/samples/invoice.csv','utf8'),'invoice.csv');await store.commit(owner,b.id,expired.id);
 const active=await store.preview(owner,b.id,'UTILITY',await readFile('public/samples/utility.csv','utf8'),'utility.csv');await store.commit(owner,b.id,active.id);
 await db.query("UPDATE consents SET revoked_at=now()-interval '31 days' WHERE id=(SELECT consent_id FROM evidence_batches WHERE id=$1)",[expired.id]);
 assert.equal((await retention(db)).eligibleSources,1);assert.equal((await db.query('SELECT id FROM evidence_records WHERE batch_id=$1',[expired.id])).rows.length,3);
 assert.equal((await retention(db,true)).eligibleSources,1);assert.equal((await db.query('SELECT id FROM evidence_records WHERE batch_id=$1',[expired.id])).rows.length,0);
 assert.equal((await db.query('SELECT id FROM evidence_records WHERE batch_id=$1',[active.id])).rows.length,3);assert.equal((await retention(db,true)).eligibleSources,0);
});
test('cycle review requires both exact opposite legs of all three visible accounts',()=>{
 const rows:CashRow[]=[];for(const [i,from,to] of [[0,'A','B'],[1,'B','C'],[2,'C','A']] as const){for(const [account,n] of [[from,-10000],[to,10000]] as const)rows.push({id:`${i}-${account}`,account_id:account,occurred_on:`2026-10-0${i+1}`,amount_paise:String(n),reference:`transfer-${i}`,description:'visible transfer',category:'INTERNAL_TRANSFER'});}
 const alerts=advancedAlerts(rows,[],'2026-11-13');assert.equal(alerts.length,1);assert.equal(alerts[0].evidenceIds.length,6);assert.equal(advancedAlerts(rows.slice(0,5),[],'2026-11-13').length,0);assert.equal(advancedAlerts([...rows,{...rows[0],id:'ambiguous'}],[],'2026-11-13').length,0);
});
test('supplier concentration is distinct from buyer risk and robust spikes use six prior observations',()=>{
 const evidence:Evidence[]=Array.from({length:3},(_,i)=>({id:`p${i}`,kind:'INVOICE',origin:'USER_UPLOADED_UNVERIFIED',data:{key:`PURCHASE:${i}`,issuedOn:'2026-08-01',dueOn:'2026-08-10',counterparty:'Supplier',direction:'PURCHASE',amountPaise:10000,paidPaise:0}}));assert.equal(advancedAlerts([],evidence,'2026-11-13')[0].rule,'SUPPLIER_CONCENTRATION_V1');
 const rows:CashRow[]=Array.from({length:7},(_,i)=>({id:`m${i}`,account_id:'a',occurred_on:`2026-0${i+1}-01`,amount_paise:i===6?'40000':'10000',reference:'',description:'sale',category:'BUSINESS_SALE'}));assert.equal(advancedAlerts(rows,[],'2026-11-13')[0].rule,'ROBUST_RECEIPT_SPIKE_V1');assert.equal(advancedAlerts(rows.slice(1),[],'2026-11-13').length,0);
});
test('supplier deferrals preserve liabilities; tax and inventory affect cash exactly',()=>{
 const r=simulate({openingCashPaise:0,monthlyReceiptsPaise:10000,monthlyCostsPaise:4000,existingDebtPaise:0,salesDeclinePct:0,costIncreasePct:0,delayMonths:0,principalPaise:0,annualRateBps:0,tenureMonths:12,feesPaise:0,months:3,startMonth:'2026-10',obligationsComplete:false,supplierDelayMonths:1,monthlyTaxPaise:1000,inventoryInvestmentPaise:2000});
 assert.equal(r.rows[0].baselinePaise,5000);assert.equal(r.rows[0].stressedPaise,7000);assert.equal(r.rows[2].stressedPaise,17000);assert.equal(r.outstandingSupplierPaise,4000);assert.equal(r.illustrativeDscr,null);
});

test('configurable reconciliation handles withholding, narration ambiguity and cutoff',async()=>{
 const {reconcile}=await import('../src/lib/finance/reconciliation');
 const invoice:Evidence={id:'invoice',kind:'INVOICE',origin:'USER_UPLOADED_UNVERIFIED',data:{key:'SALE:INV1',issuedOn:'2026-08-01',dueOn:'2026-08-20',counterparty:'Example Traders',direction:'SALE',amountPaise:10000,paidPaise:0}};
 const cash:CashRow={id:'cash',account_id:'account',occurred_on:'2026-08-10',amount_paise:'9800',reference:'INV1',description:'Example Traders payment',category:'BUSINESS_SALE'};
 assert.equal(reconcile([cash],[invoice],'2026-11-13',{}).matches[0].status,'PARTIAL_OR_AMBIGUOUS');
 assert.equal(reconcile([cash],[invoice],'2026-11-13',{withholdingPct:2}).matches[0].status,'SUGGESTED_MATCH');
 assert.equal(reconcile([{...cash,reference:''}],[invoice],'2026-11-13',{allowNarrationMatch:true,withholdingPct:2}).matches[0].method,'NARRATION_TOKENS_LOW_CONFIDENCE');
 assert.equal(reconcile([cash],[invoice],'2026-08-05',{}).matches[0].status,'UNMATCHED');
 assert.equal(reconcile([cash],[invoice],'2026-11-13',{windowDays:2}).matches[0].status,'UNMATCHED');
 assert.throws(()=>reconcile([cash],[invoice],'2026-11-13',{withholdingPct:200}));
});
