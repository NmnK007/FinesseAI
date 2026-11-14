import { hindiAnswer } from '../copilot-hi';
import { visibleNetwork } from '../finance/network';
import { monitorDrift } from '../finance/drift';
import { activeReviewInputs,reviewInputSignals } from './review-inputs';
import { validateSeasonality } from '../finance/forecast-validation';
import { randomUUID } from 'node:crypto';
import type { Database } from './index';
import type { Actor } from '../security/auth-service';
import { ownedBusiness } from './businesses';
import { authorizedFacts,logAction,intelligenceStore } from './intelligence';
import { detectAlerts } from '../finance/anomalies';
import { simulate,observedBaseline,type ScenarioInput } from '../finance/scenario';
import { formatPaise } from '../finance/money';
import { AppError } from '../security/errors';
import { explainHealthIndex } from '../finance/health-insights';

export function analysisStore(db:Database){return {
 async read(user:Actor,businessId:string,asOf:string){return db.transaction(async sql=>{
  await ownedBusiness(sql,user,businessId,true);const facts=await authorizedFacts(sql,businessId);const alerts=detectAlerts(facts.cash,facts.evidence,asOf);
  const reviews=(await sql.query<{alert_key:string;status:string;note:string;created_at:string}>('SELECT alert_key,status,note,created_at FROM anomaly_reviews WHERE business_id=$1 ORDER BY created_at DESC',[businessId])).rows;
  const allowed=new Set([...facts.cash,...facts.evidence].map(r=>r.id));
  const scenarios=(await sql.query<{id:string;input:ScenarioInput;result:ReturnType<typeof simulate>;evidence_ids:string[];created_at:string}>('SELECT id,input,result,evidence_ids,created_at FROM scenarios WHERE business_id=$1 ORDER BY created_at DESC LIMIT 20',[businessId])).rows.filter(s=>s.evidence_ids.every(id=>allowed.has(id)));
  const reviewInputs=await activeReviewInputs(sql,businessId,allowed);
  return {network:visibleNetwork(facts.cash,asOf),drift:monitorDrift(facts.cash,asOf),reviewInputs,reviewInputSignals:reviewInputSignals(reviewInputs),sourceOptions:[...facts.cash.map(r=>({id:r.id,kind:"BANK",label:r.occurred_on+" · "+r.description})),...facts.evidence.filter(e=>e.kind==='INVOICE').map(e=>({id:e.id,kind:"INVOICE",label:e.data.key}))],alerts:alerts.map(a=>({...a,status:reviews.find(r=>r.alert_key===a.key)?.status||'OPEN',reviews:reviews.filter(r=>r.alert_key===a.key)})),baseline:observedBaseline(facts.cash,asOf),forecastValidation:validateSeasonality(facts.cash,asOf),scenarios};
 });},
 async review(user:Actor,businessId:string,key:string,status:string,note:string,asOf:string){return db.transaction(async sql=>{
  await ownedBusiness(sql,user,businessId,true);const facts=await authorizedFacts(sql,businessId);
  if(!detectAlerts(facts.cash,facts.evidence,asOf).some(a=>a.key===key))throw new AppError('FORBIDDEN',403,'Alert evidence unavailable.');
  await sql.query('INSERT INTO anomaly_reviews(id,business_id,alert_key,status,note,actor_id) VALUES ($1,$2,$3,$4,$5,$6)',[randomUUID(),businessId,key,status,note,user.id]);
  await logAction(sql,user,businessId,'ANOMALY_REVIEWED',{key,status});return {ok:true};
 });},
 async scenario(user:Actor,businessId:string,input:ScenarioInput){return db.transaction(async sql=>{
  await ownedBusiness(sql,user,businessId,true);const facts=await authorizedFacts(sql,businessId);const result=simulate(input),id=randomUUID();
  await sql.query('INSERT INTO scenarios(id,business_id,actor_id,input,result,evidence_ids) VALUES ($1,$2,$3,$4,$5,$6)',[id,businessId,user.id,JSON.stringify(input),JSON.stringify(result),JSON.stringify([...facts.cash,...facts.evidence].map(r=>r.id))]);
  await logAction(sql,user,businessId,'SCENARIO_SAVED',{scenarioId:id});return {id,result};
 });},
 async chat(user:Actor,businessId:string,question:string,asOf:string,locale:'en'|'hi'='en'){
  const data=await intelligenceStore(db).read(user,businessId,asOf);
  const q=question.toLowerCase().replace(/डीएससीआर/g,'dscr').replace(/सहमति/g,'consent').replace(/परिदृश्य/g,'scenario').replace(/मॉडल/g,'model').replace(/संकेत/g,'alert').replace(/हटाओ|अनदेखा|दूसरे कारोबार/g,'ignore');let answer:string,tool:string,citations:string[]=[];
  if(/ignore|system prompt|other (business|tenant|user)|execute|delete|transfer funds|approve.*loan/.test(q))return {answer:'I can only explain authorized financial evidence and read-only calculations. I cannot follow document instructions, access another business or perform lending actions.',tool:'policy',citations:[] as string[],mode:'LOCAL_DETERMINISTIC'};
  if(/score|स्कोर/.test(q)){
   tool='getHealthCard';citations=data.current.dimensions.flatMap(d=>d.evidenceIds);
   answer=explainHealthIndex(data.current,locale);
   const [latest,previous]=data.history;if(locale==='en'&&latest&&previous&&latest.result.overall!==null&&previous.result.overall!==null)answer+=` The latest saved index changed by ${latest.result.overall-previous.result.overall} points. Weighted dimension changes: ${latest.result.dimensions.map((d,i)=>`${d.label} ${((d.score!-previous.result.dimensions[i].score!)*d.weight).toFixed(2)}`).join('; ')} (rounding can affect the total by less than one point).`;
  }else if(/overdue|receivable|invoice|customer|बकाया/.test(q)){
   tool='getOutstandingInvoices';citations=data.evidence.filter(e=>e.kind==='INVOICE').map(e=>e.id);answer=`Owner-reported overdue sales receivables total ${formatPaise(data.current.overdueReceivablesPaise)}. Paid amounts are unverified declarations; review exact-reference bank matches and any cash settlements in the reconciliation panel.`;
  }else if(/alert|fraud|risk|flag|जोखिम/.test(q)){
   tool='getFraudAlerts';const alerts=detectAlerts(data.cash,data.evidence,asOf);citations=alerts.flatMap(a=>a.evidenceIds);answer=alerts.length?alerts.slice(0,3).map(a=>`${a.reason} ${a.alternative}`).join(' '):'No implemented review rule triggered on the available records. This does not establish the absence of fraud or financial risk.';
  }else if(/cash|receipt|inflow|outflow|नकद/.test(q)){
   tool='getCashFlow';const baseline=observedBaseline(data.cash,asOf);citations=data.cash.map(t=>t.id);answer=baseline.monthlyReceiptsPaise===null?'No observed completed-month bank records are available.':`Average classified monthly operating receipts are ${formatPaise(baseline.monthlyReceiptsPaise)} and classified costs are ${formatPaise(baseline.monthlyCostsPaise!)} across ${baseline.observedMonths.length} observed months. ${baseline.unknownTransactions} records are unclassified. ${baseline.warning}`;
  }else if(/default|pd|model|approval/.test(q)){tool='getModelStatus';answer='Model status is DEMO_ONLY / NOT_VALIDATED. Synthetic rule labels cannot substantiate real MSME default prediction or loan approval.';
  }else{
   tool='searchKnowledgeBase';const docs=(await db.query<{id:string;title:string;body:string}>('SELECT id,title,body FROM knowledge_documents WHERE search @@ plainto_tsquery(\'english\',$1) ORDER BY id LIMIT 3',[q.match(/dscr|consent|scenario/)?.[0]||question])).rows;
   answer=docs.length?docs.map(d=>`${d.title}: ${d.body}`).join('\n\n'):'I cannot answer that from the supported tools. Ask about the Health Index, cash receipts, overdue invoices, alerts, DSCR or model status. Use the scenario panel for numerical loan assumptions.';citations=docs.map(d=>'knowledge:'+d.id);
  }
  if(locale==='hi'&&tool!=='getHealthCard')answer=hindiAnswer(tool,data,detectAlerts(data.cash,data.evidence,asOf).length,observedBaseline(data.cash,asOf),citations);
  return {answer,tool,citations:[...new Set(citations)],mode:'LOCAL_DETERMINISTIC',limitation:'No external LLM was called. Numerical answers are computed from authorized records; uploaded text is never treated as instructions.'};
 }
};}
