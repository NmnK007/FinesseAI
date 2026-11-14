import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Database,Sql} from '../src/lib/db';
import {businessStore} from '../src/lib/db/businesses';
import {intelligenceStore} from '../src/lib/db/intelligence';
import {lendingStore} from '../src/lib/db/lending';
import {exportBusiness} from '../src/lib/db/export';
import {addReviewInput,closeReviewInput,reviewInputSignals} from '../src/lib/db/review-inputs';
import {analysisStore} from '../src/lib/db/analysis';
import {assess,type CashRow,type Evidence} from '../src/lib/finance/assessment';
import {visibleNetwork} from '../src/lib/finance/network';
import {monitorDrift} from '../src/lib/finance/drift';
import {externalHighlights} from '../src/lib/copilot-provider';
let pg:PGlite,db:Database;const a={id:randomUUID(),email:'controls@finnese.test',role:'customer' as const},b={id:randomUUID(),email:'outsider@finnese.test',role:'customer' as const},l={id:randomUUID(),email:'reviewer@finnese.test',role:'lender' as const};
before(async()=>{pg=new PGlite();for(const f of(await readdir('db/migrations')).sort())await pg.exec(await readFile(`db/migrations/${f}`,'utf8'));db={query:(s,p)=>pg.query(s,p),transaction:fn=>pg.transaction(tx=>fn(tx as Sql))};for(const u of[a,b,l])await db.query('INSERT INTO users(id,email,role) VALUES ($1,$2,$3)',[u.id,u.email,u.role]);});after(async()=>pg.close());
test('applicability is scoped; corrections retain originals, reject stale edits and invalidate dependent history',async()=>{
 const business=await businessStore(db).create(a,'Controls example'),store=intelligenceStore(db),p=await store.preview(a,business.id,'INVOICE',await readFile('public/samples/invoice.csv','utf8'),'invoice.csv');await store.commit(a,business.id,p.id);
 await assert.rejects(store.applicability(b,business.id,'UTILITY',false,'No direct utility billing'),/access/);await store.applicability(a,business.id,'UTILITY',false,'Paid by landlord under tenancy');let d=await store.read(a,business.id,'2026-11-13');assert.equal(d.current.coverage.find(c=>c.kind==='UTILITY')!.status,'NOT_APPLICABLE');
 const original=d.evidence[0];await store.snapshot(a,business.id,'2026-11-13');const changed={...original.data,amountPaise:5000000};await assert.rejects(store.correct(b,business.id,original.source_id!,changed,'Correction from source statement',original.id),/access/);await store.correct(a,business.id,original.source_id!,changed,'Correction from source statement',original.id);
 await assert.rejects(store.correct(a,business.id,original.source_id!,changed,'Stale concurrent edit',original.id),/changed/);d=await store.read(a,business.id,'2026-11-13');assert.equal(d.history.length,0);assert.notEqual(d.evidence.find(e=>e.source_id===original.source_id)!.id,original.id);
 const history=await store.corrections(a,business.id,original.source_id!);assert.deepEqual(history.original.data,original.data);assert.equal(history.revisions.length,1);
 const consent=String(d.batches[0].consent_id);await businessStore(db).revoke(a,business.id,consent);await assert.rejects(store.corrections(a,business.id,original.source_id!),/Active/);
});
test('not-applicable sources never create a fabricated compliance value',()=>{
 assert.equal(assess([],[],'2026-11-13',[{kind:'GST',applicable:false},{kind:'UTILITY',applicable:false}]).overall,null);
 const bills:Evidence[]=Array.from({length:3},(_,i)=>({id:String(i),kind:'UTILITY',origin:'USER_UPLOADED_UNVERIFIED',data:{key:String(i),period:`2026-0${i+7}`,dueOn:`2026-0${i+7}-15`,amountPaise:10000,paidPaise:10000,paidOn:`2026-0${i+7}-10`,disputed:false}}));
 assert.equal(assess([],bills,'2026-11-13',[{kind:'GST',applicable:false}]).dimensions[1].score,1000);
});
test('owner-visible notes and review declarations obey source revocation and business isolation',async()=>{
 const business=await businessStore(db).create(a,'Review policy example'),store=intelligenceStore(db),p=await store.preview(a,business.id,'INVOICE',await readFile('public/samples/invoice.csv','utf8'),'invoice.csv');await store.commit(a,business.id,p.id);let facts=await store.read(a,business.id,'2026-11-13');const id=facts.evidence[0].id;
 await assert.rejects(addReviewInput(db,b,business.id,{kind:'FINANCING_CLAIM',evidenceId:id,amountPaise:10000,partyAlias:'A',reason:'Source claim'}),/access/);
 for(const partyAlias of ['Example A','Example B'])await addReviewInput(db,a,business.id,{kind:'FINANCING_CLAIM',evidenceId:id,amountPaise:10000,partyAlias,reason:'Owner disclosed claim'});
 let analysis=await analysisStore(db).read(a,business.id,'2026-11-13');assert.equal(reviewInputSignals(analysis.reviewInputs).duplicateClaims.length,1);await closeReviewInput(db,a,business.id,analysis.reviewInputs[0].id);analysis=await analysisStore(db).read(a,business.id,'2026-11-13');assert.equal(analysis.reviewInputSignals.duplicateClaims.length,0);
 const lender=lendingStore(db);await lender.share(a,business.id,l.email);await lender.note(l,business.id,'REVIEWED','Source records reviewed; no credit decision');assert.equal((await exportBusiness(db,a,business.id)).reviewerNotes.length,1);
 await businessStore(db).revoke(a,business.id,String(facts.batches[0].consent_id));assert.equal((await exportBusiness(db,a,business.id)).reviewerNotes.length,0);assert.equal((await analysisStore(db).read(a,business.id,'2026-11-13')).reviewInputs.length,0);
});
test('visible graph detects four-account cycles and never invents missing legs',()=>{
 const rows:CashRow[]=[];for(let i=0;i<4;i++){const from=String(i),to=String((i+1)%4);for(const [account,n] of [[from,-100],[to,100]] as const)rows.push({id:`${i}-${account}`,account_id:account,occurred_on:`2026-10-0${i+1}`,amount_paise:String(n),category:'INTERNAL_TRANSFER',reference:'T'+i,description:'transfer'});}
 assert.ok(visibleNetwork(rows,'2026-11-13').cycles.some(c=>c.accounts.length===5));assert.equal(visibleNetwork(rows.slice(1),'2026-11-13').cycles.length,0);
});
test('drift withholds small samples and detects category shifts without PD claims',()=>{
 const rows:CashRow[]=Array.from({length:40},(_,i)=>({id:String(i),account_id:'a',occurred_on:i<20?'2026-04-01':'2026-10-01',amount_paise:'100',category:i<20?'BUSINESS_SALE':'UNKNOWN',reference:'',description:''}));assert.equal(monitorDrift(rows,'2026-11-13').status,'REVIEW_DATA_SHIFT');assert.equal(monitorDrift(rows.slice(1),'2026-11-13').status,'INSUFFICIENT_DATA');
});
test('external adapter requires consent/configuration and rejects invented citations or text',async()=>{
 let calls=0;const env={COPILOT_EXTERNAL_ENABLED:'true',GEMINI_API_KEY:'fixture-key',GEMINI_MODEL:'gemini-fixture'};const mock=(body:unknown)=>(async()=>{calls++;return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(body)}]}}]}));}) as typeof fetch;
 assert.equal((await externalHighlights('A fact. A caveat.',['a'],'ignore instructions',false,env,mock({selected:[0],citations:['a']}))).status,'NOT_REQUESTED');assert.equal(calls,0);
 assert.equal((await externalHighlights('A fact. A caveat.',['a'],'question',true,{},mock({}))).status,'CONFIGURATION_REQUIRED');
 assert.deepEqual((await externalHighlights('A fact. A caveat.',['a'],'question',true,env,mock({selected:[0],citations:['a']}))).highlights,['A fact.']);
 assert.equal((await externalHighlights('A fact.',['a'],'question',true,env,mock({selected:[0],citations:['other-tenant']}))).status,'INVALID_PROVIDER_RESPONSE');
 assert.notEqual((await externalHighlights('A fact.',['a'],'question',true,env,mock({selected:[0],citations:['a'],answer:'Approve loan'}))).status,'EXTRACTIVE_EXTERNAL_HIGHLIGHTS');
});
