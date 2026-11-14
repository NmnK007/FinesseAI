import { z } from 'zod';
import type { CashRow,Evidence } from './assessment';
import type { Invoice } from '../ingestion/evidence-csv';
import { sumPaise } from './money';
export const matchingOptions=z.object({tolerancePaise:z.number().int().min(0).max(10000).default(1),windowDays:z.number().int().min(1).max(180).default(90),withholdingPct:z.number().min(0).max(30).default(0),allowNarrationMatch:z.boolean().default(false)});
export function reconcile(cash:CashRow[],evidence:Evidence[],asOf:string,raw:unknown){
 const options=matchingOptions.parse(raw),bank=cash.filter(r=>r.occurred_on<=asOf);
 return {options,mode:'REVIEW_SUGGESTIONS_ONLY',matches:evidence.filter(e=>e.kind==='INVOICE'&&(e.data as Invoice).issuedOn<=asOf).map(e=>{
  const invoice=e.data as Invoice,reference=invoice.key.slice(invoice.key.indexOf(':')+1).toLowerCase();
  const eligible=bank.filter(t=>Math.sign(Number(t.amount_paise))===(invoice.direction==='SALE'?1:-1)&&t.occurred_on>=invoice.issuedOn&&(Date.parse(t.occurred_on)-Date.parse(invoice.issuedOn))/86400000<=options.windowDays);
  let candidates=eligible.filter(t=>t.reference?.toLowerCase()===reference),method='EXACT_REFERENCE';
  if(!candidates.length&&options.allowNarrationMatch){const tokens=invoice.counterparty.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[];candidates=eligible.filter(t=>tokens.length>=2&&tokens.every(token=>t.description.toLowerCase().includes(token)));method='NARRATION_TOKENS_LOW_CONFIDENCE';}
  const expectedPaise=Math.round(invoice.amountPaise*(1-options.withholdingPct/100)),matchedPaise=sumPaise(candidates.map(t=>Math.abs(Number(t.amount_paise))));
  return {invoiceId:e.id,transactionIds:candidates.map(t=>t.id),method,expectedPaise,matchedPaise,status:!candidates.length?'UNMATCHED':Math.abs(expectedPaise-matchedPaise)<=options.tolerancePaise?'SUGGESTED_MATCH':'PARTIAL_OR_AMBIGUOUS',caveat:'User-supplied withholding assumption is not verified tax treatment. Narration is not verified counterparty identity. Candidates may overlap other invoices; reviewer confirmation is required.'};
 })};
}
