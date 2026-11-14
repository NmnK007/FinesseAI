import { counterpartyKey } from './counterparty';
import { sumPaise } from './money';
import type { Invoice,Utility,Gst,EvidenceData,EvidenceKind } from '../ingestion/evidence-csv';
export type Evidence={id:string;source_id?:string;kind:EvidenceKind;data:EvidenceData;origin:string};
export type CashRow={id:string;occurred_on:string;amount_paise:string;category:string;description:string;reference:string;account_id:string};
export const SCORING_VERSION='evidence-health-v3';
const clamp=(x:number)=>Math.max(0,Math.min(1000,Math.round(x)));
const mean=(xs:number[])=>xs.reduce((a,b)=>a+b,0)/xs.length;
const age=(asOf:string,date:string)=>(Date.parse(asOf)-Date.parse(date))/86400000;
export function assess(cash:CashRow[],evidence:Evidence[],asOf:string,applicability:{kind:string;applicable:boolean;reason?:string}[]=[]){
 const applicable=(kind:string)=>applicability.find(a=>a.kind===kind)?.applicable!==false;
 const bank=cash.filter(t=>t.occurred_on<=asOf);
 const invoices=evidence.filter(e=>e.kind==='INVOICE'&&(e.data as Invoice).issuedOn<=asOf) as (Evidence&{data:Invoice})[];
 const utility=evidence.filter(e=>e.kind==='UTILITY'&&(e.data as Utility).period<=asOf.slice(0,7)) as (Evidence&{data:Utility})[];
 const gst=evidence.filter(e=>e.kind==='GST'&&(e.data as Gst).period<asOf.slice(0,7)) as (Evidence&{data:Gst})[];
 const sales=invoices.filter(e=>e.data.direction==='SALE');
 const sources=[{kind:'BANK',ids:bank.map(t=>t.id),date:bank.map(t=>t.occurred_on).sort().at(-1)},...(['INVOICE','UTILITY','GST'] as const).map(kind=>({kind,ids:(kind==='INVOICE'?invoices:kind==='UTILITY'?utility:gst).map(e=>e.id),date:kind==='INVOICE'?invoices.map(e=>e.data.issuedOn).sort().at(-1):kind==='UTILITY'?utility.map(e=>e.data.period+'-01').sort().at(-1):gst.map(e=>e.data.period+'-01').sort().at(-1)}))];
 const coverage=sources.map(s=>({...s,status:!applicable(s.kind)?'NOT_APPLICABLE':!s.date?'MISSING':age(asOf,s.date)>120?'STALE':'UNVERIFIED'}));
 const recent=sales.filter(e=>age(asOf,e.data.issuedOn)<=365&&e.data.issuedOn.slice(0,7)<asOf.slice(0,7));
 const months=new Map<string,number>();for(const e of recent){const m=e.data.issuedOn.slice(0,7);months.set(m,sumPaise([months.get(m)||0,e.data.amountPaise]));}
 const ordered=[...months].sort(([a],[b])=>a.localeCompare(b));const values=ordered.map(([,n])=>n);
 const consecutive=ordered.every(([m],i)=>i===0||new Date(Date.UTC(+m.slice(0,4),+m.slice(5)-2,1)).toISOString().slice(0,7)===ordered[i-1][0]);
 const periodReady=values.length>=3&&consecutive&&coverage.find(s=>s.kind==='INVOICE')?.status==='UNVERIFIED';
 const cv=values.length&&mean(values)>0?Math.sqrt(mean(values.map(n=>(n-mean(values))**2)))/mean(values):null;
 const buyers=new Map<string,number>();for(const e of recent){const key=counterpartyKey(e.data.counterparty);buyers.set(key,sumPaise([buyers.get(key)||0,e.data.amountPaise]));}
 const salesTotal=sumPaise([...buyers.values()]);const topShare=salesTotal?Math.max(...buyers.values())/salesTotal:null;
 const dueGst=gst.filter(e=>applicable('GST')&&e.data.dueOn<=asOf);const timelyGst=dueGst.filter(e=>e.data.filedOn&&e.data.filedOn<=e.data.dueOn);
 const dueBills=utility.filter(e=>applicable('UTILITY')&&e.data.dueOn<=asOf&&!e.data.disputed);
 const paidBills=dueBills.filter(e=>e.data.paidPaise===e.data.amountPaise&&e.data.paidOn&&e.data.paidOn<=e.data.dueOn);
 const compliance=!applicable('GST')?(dueBills.length>=3&&coverage.find(s=>s.kind==='UTILITY')?.status==='UNVERIFIED'?clamp(1000*paidBills.length/dueBills.length):null):dueGst.length>=3&&coverage.find(s=>s.kind==='GST')?.status==='UNVERIFIED'?clamp(1000*(dueBills.length?0.8*timelyGst.length/dueGst.length+0.2*paidBills.length/dueBills.length:timelyGst.length/dueGst.length)):null;
 const growth=periodReady&&values[0]>0?(values.at(-1)!-values[0])/values[0]:null;
 const dimensions=[
  {key:'revenue',label:'Revenue stability',weight:0.30,score:periodReady&&cv!==null?clamp(1000*(1-2.5*cv)):null,evidenceIds:recent.map(e=>e.id)},
  {key:'compliance',label:'Filing/payment timeliness',weight:0.25,score:compliance,evidenceIds:[...dueGst,...dueBills].map(e=>e.id)},
  {key:'counterparty',label:'Customer diversification',weight:0.25,score:periodReady&&topShare!==null?clamp(1000*(1-topShare)):null,evidenceIds:recent.map(e=>e.id)},
  {key:'growth',label:'Observed sales growth',weight:0.20,score:growth!==null&&coverage.find(s=>s.kind==='BANK')?.status==='UNVERIFIED'?clamp(1000*(growth+0.3)/1.1):null,evidenceIds:[...recent.map(e=>e.id),...bank.map(t=>t.id)]},
 ];
 const ready=dimensions.every(d=>d.score!==null);
 const overall=ready?Math.round(dimensions.reduce((sum,d)=>sum+d.score!*d.weight,0)):null;
 const matches=invoices.map(e=>{
   const invoice=e.data,ref=invoice.key.slice(invoice.key.indexOf(':')+1).toLowerCase();
   const candidates=bank.filter(t=>t.reference?.toLowerCase()===ref&&t.occurred_on>=invoice.issuedOn&&Math.sign(Number(t.amount_paise))===(invoice.direction==='SALE'?1:-1));
   const matchedPaise=sumPaise(candidates.map(t=>Math.abs(Number(t.amount_paise))));
   return {key:e.id,invoiceId:e.id,transactionIds:candidates.map(t=>t.id),matchedPaise,invoicePaise:invoice.amountPaise,status:!candidates.length?'UNMATCHED':Math.abs(matchedPaise-invoice.amountPaise)<=1?'SUGGESTED_MATCH':'PARTIAL_OR_MISMATCH',reason:'Exact reference and direction; gross INR comparison within one paise. Review timing, cash payments, withheld tax and split receipts. Not automatic proof of settlement.'};
 });
 const gstGaps=gst.map(e=>{const receipts=sumPaise(bank.filter(t=>t.occurred_on.slice(0,7)===e.data.period&&t.category==='BUSINESS_SALE').map(t=>Number(t.amount_paise)));return {evidenceId:e.id,period:e.data.period,declaredSalesPaise:e.data.salesPaise,receiptsPaise:receipts,gapPaise:e.data.salesPaise-receipts,reason:'Accrual GST sales versus classified cash receipts; timing, cash sales, refunds and missing accounts can explain gaps.'};});
 return {version:SCORING_VERSION,asOf,overall,status:ready?'AVAILABLE_UNVERIFIED':'INSUFFICIENT_DATA',defaultProbability:null,dimensions,coverage,evidenceCoveragePct:Math.round(100*coverage.filter(c=>c.status==='UNVERIFIED').length/coverage.filter(c=>c.status!=='NOT_APPLICABLE').length),
  invoiceSalesPaise:salesTotal,overdueReceivablesPaise:sumPaise(sales.filter(e=>e.data.dueOn<asOf).map(e=>e.data.amountPaise-e.data.paidPaise)),
  utilities:utility.map(e=>({id:e.id,...e.data,status:e.data.disputed?'DISPUTED':e.data.paidPaise===e.data.amountPaise&&e.data.paidOn&&e.data.paidOn<=asOf?(e.data.paidOn<=e.data.dueOn?'ON_TIME':'LATE'):e.data.dueOn<asOf?'OVERDUE':'NOT_DUE'})),matches,gstGaps,
  limitations:['Descriptive internal index, not CIBIL or a default probability.','Three consecutive invoice months and at least three applicable due compliance records are required; no missing months are filled. Applicability is an owner declaration.','Coverage measures source availability, not prediction confidence.','Uploaded records and paid amounts are unverified. EPFO is unavailable and causes no penalty.']};
}
export type Assessment=ReturnType<typeof assess>;
