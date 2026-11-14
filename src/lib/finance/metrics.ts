import { sumPaise } from './money';
import type { Category } from '../ingestion/bank-csv';
export type MetricTransaction = { occurred_on: string; amount_paise: string | number; category: Category; balance_paise: string | number | null; account_id: string };
export function financialMetrics(rows: MetricTransaction[]) {
  const months = new Map<string, {month:string;inflowPaise:number;outflowPaise:number;salesReceiptsPaise:number;customerRefundsPaise:number}>();
  for (const row of rows) {
    const month=row.occurred_on.slice(0,7), amount=Number(row.amount_paise);
    if (!Number.isSafeInteger(amount)) throw new Error('Invalid paise precision');
    const bucket=months.get(month) ?? {month,inflowPaise:0,outflowPaise:0,salesReceiptsPaise:0,customerRefundsPaise:0};
    if (amount>0) bucket.inflowPaise=sumPaise([bucket.inflowPaise,amount]);
    else bucket.outflowPaise=sumPaise([bucket.outflowPaise,-amount]);
    if (row.category==='BUSINESS_SALE' && amount>0) bucket.salesReceiptsPaise=sumPaise([bucket.salesReceiptsPaise,amount]);
    if (row.category==='CUSTOMER_REFUND' && amount<0) bucket.customerRefundsPaise=sumPaise([bucket.customerRefundsPaise,-amount]);
    months.set(month,bucket);
  }
  const monthly = [...months.values()].sort((a,b)=>a.month.localeCompare(b.month));
  return {
    version:'cash-metrics-v1', transactionCount:rows.length, monthly,
    inflowPaise:sumPaise(monthly.map(m=>m.inflowPaise)), outflowPaise:sumPaise(monthly.map(m=>m.outflowPaise)),
    salesReceiptsPaise:sumPaise(monthly.map(m=>m.salesReceiptsPaise)),
    customerRefundsPaise:sumPaise(monthly.map(m=>m.customerRefundsPaise)),
    netMovementPaise:sumPaise(rows.map(r=>Number(r.amount_paise))),
    unknownCount:rows.filter(r=>r.category==='UNKNOWN').length,
    sourceStatus:'USER_UPLOADED_UNVERIFIED', score:null, scoreStatus:'INSUFFICIENT_DATA', defaultProbability:null,
    missing:['GST filings','Invoice revenue and receivables','Utility payment evidence','Verified repayment outcome labels'],
    limitations:['Gross flows may include internal transfers across accounts.','Sales receipts use reviewed narration categories, not verified revenue.','Partial months and absent months are not assumed complete.','No credit score, default probability or lending decision is inferred.'],
  };
}
