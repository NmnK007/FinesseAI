import { z } from 'zod';
import type { CashRow,Evidence } from './assessment';
import type { Invoice } from '../ingestion/evidence-csv';
import { sumPaise } from './money';
export const matchingOptions=z.object({tolerancePaise:z.number().int().min(0).max(10000).default(1),windowDays:z.number().int().min(1).max(180).default(90),withholdingPct:z.number().min(0).max(30).default(0),allowNarrationMatch:z.boolean().default(false)});
const excludedCategories = new Set(['INTERNAL_TRANSFER', 'CAPITAL_INJECTION', 'LOAN_DISBURSEMENT', 'LOAN_EMI', 'CUSTOMER_REFUND', 'SALARY', 'TAX', 'UTILITY', 'FEES']);
const normalizeReference = (value: string) => value.trim().toLowerCase();
type Options = z.infer<typeof matchingOptions>;

export function invoiceCandidates(cash: CashRow[], evidence: Evidence[], asOf: string, options: Options) {
 const bank = cash.filter(row => row.occurred_on <= asOf && !excludedCategories.has(row.category));
 const byReference = new Map<string, CashRow[]>();
 for (const row of bank) {
  const reference = normalizeReference(row.reference || '');
  if (!reference) continue;
  const group = byReference.get(reference) ?? [];
  group.push(row);
  byReference.set(reference, group);
 }
 const matches = evidence.filter(e => e.kind === 'INVOICE' && (e.data as Invoice).issuedOn <= asOf).map(e => {
  const invoice = e.data as Invoice;
  const reference = normalizeReference(invoice.key.slice(invoice.key.indexOf(':') + 1));
  const direction = invoice.direction === 'SALE' ? 1 : -1;
  const eligible = (row: CashRow) => Math.sign(Number(row.amount_paise)) === direction &&
    row.occurred_on >= invoice.issuedOn &&
    (Date.parse(row.occurred_on) - Date.parse(invoice.issuedOn)) / 86400000 <= options.windowDays;
  let candidates = (byReference.get(reference) ?? []).filter(eligible);
  let method = 'EXACT_REFERENCE';
  if (!candidates.length && options.allowNarrationMatch) {
   const tokens = [...new Set(invoice.counterparty.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])];
   if (tokens.length >= 2) {
    candidates = bank.filter(row => {
     // Do not override a different posted reference with a weaker name match.
     if (normalizeReference(row.reference || '') || !eligible(row)) return false;
     const words = new Set(row.description.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
     return tokens.every(token => words.has(token));
    });
    if (candidates.length) method = 'NARRATION_TOKENS_LOW_CONFIDENCE';
   }
  }
  return {invoiceId: e.id, transactionIds: candidates.map(row => row.id), method,
   expectedPaise: Math.round(invoice.amountPaise * (1 - options.withholdingPct / 100)),
   matchedPaise: sumPaise(candidates.map(row => Math.abs(Number(row.amount_paise))))};
 });
 const uses = new Map<string, number>();
 for (const match of matches) for (const id of match.transactionIds) uses.set(id, (uses.get(id) ?? 0) + 1);
 return matches.map(match => ({...match, shared: match.transactionIds.some(id => (uses.get(id) ?? 0) > 1)}));
}

export function reconcile(cash:CashRow[],evidence:Evidence[],asOf:string,raw:unknown){
 const options = matchingOptions.parse(raw);
 return {options, mode: 'REVIEW_SUGGESTIONS_ONLY', matches: invoiceCandidates(cash, evidence, asOf, options).map(match => ({
  ...match,
  status: !match.transactionIds.length ? 'UNMATCHED' :
   !match.shared && match.method === 'EXACT_REFERENCE' && Math.abs(match.expectedPaise - match.matchedPaise) <= options.tolerancePaise
    ? 'SUGGESTED_MATCH' : 'PARTIAL_OR_AMBIGUOUS',
  caveat: match.shared ? 'One or more bank rows are candidates for multiple invoices. Review the allocation before confirming.' :
   'Withholding is a review assumption. Narration and payment candidates require reviewer confirmation.'
 }))};
}
