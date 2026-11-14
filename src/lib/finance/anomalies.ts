import { counterpartyKey } from './counterparty';
import type { CashRow,Evidence } from './assessment';
import { assess } from './assessment';
import type { Invoice } from '../ingestion/evidence-csv';
import { sumPaise } from './money';
import { advancedAlerts } from './advanced-alerts';
export type Alert={key:string;rule:string;severity:'MEDIUM'|'HIGH';evidenceIds:string[];reason:string;alternative:string};
export function detectAlerts(cash:CashRow[],evidence:Evidence[],asOf:string){
 const alerts:Alert[]=[];const usable=cash.filter(t=>t.occurred_on<=asOf);
 // Only actual shared references are compared. No synthetic graph edges or inferred account ownership.
 const seen=new Set<string>();
 for(const a of usable){if(Number(a.amount_paise)<=0||!a.reference||['INTERNAL_TRANSFER','CUSTOMER_REFUND'].includes(a.category))continue;
  const match=usable.find(b=>b.id!==a.id&&b.reference===a.reference&&Number(b.amount_paise)<0&&!['INTERNAL_TRANSFER','CUSTOMER_REFUND'].includes(b.category)&&Math.abs(Number(a.amount_paise)+Number(b.amount_paise))<=1&&b.occurred_on>=a.occurred_on&&Date.parse(b.occurred_on)-Date.parse(a.occurred_on)<=2*86400000);
  if(match){const ids=[a.id,match.id].sort();const key='rapid:'+ids.join(':');if(!seen.has(key)){seen.add(key);alerts.push({key,rule:'RAPID_SAME_REFERENCE_V1',severity:'MEDIUM',evidenceIds:ids,reason:'Equal inflow and outflow share a reference within two days.',alternative:'Could be a legitimate reversal, refund or settlement. A shared reference does not establish a counterparty relationship or fraud.'});}}
 }
 const invoices=evidence.filter(e=>e.kind==='INVOICE'&&(e.data as Invoice).direction==='SALE'&&(e.data as Invoice).issuedOn<=asOf) as (Evidence&{data:Invoice})[];
 const invoiceGroups=new Map<string,typeof invoices>();
 for(const invoice of invoices){
  const data=invoice.data;
  const key=JSON.stringify([counterpartyKey(data.counterparty),data.issuedOn,data.dueOn,data.amountPaise]);
  const group=invoiceGroups.get(key)??[];
  group.push(invoice);
  invoiceGroups.set(key,group);
 }
 for(const group of invoiceGroups.values()){
  if(new Set(group.map(invoice=>invoice.data.key)).size<2)continue;
  const ids=group.map(invoice=>invoice.id).sort();
  alerts.push({key:'similar-invoice:'+ids.join(':'),rule:'SIMILAR_SALES_INVOICES_V1',severity:'MEDIUM',
   evidenceIds:ids,reason:'Sales invoices with different identifiers share the same declared buyer, issue date, due date and amount.',
   alternative:'Recurring charges or separate orders can produce identical totals. Compare the original invoices and orders.'});
 }
 const total=sumPaise(invoices.map(e=>e.data.amountPaise)),buyers=new Map<string,typeof invoices>();for(const e of invoices){const key=counterpartyKey(e.data.counterparty);buyers.set(key,[...(buyers.get(key)||[]),e]);}
 for(const entries of buyers.values()){const amount=sumPaise(entries.map(e=>e.data.amountPaise));if(invoices.length>=3&&total&&amount/total>0.7)alerts.push({key:'concentration:'+entries.map(e=>e.id).sort().join(':'),rule:'BUYER_CONCENTRATION_V1',severity:'MEDIUM',evidenceIds:entries.map(e=>e.id),reason:`One declared buyer accounts for ${Math.round(100*amount/total)}% of supplied invoice sales.`,alternative:'A stable anchor customer or incomplete invoice coverage can explain concentration; review contracts and collection history.'});}
 const card=assess(usable,evidence,asOf);
 const bankByMonth=new Map<string,CashRow[]>();
 for(const row of usable){
  const month=row.occurred_on.slice(0,7),group=bankByMonth.get(month)??[];
  group.push(row);
  bankByMonth.set(month,group);
 }
 for(const gap of card.gstGaps){
  const rows=bankByMonth.get(gap.period);
  if(!rows||gap.declaredSalesPaise<=0||Math.abs(gap.gapPaise)/gap.declaredSalesPaise<=0.3)continue;
  const receipts=rows.filter(row=>row.category==='BUSINESS_SALE');
  alerts.push({key:'gst:'+gap.evidenceId,rule:'GST_RECEIPTS_GAP_V2',severity:'MEDIUM',
   evidenceIds:[gap.evidenceId,...(receipts.length?receipts:rows).map(row=>row.id)],
   reason:`Declared sales and classified bank receipts differ by more than 30% in ${gap.period}.`,alternative:gap.reason});
 }
 const sharedPayments=new Map<string,string[]>();
 for(const match of card.matches){
  if(!match.shared)continue;
  for(const id of match.transactionIds)sharedPayments.set(id,[...(sharedPayments.get(id)??[]),match.invoiceId]);
 }
 for(const [id,invoiceIds] of sharedPayments){
  if(invoiceIds.length<2)continue;
  const ids=[...new Set(invoiceIds)].sort();
  alerts.push({key:'shared-payment:'+id+':'+ids.join(':'),rule:'SHARED_INVOICE_PAYMENT_V1',severity:'MEDIUM',
   evidenceIds:[id,...ids],reason:'One posted bank transaction is a candidate for multiple invoices.',
   alternative:'A reused reference or a combined payment can explain this. Review allocation before confirming settlement.'});
 }
 const months=new Map<string,typeof usable>();for(const t of usable.filter(t=>t.category==='BUSINESS_SALE'&&Number(t.amount_paise)>0&&t.occurred_on.slice(0,7)<asOf.slice(0,7))){const m=t.occurred_on.slice(0,7);months.set(m,[...(months.get(m)||[]),t]);}
 const ordered=[...months].sort(([a],[b])=>a.localeCompare(b));if(ordered.length>=4){const tail=ordered.slice(-4),base=tail.slice(0,3).map(([,rows])=>sumPaise(rows.map(r=>Number(r.amount_paise)))),last=sumPaise(tail[3][1].map(r=>Number(r.amount_paise))),avg=sumPaise(base)/3;if(avg>0&&last>3*avg)alerts.push({key:'spike:'+tail[3][0],rule:'RECEIPT_SPIKE_V1',severity:'MEDIUM',evidenceIds:tail.flatMap(([,rows])=>rows.map(r=>r.id)),reason:'Latest observed monthly receipts exceed three times the preceding three observed months.',alternative:'Seasonality, partial statements, a new contract or delayed collections may explain the increase.'});}
 return [...alerts,...advancedAlerts(cash,evidence,asOf)];
}
