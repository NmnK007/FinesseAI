import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir,readFile } from 'node:fs/promises';
const base=process.env.SMOKE_URL||'http://localhost:3000';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Smoke tests only run on localhost.');
const origin=new URL(base).origin;
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const page=await context.newPage();
const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
const serverFailures=[];page.on('response',response=>{if(response.url().startsWith(base+'/api/')&&response.status()>=500)serverFailures.push(response.status());});
const stamp=Date.now();const email=`smoke-${stamp}@finnese.test`;
async function codeFor(email){
  for(let i=0;i<30;i++){
    const response=await fetch('http://127.0.0.1:8025/api/v1/messages');const inbox=await response.json();
    const message=inbox.messages?.find(message=>message.To?.some(to=>to.Address===email));
    if(message){const full=await (await fetch(`http://127.0.0.1:8025/api/v1/message/${message.ID}`)).json();const code=full.Text.match(/\b\d{6}\b/)?.[0];if(code)return code;}
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  throw new Error('OTP did not arrive in Mailpit.');
}
const post=(request,path,data)=>request.post(`${base}${path}`,{headers:{origin},data});
try{
  assert.equal((await context.request.get(`${base}/api/businesses`)).status(),401);
  assert.equal((await context.request.get(`${base}/api/health-card?gstin=22AAAAA0000A1Z5`)).status(),401);
  assert.equal((await context.request.post(`${base}/api/auth/request-otp`,{headers:{origin:'https://untrusted.example'},data:{email}})).status(),403);
  await page.goto(`${base}/login/customer`);
  await page.getByLabel('Development email').fill(email);
  await page.getByRole('button',{name:'Send code to development inbox'}).click();
  await page.getByLabel('Six-digit code').waitFor();const code=await codeFor(email);
  await page.getByLabel('Six-digit code').fill(code);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.waitForURL('**/data-sources');
  const cookie=(await context.cookies()).find(c=>c.name==='finnese_session');assert.ok(cookie?.httpOnly);assert.equal(cookie.sameSite,'Lax');
  assert.equal((await post(context.request,'/api/auth/verify-otp',{email,code})).status(),401);
  await page.getByLabel('Business name',{exact:true}).fill(`Fictional smoke business ${stamp}`);
  await page.getByRole('button',{name:'Create business',exact:true}).click();
  await page.getByRole('heading',{name:'Import a bank CSV'}).waitFor();
  await page.getByLabel('Bank statement',{exact:true}).setInputFiles('public/samples/fictional-bank.csv');
  await page.getByRole('checkbox',{name:/I am authorized/}).check();
  const previewResponse=page.waitForResponse(r=>r.url().endsWith('/api/ingest/upload')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Preview import',exact:true}).click();const preview=await(await previewResponse).json();assert.ok(preview.id);
  await page.getByRole('heading',{name:'Review before importing'}).waitFor();
  assert.match(await page.locator('body').innerText(),/10 accepted · 1 rejected · 1 skipped/);
  await page.getByRole('button',{name:'Confirm import',exact:true}).click();
  await page.getByText('Import complete: 10 stored, 1 skipped, 1 rejected.',{exact:true}).waitFor();
  const listed=await(await context.request.get(`${base}/api/businesses`)).json();const business=listed.businesses.find(b=>b.name===`Fictional smoke business ${stamp}`);assert.ok(business);
  const detail=await(await context.request.get(`${base}/api/businesses?id=${business.id}`)).json();assert.equal(detail.metrics.netMovementPaise,16925025);assert.equal(detail.metrics.salesReceiptsPaise,5500050);assert.equal(detail.metrics.score,null);
  assert.equal((await post(context.request,'/api/ingest/jobs',{id:preview.id})).status(),200);
  const events=await context.request.get(`${base}/api/ingest/jobs?id=${preview.id}&events=1`);assert.match(await events.text(),/COMPLETED/);
  const repeat=await(await post(context.request,'/api/ingest/upload',{businessId:business.id,accountAlias:'Operating account',filename:'renamed.csv',csv:await readFile('public/samples/fictional-bank.csv','utf8'),consent:true})).json();
  assert.equal(repeat.preview.rows.length,0);await post(context.request,'/api/ingest/jobs',{id:repeat.id});
  const unknown=await context.request.get(`${base}/api/health-card?gstin=22AAAAA0000A1Z5`);assert.equal(unknown.status(),404);assert.equal((await unknown.json()).error.code,'DATA_NOT_AVAILABLE');
  assert.equal((await post(context.request,'/api/ingest/upload',{businessId:business.id,accountAlias:'Operating account',filename:'bad.csv',csv:'%PDF\u0000',consent:true})).status(),400);
  assert.equal((await post(context.request,'/api/ingest/upload',{businessId:business.id,accountAlias:'Operating account',filename:'big.csv',csv:'x'.repeat(1_000_001),consent:true})).status(),413);
  const bob=await browser.newContext();const bobEmail=`second-${stamp}@finnese.test`;
  assert.equal((await post(bob.request,'/api/auth/request-otp',{email:bobEmail})).status(),200);
  assert.equal((await post(bob.request,'/api/auth/verify-otp',{email:bobEmail,code:await codeFor(bobEmail)})).status(),200);
  assert.equal((await bob.request.get(`${base}/api/businesses?id=${business.id}`)).status(),403);
  assert.equal((await bob.request.get(`${base}/api/ingest/jobs?id=${preview.id}&events=1`)).status(),403);
  assert.equal((await post(bob.request,'/api/ingest/jobs',{id:preview.id})).status(),403);
  await bob.close();
  await page.goto(`${base}/dashboard`);await page.getByText('Health Score: not available',{exact:true}).waitFor();
  await mkdir('.test-artifacts',{recursive:true});await page.screenshot({path:'.test-artifacts/phase1-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.test-artifacts/phase1-mobile.png',fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Mobile viewport must not overflow horizontally');
  await page.goto(`${base}/dashboard?mode=demo`);await page.getByText(/SYNTHETIC DEMO · All business evidence/).waitFor();
  assert.equal((await context.request.get(`${base}/dashboard?mode=demo&gstin=22AAAAA0000A1Z5`)).status(),404);
  const revoke=await post(context.request,'/api/businesses/consent',{businessId:business.id,consentId:detail.sources[0].consent_id});assert.equal(revoke.status(),200);
  assert.equal((await(await context.request.get(`${base}/api/businesses?id=${business.id}`)).json()).metrics.transactionCount,0);
  const deleted=await context.request.delete(`${base}/api/businesses`,{headers:{origin},data:{id:business.id}});assert.equal(deleted.status(),200);
  assert.equal((await context.request.delete(`${base}/api/auth/session`,{headers:{origin}})).status(),200);
  assert.equal((await context.request.get(`${base}/api/businesses`)).status(),401);
  assert.deepEqual(pageErrors,[]);
  assert.deepEqual(serverFailures,[],'Browser API requests must not return server errors');
  console.log('PASS: real Mailpit OTP -> HttpOnly session -> owner business -> CSV preview -> persisted metrics; duplicate, SSE, tenant, CSRF, unknown GSTIN, malformed/large upload, mobile, demo, revocation, deletion and logout checks.');
} finally {await browser.close();}
