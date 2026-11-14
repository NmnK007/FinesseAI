import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { readFile,mkdir,writeFile } from 'node:fs/promises';
const base=process.env.SMOKE_URL||'http://localhost:3000',origin=new URL(base).origin;
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Local testing only');
const browser=await chromium.launch({headless:true}),owner=await browser.newContext({viewport:{width:1440,height:1000}}),reviewer=await browser.newContext(),page=await owner.newPage();
const errors=[],failures=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=500)failures.push(r.status());});
let businessId;
const post=async(context,path,data)=>{const r=await context.request.post(base+path,{headers:{origin},data});assert.ok(r.ok(),`${path}: ${r.status()} ${await r.text()}`);return r.json();};
async function login(context,email){await post(context,'/api/auth/request-otp',{email});for(let n=0;n<30;n++){const inbox=await(await fetch('http://127.0.0.1:8025/api/v1/messages')).json(),message=inbox.messages?.find(m=>m.To?.some(t=>t.Address===email));if(message){const full=await(await fetch(`http://127.0.0.1:8025/api/v1/message/${message.ID}`)).json(),code=full.Text.match(/\b\d{6}\b/)?.[0];if(code){await post(context,'/api/auth/verify-otp',{email,code});return;}}await new Promise(r=>setTimeout(r,200));}throw new Error('Missing test OTP');}
try{
 const stamp=Date.now(),ownerEmail=`intelligence-${stamp}@finnese.test`,reviewEmail='reviewer-browser@finnese.test';await login(owner,ownerEmail);await login(reviewer,reviewEmail);
 const created=await post(owner,'/api/businesses',{name:'Fictional intelligence smoke'});businessId=created.business.id;
 const bank=await post(owner,'/api/ingest/upload',{businessId,accountAlias:'Demo account',filename:'fictional-bank.csv',csv:await readFile('public/samples/fictional-bank.csv','utf8'),consent:true});await post(owner,'/api/ingest/jobs',{id:bank.id});
 await page.goto(base+'/intelligence');await page.getByLabel('Business',{exact:true}).selectOption(businessId);
 for(const kind of ['INVOICE','UTILITY','GST']){
  await page.getByLabel('Evidence type',{exact:true}).selectOption(kind);await page.getByLabel('Evidence CSV',{exact:true}).setInputFiles(`public/samples/${kind.toLowerCase()}.csv`);await page.getByRole('checkbox',{name:/I am authorized/}).check();
  await page.getByRole('button',{name:'Preview evidence',exact:true}).click();await page.getByRole('button',{name:'Confirm evidence import',exact:true}).waitFor();
  if(kind==='INVOICE'){
   const state=await(await owner.request.get(`${base}/api/intelligence?businessId=${businessId}`)).json(),job=state.batches.find(b=>b.status==='PREVIEW');assert.ok(job);
   assert.match(await(await owner.request.get(`${base}/api/intelligence/jobs?businessId=${businessId}&id=${job.id}&events=1`)).text(),/PREVIEW/);
   assert.equal((await reviewer.request.get(`${base}/api/intelligence/jobs?businessId=${businessId}&id=${job.id}`)).status(),403);
   await page.reload();await page.getByRole('button',{name:'Resume preview',exact:true}).click();await page.getByRole('checkbox',{name:/I am authorized/}).check();
  }
  const committed=page.waitForResponse(r=>r.url().endsWith('/api/intelligence')&&r.request().method()==='POST'&&r.request().postDataJSON()?.action==='commit');await page.getByRole('button',{name:'Confirm evidence import',exact:true}).click();assert.equal((await committed).status(),200);
  await page.getByRole('button',{name:'Save assessment',exact:true}).waitFor();await page.getByRole('button',{name:'Confirm evidence import',exact:true}).waitFor({state:'hidden'});
 }
 await page.getByText('Explore matching tolerances and withholding assumptions',{exact:true}).click();
 const matching=page.waitForResponse(r=>r.url().endsWith('/api/intelligence/reconcile'));await page.getByRole('button',{name:'Calculate review suggestions',exact:true}).click();assert.equal((await(await matching).json()).matches.length,3);
 await page.getByRole('button',{name:'Save assessment',exact:true}).click();
 await page.getByLabel('Question',{exact:true}).fill('What is DSCR?');await page.getByRole('button',{name:'Ask about my evidence',exact:true}).click();await page.getByText(/divided by debt service/).waitFor();
 await page.getByRole('button',{name:'Calculate and save scenario',exact:true}).click();await page.getByRole('button',{name:'Export scenario JSON',exact:true}).waitFor();
 await page.getByRole('button',{name:'Create simulated draft',exact:true}).first().click();await page.getByRole('button',{name:'Simulate submission (nothing is sent)',exact:true}).click();await page.getByText(/SIMULATED_SUBMISSION/).waitFor();
 const exported=await owner.request.get(`${base}/api/businesses/export?businessId=${businessId}`);assert.equal(exported.status(),200);const data=await exported.json();assert.equal(data.evidence.length,10);assert.equal(data.scenarios.length,1);assert.equal(data.applications[0].status,'SIMULATED_SUBMISSION');
 assert.equal((await reviewer.request.get(`${base}/api/businesses/export?businessId=${businessId}`)).status(),403);
 await page.getByLabel('Optional source',{exact:true}).selectOption('UTILITY');
 await page.getByLabel('This source applies to this business',{exact:true}).uncheck();
 await page.getByLabel('Reason for applicability',{exact:true}).fill('Fictional landlord pays utilities');
 const applicabilitySaved=page.waitForResponse(r=>r.url().endsWith('/api/intelligence')&&r.request().postDataJSON()?.action==='applicability');
 await page.getByRole('button',{name:'Save applicability',exact:true}).click();assert.equal((await applicabilitySaved).status(),200);
 await page.reload();await page.getByRole('button',{name:'Save applicability',exact:true}).waitFor();assert.equal(await page.getByLabel('This source applies to this business',{exact:true}).isChecked(),false);
 const current=await(await owner.request.get(`${base}/api/intelligence?businessId=${businessId}`)).json(),record=current.evidence.find(e=>e.kind==='INVOICE');
 await page.getByLabel('Record to correct',{exact:true}).selectOption(record.id);
 await page.getByLabel('Reason for correction',{exact:true}).fill('Fictional source correction test');
 const corrected=page.waitForResponse(r=>r.url().endsWith('/api/intelligence')&&r.request().postDataJSON()?.action==='correct');
 await page.getByRole('button',{name:'Save corrected revision',exact:true}).click();assert.equal((await corrected).status(),200);
 const latest=await(await owner.request.get(`${base}/api/intelligence?businessId=${businessId}`)).json(),revision=latest.evidence.find(e=>e.source_id===record.source_id);assert.notEqual(revision.id,record.id);
 const edit={action:'correct',businessId,recordId:revision.source_id,expectedId:revision.id,data:revision.data,reason:'Concurrent correction test'};
 const writes=await Promise.all([owner.request.post(base+'/api/intelligence',{headers:{origin},data:edit}),owner.request.post(base+'/api/intelligence',{headers:{origin},data:edit})]);assert.deepEqual(writes.map(r=>r.status()).sort(),[200,409],'Exactly one concurrent revision succeeds');
 await page.reload();await page.getByLabel('Reviewer email',{exact:true}).waitFor();
 await page.getByLabel('Reviewer email',{exact:true}).fill(reviewEmail);await page.getByRole('button',{name:'Grant seven-day review access',exact:true}).click();await page.getByRole('button',{name:'Revoke access',exact:true}).waitFor();
 const rp=await reviewer.newPage();await rp.goto(base+'/lender');await rp.getByLabel('Shared business',{exact:true}).selectOption(businessId);await rp.getByLabel('Review note',{exact:true}).fill('Fictional evidence reviewed; no lending decision.');await rp.getByRole('button',{name:'REVIEWED',exact:true}).click();await rp.getByText(/Fictional evidence reviewed/).waitFor();
 await mkdir('.test-artifacts',{recursive:true});await page.screenshot({path:'.test-artifacts/intelligence-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.test-artifacts/intelligence-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Owner mobile overflow');
 await rp.setViewportSize({width:390,height:844});await rp.screenshot({path:'.test-artifacts/reviewer-mobile.png',fullPage:true});assert.ok(await rp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Reviewer mobile overflow');
 assert.equal(await page.locator('input,select,textarea').evaluateAll(nodes=>nodes.filter(n=>!n.labels?.length&&!n.getAttribute('aria-label')&&!n.getAttribute('aria-labelledby')).length),0,'Visible inputs need accessible labels');
 const accessibility=[];
 for(const target of [page,rp])for(const locale of ['en','hi']){
  await target.locator('select').first().selectOption(locale);
  await target.waitForFunction(lang=>document.documentElement.lang===lang,locale);
  const result=await new AxeBuilder({page:target}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  accessibility.push({url:target.url(),locale,violations:result.violations});
 }
 await writeFile('.test-artifacts/accessibility.json',JSON.stringify(accessibility,null,2));
 assert.deepEqual(accessibility.flatMap(r=>r.violations.map(v=>({rule:v.id,nodes:v.nodes.map(n=>n.target)}))),[],'WCAG automated audit');
 await page.reload();await page.waitForFunction(()=>document.documentElement.lang==='hi');assert.equal(await page.locator('html').getAttribute('lang'),'hi','Language survives reload');
 await page.locator('select').first().selectOption('en');
 await page.getByRole('link',{name:'Skip to main content',exact:true}).focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement?.id),'main-content','Keyboard skip link');
 const durations=[];const loadStart=performance.now();await Promise.all(Array.from({length:8},async()=>{for(let i=0;i<10;i++){const start=performance.now();const response=await owner.request.get(`${base}/api/intelligence?businessId=${businessId}`);assert.equal(response.status(),200);const payload=await response.json();assert.ok(payload.evidence.every(e=>e.business_id===undefined||e.business_id===businessId));durations.push(performance.now()-start);}}));durations.sort((a,b)=>a-b);await writeFile('.test-artifacts/intelligence-performance.json',JSON.stringify({environment:'development + single-connection embedded PostgreSQL; not production capacity test',samples:durations.length,concurrentClients:8,elapsedMs:performance.now()-loadStart,medianMs:durations[40],p95Ms:durations[75],maxMs:durations.at(-1)},null,2));
 await page.getByRole('button',{name:'Revoke access',exact:true}).click();assert.equal((await reviewer.request.get(`${base}/api/lending?review=1&businessId=${businessId}`)).status(),403);
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);console.log('PASS: alternate imports, card, copilot, scenario, export, simulated lending, reviewer grant/revocation, mobile overflow, input labels and local timings');
}finally{if(businessId)await owner.request.delete(base+'/api/businesses',{headers:{origin},data:{id:businessId}});await browser.close();}
