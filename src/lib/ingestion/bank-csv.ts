import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { parsePaise } from '../finance/money';
import { AppError } from '../security/errors';

export const CATEGORIES = ['BUSINESS_SALE','CUSTOMER_REFUND','INTERNAL_TRANSFER','CAPITAL_INJECTION','LOAN_DISBURSEMENT','LOAN_EMI','SUPPLIER_PAYMENT','SALARY','TAX','UTILITY','FEES','UNKNOWN'] as const;
export type Category = typeof CATEGORIES[number];
export type Mapping = { date: string; description: string; amount?: string; debit?: string; credit?: string; balance?: string; reference?: string };
export type BankRow = { row: number; date: string; description: string; amountPaise: number; balancePaise: number | null; reference: string; fingerprint: string; category: Category; categoryConfidence: number; categoryMethod: string };
export type Issue = { row: number; reason: string };
export type Preview = { headers: string[]; mapping: Mapping; rows: BankRow[]; rejected: Issue[]; skipped: Issue[]; warnings: Issue[]; totalRows: number; parserVersion: string };
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const normalize = (text: string) => text.trim().replace(/\s+/g,' ').toLowerCase();

export function parseDate(value: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  const indian = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(value.trim());
  if (!iso && !indian) throw new Error('Use YYYY-MM-DD or DD/MM/YYYY dates.');
  const [year,month,day] = iso ? iso.slice(1).map(Number) : [Number(indian![3]),Number(indian![2]),Number(indian![1])];
  const date = new Date(Date.UTC(year,month-1,day));
  if (year < 2000 || year > 2100 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month-1 || date.getUTCDate() !== day) throw new Error('Invalid calendar date.');
  return date.toISOString().slice(0,10);
}

export function categorize(description: string, amount: number): { category: Category; categoryConfidence: number } {
  const value = description.toLowerCase();
  const matches: [RegExp,Category,number | null][] = [
    [/\b(refund|reversal)\b/,'CUSTOMER_REFUND',-1],
    [/\b(self|internal transfer|own account|sweep)\b/,'INTERNAL_TRANSFER',null],
    [/\b(capital|owner contribution|owner transfer)\b/,'CAPITAL_INJECTION',1],
    [/\b(loan disbursement|loan proceeds)\b/,'LOAN_DISBURSEMENT',1],
    [/\b(emi|loan repayment)\b/,'LOAN_EMI',-1],
    [/\b(salary|payroll)\b/,'SALARY',-1],
    [/\b(gst|tax|tds)\b/,'TAX',-1],
    [/\b(electricity|utility|internet bill|water bill)\b/,'UTILITY',-1],
    [/\b(fee|fees|charge|charges)\b/,'FEES',-1],
    [/\b(supplier|vendor)\b/,'SUPPLIER_PAYMENT',-1],
    [/\b(sale|sales|customer payment|invoice receipt)\b/,'BUSINESS_SALE',1],
  ];
  for (const [pattern,category,direction] of matches) {
    if (pattern.test(value)) return direction === null || Math.sign(amount) === direction ? {category,categoryConfidence:0.7} : {category:'UNKNOWN',categoryConfidence:0};
  }
  return { category:'UNKNOWN',categoryConfidence:0 };
}

