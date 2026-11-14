import { z } from 'zod';
import { parseDate } from './bank-csv';
import type { EvidenceData,EvidenceKind } from './evidence-csv';
const date=z.string().refine(v=>{try{return parseDate(v)===v;}catch{return false;}},'Use a valid ISO date');
const month=z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
const amount=z.number().int().min(0).max(1e12);
const common={key:z.string().min(1).max(150)};
const invoice=z.object({...common,issuedOn:date,dueOn:date,counterparty:z.string().trim().min(1).max(120),amountPaise:amount.positive(),paidPaise:amount,direction:z.enum(['SALE','PURCHASE'])}).strict().refine(v=>v.dueOn>=v.issuedOn&&v.paidPaise<=v.amountPaise);
const utility=z.object({...common,period:month,dueOn:date,amountPaise:amount.positive(),paidPaise:amount,paidOn:date.nullable(),disputed:z.boolean()}).strict().refine(v=>v.dueOn.slice(0,7)>=v.period&&v.paidPaise<=v.amountPaise&&(v.paidPaise>0)===!!v.paidOn);
const gst=z.object({...common,period:month,salesPaise:amount,dueOn:date,filedOn:date.nullable()}).strict().refine(v=>v.dueOn.slice(0,7)>=v.period&&(!v.filedOn||v.filedOn.slice(0,7)>=v.period));
export function validateCorrection(kind:EvidenceKind,key:string,value:unknown):EvidenceData {
 const result=(kind==='INVOICE'?invoice:kind==='UTILITY'?utility:gst).parse(value);
 if(result.key!==key)throw new Error('Correction must preserve the original record identity');
 if(kind==='INVOICE'&&'direction' in result&&!key.startsWith(result.direction+':'))throw new Error('Direction cannot change');
 if(kind==='GST'&&'period' in result&&result.period!==key)throw new Error('Period cannot change');
 return result;
}
