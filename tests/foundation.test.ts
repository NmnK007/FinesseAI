import { test,before,after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import type { Database,Sql } from '../src/lib/db';
import { authService,findSession,type Actor } from '../src/lib/security/auth-service';
import { businessStore } from '../src/lib/db/businesses';

let pg:PGlite,database:Database;
const codes=new Map<string,string>();
let auth:ReturnType<typeof authService>,store:ReturnType<typeof businessStore>;
const a:Actor={id:randomUUID(),email:'owner-a@finnese.test',role:'customer'};
const b:Actor={id:randomUUID(),email:'owner-b@finnese.test',role:'customer'};
before(async()=>{
  pg=new PGlite();await pg.exec(await readFile('db/migrations/001_foundation.sql','utf8'));
  database={query:<T extends Record<string,unknown>>(sql:string,params?:unknown[])=>pg.query<T>(sql,params),transaction:work=>pg.transaction(tx=>work(tx as Sql))};
  auth=authService(database,'test-secret-only-'.repeat(4),{async send(email,code){codes.set(email,code);}});
  store=businessStore(database);
  for(const user of [a,b])await database.query('INSERT INTO users(id,email) VALUES ($1,$2)',[user.id,user.email]);
});
after(async()=>{await pg.close();});
test('OTP protected, session opaque, code single-use and forged cookie rejected',async()=>{
  const email='auth@finnese.test';await auth.request(email);const code=codes.get(email)!;
  const challenge=(await database.query('SELECT verifier FROM otp_challenges WHERE email=$1',[email])).rows[0];
  assert.notEqual(challenge.verifier,code);assert.match(String(challenge.verifier),/^[a-f0-9]{64}$/);
  const result=await auth.verify(email,code);assert.equal(result.token.length,43);
  assert.equal((await findSession(database,result.token))?.email,email);
  assert.equal(await findSession(database,encodeURIComponent(JSON.stringify(a))),null);
  await assert.rejects(auth.verify(email,code),/invalid, expired or already used/);
  await database.query("UPDATE sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1",[result.actor.id]);
  assert.equal(await findSession(database,result.token),null);
});
test('incorrect attempts commit and lock out correct OTP after five failures',async()=>{
  const email='attempts@finnese.test';await auth.request(email);const right=codes.get(email)!;const wrong=right==='000000'?'111111':'000000';
  for(let i=0;i<5;i++)await assert.rejects(auth.verify(email,wrong));
  assert.equal((await database.query('SELECT attempts FROM otp_challenges WHERE email=$1',[email])).rows[0].attempts,5);
  await assert.rejects(auth.verify(email,right));
});
test('expiry, delivery failure and persistent request limit',async()=>{
  const email='expiry@finnese.test';await auth.request(email);
  await database.query("UPDATE otp_challenges SET expires_at=now()-interval '1 second' WHERE email=$1",[email]);
  await assert.rejects(auth.verify(email,codes.get(email)!));
  for(let i=0;i<4;i++)await auth.request(email);
  await assert.rejects(auth.request(email),/Too many attempts/);
  const failing=authService(database,'test-secret-only-'.repeat(4),{async send(){throw new Error('transport down');}});
  await assert.rejects(failing.request('failed@finnese.test'),/inbox is unavailable/);
  assert.ok((await database.query('SELECT consumed_at FROM otp_challenges WHERE email=$1',['failed@finnese.test'])).rows[0].consumed_at);
});
test('business records, imports, reports and confirmation are owner-scoped and idempotent',async()=>{
  const business=await store.create(a,'Fictional owner A');
  assert.equal((await store.list(b)).length,0);
  await assert.rejects(store.detail(b,business.id),/access is not available/);
  const csv=await readFile('public/samples/fictional-bank.csv','utf8');
  await assert.rejects(store.preview(b,{businessId:business.id,accountAlias:'demo',filename:'sample.csv',csv}),/access is not available/);
  const job=await store.preview(a,{businessId:business.id,accountAlias:'demo',filename:'sample.csv',csv});
  await assert.rejects(store.job(b,job.id),/access is not available/);
  await assert.rejects(store.commit(b,job.id),/access is not available/);
  const result=await store.commit(a,job.id) as {accepted:number};assert.equal(result.accepted,10);
  assert.deepEqual(await store.commit(a,job.id),result);
  const detail=await store.detail(a,business.id);assert.equal(detail.metrics.salesReceiptsPaise,5500050);assert.equal(detail.sources[0].origin,'USER_UPLOADED_UNVERIFIED');
  const repeat=await store.preview(a,{businessId:business.id,accountAlias:'demo',filename:'renamed.csv',csv});
  assert.equal(repeat.preview.rows.length,0);await store.commit(a,repeat.id);
  assert.equal((await store.detail(a,business.id)).metrics.transactionCount,10);
  assert.equal((await database.query('SELECT count(*)::int AS n FROM feature_snapshots WHERE business_id=$1',[business.id])).rows[0].n,2);
});
test('reviewed categories reject invalid direction and roll back all inserts',async()=>{
  const business=await store.create(a,'Fictional corrections');
  const job=await store.preview(a,{businessId:business.id,accountAlias:'operating',filename:'sample.csv',csv:'Date,Description,Amount\n2026-01-01,unknown,100\n2026-01-02,fee,-10'});
  await assert.rejects(store.commit(a,job.id,{'2':'BUSINESS_SALE','3':'BUSINESS_SALE'}),/positive amount/);
  assert.equal((await store.detail(a,business.id)).metrics.transactionCount,0);
  await store.commit(a,job.id,{'2':'BUSINESS_SALE'});
  assert.equal((await store.detail(a,business.id)).metrics.salesReceiptsPaise,10000);
});
test('revocation excludes evidence and blocks replay; deletion cascades',async()=>{
  const business=await store.create(a,'Fictional revocation');
  const job=await store.preview(a,{businessId:business.id,accountAlias:'operating',filename:'sample.csv',csv:'Date,Description,Amount\n2026-01-01,Sale,100'});
  await store.commit(a,job.id);const detail=await store.detail(a,business.id);const consentId=String(detail.sources[0].consent_id);
  await assert.rejects(store.revoke(b,business.id,consentId),/access is not available/);
  await store.revoke(a,business.id,consentId);
  assert.equal((await store.detail(a,business.id)).metrics.transactionCount,0);
  await assert.rejects(store.job(a,job.id),/expired or was revoked/);
  await assert.rejects(store.commit(a,job.id),/expired or was revoked/);
  await assert.rejects(store.remove(b,business.id),/access is not available/);
  await store.remove(a,business.id);
  for(const table of ['transactions','accounts','consents','ingestion_jobs','source_evidence','feature_snapshots'])assert.equal((await database.query(`SELECT count(*)::int AS n FROM ${table} WHERE business_id=$1`,[business.id])).rows[0].n,0);
});
test('lender cannot self-provision ownership; missing data remains unscored',async()=>{
  await assert.rejects(store.create({...a,role:'lender'},'No escalation'),/Only business owners/);
  const business=await store.create(b,'Empty fictional owner');const detail=await store.detail(b,business.id);
  assert.equal(detail.metrics.score,null);assert.equal(detail.metrics.scoreStatus,'INSUFFICIENT_DATA');assert.equal(detail.transactions.length,0);
});
