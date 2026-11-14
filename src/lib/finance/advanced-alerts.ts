import { counterpartyKey } from './counterparty';
import type { CashRow,Evidence } from './assessment';
import type { Alert } from './anomalies';
import type { Invoice } from '../ingestion/evidence-csv';
import { sumPaise } from './money';
export function advancedAlerts(cash:CashRow[],evidence:Evidence[],asOf:string):Alert[]{
 const rows=cash.filter(r=>r.occurred_on<=asOf),alerts:Alert[]=[];
 const purchases=evidence.filter(e=>e.kind==='INVOICE'&&(e.data as Invoice).direction==='PURCHASE'&&(e.data as Invoice).issuedOn<=asOf) as (Evidence&{data:Invoice})[];
 const total=sumPaise(purchases.map(e=>e.data.amountPaise)),suppliers=new Map<string,typeof purchases>();
 for(const e of purchases){const key=counterpartyKey(e.data.counterparty);suppliers.set(key,[...(suppliers.get(key)||[]),e]);}
 for(const items of suppliers.values())if(purchases.length>=3&&total>0&&sumPaise(items.map(e=>e.data.amountPaise))/total>0.7)alerts.push({key:'supplier:'+items.map(e=>e.id).sort().join(':'),rule:'SUPPLIER_CONCENTRATION_V1',severity:'MEDIUM',evidenceIds:items.map(e=>e.id),reason:'One declared supplier represents over 70% of supplied purchase invoices.',alternative:'An exclusive distributor or incomplete purchase records can explain this. Review alternatives and contracts.'});
 // An edge requires exactly two opposite posted legs on two visible accounts, with an exact reference.
 // Ambiguous/reused references are omitted. No external account is fabricated.
 const refs=new Map<string,CashRow[]>();for(const r of rows)if(r.reference)refs.set(r.reference,[...(refs.get(r.reference)||[]),r]);
 const edges:{from:string;to:string;ids:string[];date:string;amount:number}[]=[];
 for(const items of refs.values())if(items.length===2){const debit=items.find(r=>Number(r.amount_paise)<0),credit=items.find(r=>Number(r.amount_paise)>0);if(debit&&credit&&debit.account_id!==credit.account_id&&Number(debit.amount_paise)+Number(credit.amount_paise)===0&&Math.abs(Date.parse(debit.occurred_on)-Date.parse(credit.occurred_on))<=86400000)edges.push({from:debit.account_id,to:credit.account_id,ids:items.map(r=>r.id),date:debit.occurred_on,amount:-Number(debit.amount_paise)});}
 const emitted=new Set<string>();
 const adjacency=new Map<string,typeof edges>();for(const e of edges)adjacency.set(e.from,[...(adjacency.get(e.from)||[]),e]);
 for(const a of edges)for(const b of adjacency.get(a.to)||[]){if(b.to===a.from||a.amount!==b.amount||b.date<a.date)continue;for(const c of adjacency.get(b.to)||[]){if(c.to!==a.from||c.amount!==a.amount||c.date<b.date||Date.parse(c.date)-Date.parse(a.date)>3*86400000)continue;const ids=[...a.ids,...b.ids,...c.ids].sort(),key='cycle:'+ids.join(':');if(emitted.has(key))continue;emitted.add(key);alerts.push({key,rule:'VISIBLE_THREE_ACCOUNT_CYCLE_V1',severity:'MEDIUM',evidenceIds:ids,reason:'Three authorized accounts show matching opposite legs forming an equal-amount cycle within three days.',alternative:'Treasury sweeps, cash pooling and settlement routing can be legitimate. Matching references do not prove common beneficial ownership or misconduct.'});}}
 const months=new Map<string,CashRow[]>();for(const r of rows)if(r.category==='BUSINESS_SALE'&&Number(r.amount_paise)>0&&r.occurred_on.slice(0,7)<asOf.slice(0,7)){const m=r.occurred_on.slice(0,7);months.set(m,[...(months.get(m)||[]),r]);}
 const ordered=[...months].sort(([a],[b])=>a.localeCompare(b));const median=(a:number[])=>{const s=[...a].sort((a,b)=>a-b),i=Math.floor(s.length/2);return s.length%2?s[i]:(s[i-1]+s[i])/2;};
 if(ordered.length>=7){const prior=ordered.slice(-7,-1),latest=ordered.at(-1)!;const values=prior.map(([,r])=>sumPaise(r.map(x=>Number(x.amount_paise)))),m=median(values),mad=median(values.map(v=>Math.abs(v-m))),last=sumPaise(latest[1].map(r=>Number(r.amount_paise)));if(m>0&&last>2*m&&last>m+3*1.4826*mad)alerts.push({key:'robust:'+latest[0],rule:'ROBUST_RECEIPT_SPIKE_V1',severity:'MEDIUM',evidenceIds:[...prior,latest].flatMap(([,r])=>r.map(t=>t.id)),reason:'Latest observed monthly receipts exceed twice the prior six-month median and the robust deviation threshold.',alternative:'Observed months may be partial or nonconsecutive. Seasonality, new contracts and delayed receipts need human review; this is not a seasonally fitted forecast.'});}
 return alerts;
}