export function parseBankCsv(csv: string, requested?: Mapping): Preview {
  if (Buffer.byteLength(csv,'utf8') > 512_000) throw new AppError('VALIDATION_ERROR',413,'CSV limit is 500 KB.');
  if (!csv.trim() || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(csv) || /^\s*(?:%PDF|PK\x03|<html|<!doctype)/i.test(csv)) throw new AppError('VALIDATION_ERROR',400,'Upload a plain UTF-8 CSV, not a document or binary file.');
  let records: string[][];
  try { records = parse(csv,{ bom:true,skip_empty_lines:true,trim:true,max_record_size:8000,relax_column_count:true }); }
  catch { throw new AppError('VALIDATION_ERROR',400,'Malformed CSV quoting or oversized row.'); }
  if (records.length < 2 || records.length > 1001) throw new AppError('VALIDATION_ERROR',400,'CSV must contain 1–1000 data rows.');
  const headers = records[0];
  if (headers.length > 30 || new Set(headers.map(normalize)).size !== headers.length || headers.some(h=>!h || h.length>100)) throw new AppError('VALIDATION_ERROR',400,'Use 1–30 unique, nonempty column headers.');
  const find = (...names: string[]) => headers.find(h=>names.includes(normalize(h)));
  const mapping: Mapping = requested ?? {
    date:find('date','transaction date','txn date','posted date') ?? '',
    description:find('description','narration','particulars','remarks') ?? '',
    amount:find('amount','signed amount'), debit:find('debit','withdrawal','withdrawals','withdrawal amt.'),
    credit:find('credit','deposit','deposits','deposit amt.'), balance:find('balance','closing balance','running balance'), reference:find('reference','transaction id','ref','utr'),
  };
  if (!mapping.date || !mapping.description || (!mapping.amount && !mapping.debit && !mapping.credit)) throw new AppError('VALIDATION_ERROR',400,'Map date, description and either signed amount or debit/credit columns.');
  if (mapping.amount && (mapping.debit || mapping.credit)) { if (requested) throw new AppError('VALIDATION_ERROR',400,'Choose signed amount OR debit/credit mapping.'); delete mapping.debit; delete mapping.credit; }
  const mapped = Object.values(mapping).filter(Boolean);
  if (mapped.some(h=>!headers.includes(h)) || new Set(mapped).size !== mapped.length) throw new AppError('VALIDATION_ERROR',400,'Each mapped column must exist and be used once.');
  const rows: BankRow[] = [], rejected: Issue[] = [], skipped: Issue[] = [], warnings: Issue[] = [];
  const seen = new Set<string>();
  const currencyIndex = headers.findIndex(h=>normalize(h)==='currency');
  for (let i=1;i<records.length;i++) {
    const cells = records[i], row=i+1;
    const get = (key: keyof Mapping) => mapping[key] ? (cells[headers.indexOf(mapping[key]!)] ?? '').trim() : '';
    try {
      if (cells.length !== headers.length) throw new Error('Column count differs from header.');
      if (currencyIndex >= 0 && cells[currencyIndex].toUpperCase() !== 'INR') throw new Error('Only INR is supported.');
      const date = parseDate(get('date'));
      const description = get('description');
      if (!description || description.length > 500) throw new Error('Description must have 1–500 characters.');
      let amountPaise: number;
      if (mapping.amount) amountPaise = parsePaise(get('amount'));
      else {
        const debit = get('debit') ? parsePaise(get('debit')) : 0;
        const credit = get('credit') ? parsePaise(get('credit')) : 0;
        if (debit<0 || credit<0 || (debit>0 && credit>0)) throw new Error('Use one nonnegative debit or credit per row.');
        amountPaise = credit-debit;
      }
      if (amountPaise===0) throw new Error('Zero-value transactions are not imported.');
      const balancePaise = get('balance') ? parsePaise(get('balance')) : null;
      const reference = get('reference');
      if (reference.length>100) throw new Error('Reference exceeds 100 characters.');
      const fingerprint = digest(JSON.stringify([date,normalize(description),amountPaise,balancePaise,normalize(reference)]));
      if (seen.has(fingerprint)) { skipped.push({row,reason:'Identical row skipped. If genuinely distinct, supply a unique transaction reference.'}); continue; }
      seen.add(fingerprint);
      const category = categorize(description,amountPaise);
      rows.push({row,date,description,amountPaise,balancePaise,reference,fingerprint,...category,categoryMethod:'inferred'});
    } catch (error) { rejected.push({row,reason:error instanceof Error ? error.message : 'Invalid row.'}); }
  }
  // Reconcile only in supplied ascending order; do not invent order for same-day events.
  if (rows.some((r,i)=>i>0 && r.date<rows[i-1].date)) warnings.push({row:0,reason:'Rows are not chronological. Balance reconciliation was not evaluated; sort oldest first.'});
  else for (let i=1;i<rows.length;i++) {
    const prev=rows[i-1], next=rows[i];
    if (prev.balancePaise!==null && next.balancePaise!==null && prev.balancePaise+next.amountPaise!==next.balancePaise) warnings.push({row:next.row,reason:'Balance does not reconcile with preceding accepted row; check gaps, order or missing transactions.'});
  }
  warnings.push({row:0,reason:'Uploaded evidence is unverified. Categories are inferred from narration; review them before importing. Receipts are not accrual revenue.'});
  return {headers,mapping,rows,rejected,skipped,warnings,totalRows:records.length-1,parserVersion:'bank-csv-v1'};
}
