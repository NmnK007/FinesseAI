import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { parseDate,digest } from './bank-csv';
import { parsePaise } from '../finance/money';
import { AppError } from '../security/errors';

export const evidenceKind=z.enum(['INVOICE','UTILITY','GST']);
export type EvidenceKind=z.infer<typeof evidenceKind>;
export type Invoice={key:string;issuedOn:string;dueOn:string;counterparty:string;amountPaise:number;paidPaise:number;direction:'SALE'|'PURCHASE'};
export type Utility={key:string;period:string;dueOn:string;amountPaise:number;paidPaise:number;paidOn:string|null;disputed:boolean};
export type Gst={key:string;period:string;salesPaise:number;dueOn:string;filedOn:string|null};
export type EvidenceData=Invoice|Utility|Gst;
export type EvidenceRow={row:number;key:string;fingerprint:string;data:EvidenceData};
export type EvidencePreview={kind:EvidenceKind;rows:EvidenceRow[];rejected:{row:number;reason:string}[];skipped:{row:number;reason:string}[];warnings:string[]};
const text=(v:string,name:string)=>{if(!v||v.length>120)throw new Error(`${name} must contain 1–120 characters.`);return v;};
const month=(v:string)=>{if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(v))throw new Error('Period must be YYYY-MM.');parseDate(v+'-01');return v;};
const positive=(v:string)=>{const n=parsePaise(v);if(n<=0)throw new Error('Amount must be positive.');return n;};
export function parseEvidence(csv:string,kind:EvidenceKind):EvidencePreview {
 if(Buffer.byteLength(csv)>512000)throw new AppError('VALIDATION_ERROR',413,'CSV limit is 500 KB.');
 if(/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(csv))throw new AppError('VALIDATION_ERROR',400,'Plain UTF-8 CSV required.');
 let rows:string[][];
 try{rows=parse(csv,{bom:true,trim:true,skip_empty_lines:true,max_record_size:8000,relax_column_count:true});}catch{throw new AppError('VALIDATION_ERROR',400,'Malformed CSV.');}
 if(rows.length<2||rows.length>1001)throw new AppError('VALIDATION_ERROR',400,'Use 1–1000 data rows.');
 const headers=rows[0].map(h=>h.toLowerCase());
 const required=kind==='INVOICE'?['invoice_id','issued_on','due_on','counterparty','amount','paid_amount','direction']:kind==='UTILITY'?['bill_id','period','due_on','amount','paid_amount','paid_on','disputed']:['period','sales','due_on','filed_on'];
 if(headers.length>20||new Set(headers).size!==headers.length||required.some(h=>!headers.includes(h)))throw new AppError('VALIDATION_ERROR',400,`Required unique headers: ${required.join(', ')}; optional currency (INR).`);
 const result:EvidencePreview={kind,rows:[],rejected:[],skipped:[],warnings:['User-uploaded, unverified. Paid amounts and filing dates are owner assertions; bank matching is a separate review.']};
 const seen=new Map<string,string>();
 rows.slice(1).forEach((cells,index)=>{
   const row=index+2,get=(key:string)=>cells[headers.indexOf(key)]??'';
   try{
     if(cells.length!==headers.length)throw new Error('Row column count does not match the header.');
     if(headers.includes('currency')&&get('currency')!=='INR')throw new Error('Only INR is supported.');
     let data:EvidenceData;
     if(kind==='INVOICE'){
       const id=text(get('invoice_id'),'Invoice ID'),direction=get('direction');
       if(direction!=='SALE'&&direction!=='PURCHASE')throw new Error('Direction must be SALE or PURCHASE.');
       const issuedOn=parseDate(get('issued_on')),dueOn=parseDate(get('due_on'));
       if(dueOn<issuedOn)throw new Error('Due date precedes issue date.');
       const amountPaise=positive(get('amount')),paidPaise=parsePaise(get('paid_amount'));
       if(paidPaise<0||paidPaise>amountPaise)throw new Error('Paid amount must be between zero and invoice amount.');
       const counterparty=text(get('counterparty'),'Counterparty').replace(/\s+/g,' ');
       data={key:direction+':'+id,issuedOn,dueOn,counterparty,amountPaise,paidPaise,direction};
     }else if(kind==='UTILITY'){
       const amountPaise=positive(get('amount')),paidPaise=parsePaise(get('paid_amount')),paidOn=get('paid_on')?parseDate(get('paid_on')):null;
       if(paidPaise<0||paidPaise>amountPaise||((paidPaise>0)!==!!paidOn))throw new Error('Payment date and positive paid amount must agree; paid amount cannot exceed bill.');
       if(!['true','false'].includes(get('disputed')))throw new Error('Disputed must be true or false.');
       const dueOn=parseDate(get('due_on'));if(dueOn.slice(0,7)<month(get('period')))throw new Error('Due date precedes billing period.');
       data={key:text(get('bill_id'),'Bill ID'),period:month(get('period')),dueOn,amountPaise,paidPaise,paidOn,disputed:get('disputed')==='true'};
     }else{
       const period=month(get('period')),salesPaise=parsePaise(get('sales'));
       if(salesPaise<0)throw new Error('Sales cannot be negative in this summary format.');
       const dueOn=parseDate(get('due_on')),filedOn=get('filed_on')?parseDate(get('filed_on')):null;if(dueOn.slice(0,7)<period||filedOn&&filedOn.slice(0,7)<period)throw new Error('GST filing dates must match or follow their declared period.');
       data={key:period,period,salesPaise,dueOn,filedOn};
     }
     const fingerprint=digest(JSON.stringify(data));
     if(seen.has(data.key)){
       if(seen.get(data.key)!==fingerprint)throw new Error('Conflicting values for the same identifier; review source before importing.');
       result.skipped.push({row,reason:'Duplicate identifier and values.'});return;
     }
     seen.set(data.key,fingerprint);result.rows.push({row,key:data.key,fingerprint,data});
   }catch(error){result.rejected.push({row,reason:error instanceof Error?error.message:'Invalid row.'});}
 });
 return result;
}
