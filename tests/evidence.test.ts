import { test,before,after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import type { Database,Sql } from '../src/lib/db';
import { businessStore } from '../src/lib/db/businesses';
import { intelligenceStore } from '../src/lib/db/intelligence';
import { parseEvidence,type Invoice } from '../src/lib/ingestion/evidence-csv';
import { assess,type Evidence,type CashRow } from '../src/lib/finance/assessment';
import { provider } from '../src/lib/providers';
const fixture=(kind:string)=>readFile(`public/samples/${kind}.csv`,'utf8');
let pg:PGlite,db:Database;
const a={id:randomUUID(),email:'evidence-a@finnese.test',role:'customer' as const},b={id:randomUUID(),email:'evidence-b@finnese.test',role:'customer' as const};
before(async()=>{pg=new PGlite();for(const file of(await readdir('db/migrations')).sort())await pg.exec(await readFile(`db/migrations/${file}`,'utf8'));db={query:(sql,params)=>pg.query(sql,params),transaction:fn=>pg.transaction(tx=>fn(tx as Sql))};for(const u of[a,b])await db.query('INSERT INTO users(id,email) VALUES ($1,$2)',[u.id,u.email]);});
after(async()=>pg.close());
test('invoice dates, directions, amounts and conflicting duplicates are validated',()=>{
 const p=parseEvidence('invoice_id,issued_on,due_on,counterparty,amount,paid_amount,direction\nA,2026-08-01,2026-08-10,Shop,100,20,SALE\nA,2026-08-01,2026-08-10,Shop,100,20,SALE\nA,2026-08-01,2026-08-10,Shop,200,20,SALE\nB,2026-08-11,2026-08-10,Shop,100,20,SALE','INVOICE');
 assert.equal(p.rows.length,1);assert.equal(p.skipped.length,1);assert.equal(p.rejected.length,2);
});
test('utility chronology distinguishes disputed, overdue, late and on-time',async()=>{
 const p=parseEvidence(await fixture('utility'),'UTILITY');const evidence=p.rows.map(r=>({id:r.key,kind:'UTILITY' as const,data:r.data,origin:'USER_UPLOADED_UNVERIFIED'}));
 assert.deepEqual(assess([],evidence,'2026-11-13').utilities.map(u=>u.status),['ON_TIME','LATE','OVERDUE']);
 assert.equal(assess([],[],'2026-11-13').overall,null);
});
test('split payments reconcile by reference and aligned month, without counting unmatched cash as fraud',()=>{
 const invoice:Invoice={key:'SALE:A',issuedOn:'2026-08-01',dueOn:'2026-08-20',counterparty:'shop',amountPaise:10000,paidPaise:0,direction:'SALE'};
 const cash:CashRow[]=[6000,4000].map((amount,i)=>({id:String(i),occurred_on:'2026-08-12',amount_paise:String(amount),reference:'A',category:'BUSINESS_SALE',description:'sale',account_id:'a'}));
 const e:Evidence[]=[{id:'inv',kind:'INVOICE',origin:'USER_UPLOADED_UNVERIFIED',data:invoice},{id:'gst',kind:'GST',origin:'USER_UPLOADED_UNVERIFIED',data:{key:'2026-09',period:'2026-09',salesPaise:10000,dueOn:'2026-10-20',filedOn:null}}];
 const card=assess(cash,e,'2026-11-13');assert.equal(card.matches[0].status,'SUGGESTED_MATCH');assert.equal(card.gstGaps[0].receiptsPaise,0);
 assert.equal(assess([],e,'2026-11-13').matches[0].status,'UNMATCHED');
});
test('persistent evidence imports are isolated, idempotent, snapshot-versioned and consent-bound',async()=>{
 const business=await businessStore(db).create(a,'Phase two fictional business');const store=intelligenceStore(db);
 const csv=await fixture('invoice');await assert.rejects(store.preview(b,business.id,'INVOICE',csv,'invoice.csv'),/access/);
 const preview=await store.preview(a,business.id,'INVOICE',csv,'invoice.csv');await assert.rejects(store.commit(b,business.id,preview.id),/access/);
 const result=await store.commit(a,business.id,preview.id);assert.deepEqual(await store.commit(a,business.id,preview.id),result);
 const repeated=await store.preview(a,business.id,'INVOICE',csv,'renamed.csv');assert.equal(repeated.preview.rows.length,0);
 const first=await store.snapshot(a,business.id,'2026-11-13');const second=await store.snapshot(a,business.id,'2026-11-13');assert.equal(first.id,second.id);
 const data=await store.read(a,business.id,'2026-11-13');assert.equal(data.evidence.length,3);
 await store.review(a,business.id,data.evidence[0].id,'DISMISSED','Cash settlement recorded separately.');
 await businessStore(db).revoke(a,business.id,String(data.batches.find(x=>x.id===preview.id)!.consent_id));
 assert.equal((await store.read(a,business.id,'2026-11-13')).evidence.length,0);assert.equal((await store.read(a,business.id,'2026-11-13')).history.length,0);
 await assert.rejects(store.commit(a,business.id,preview.id),/consent/);
});
test('score is reproducible, requires evidence and changes with new observed inputs',()=>{
 const evidence:Evidence[]=[];
 for(const [i,month] of ['07','08','09'].entries()){
  evidence.push({id:'i'+i,kind:'INVOICE',origin:'USER_UPLOADED_UNVERIFIED',data:{key:'SALE:'+i,issuedOn:`2026-${month}-01`,dueOn:`2026-${month}-20`,counterparty:'Shop '+i,amountPaise:10000,paidPaise:0,direction:'SALE'}});
  evidence.push({id:'g'+i,kind:'GST',origin:'USER_UPLOADED_UNVERIFIED',data:{key:`2026-${month}`,period:`2026-${month}`,salesPaise:10000,dueOn:`2026-${month}-20`,filedOn:`2026-${month}-19`}});
 }
 const cash:CashRow[]=[{id:'b',occurred_on:'2026-10-01',amount_paise:'10000',reference:'0',category:'BUSINESS_SALE',description:'sale',account_id:'a'}];
 const card=assess(cash,evidence,'2026-11-13');assert.notEqual(card.overall,null);assert.deepEqual(card,assess(cash,evidence,'2026-11-13'));
 const changed=structuredClone(evidence);(changed[4].data as Invoice).amountPaise=50000;assert.notEqual(assess(cash,changed,'2026-11-13').overall,card.overall);
 assert.equal(assess(cash,evidence.filter(e=>e.kind!=='GST'),'2026-11-13').overall,null);
 assert.equal(assess(cash,evidence,'2027-11-13').overall,null);
});
test('provider contract simulator requires consent and never invents partner access',async()=>{
 const sim=provider('simulator');await assert.rejects(sim.fetch(),/Consent/);sim.startConsentOrAuthorize(true);const result=await sim.fetch();assert.equal(result.origin,'SANDBOX');assert.equal(sim.normalize(result.csv,'UTILITY').rows.length,1);sim.revoke();await assert.rejects(sim.fetch());
 const aa=provider('aa');aa.startConsentOrAuthorize(true);await assert.rejects(aa.fetch(),/No partner/);
});
