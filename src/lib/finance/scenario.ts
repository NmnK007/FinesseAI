import { z } from 'zod';
import { sumPaise } from './money';
import type { CashRow } from './assessment';
import { AppError } from '../security/errors';
export const scenarioInput=z.object({
 openingCashPaise:z.number().int().min(-1e12).max(1e12),
 monthlyReceiptsPaise:z.number().int().min(0).max(1e12),monthlyCostsPaise:z.number().int().min(0).max(1e12),existingDebtPaise:z.number().int().min(0).max(1e12),
 salesDeclinePct:z.number().min(0).max(50),costIncreasePct:z.number().min(0).max(100),delayMonths:z.number().int().min(0).max(12),
 principalPaise:z.number().int().min(0).max(1e12),annualRateBps:z.number().int().min(0).max(6000),tenureMonths:z.number().int().min(1).max(360),feesPaise:z.number().int().min(0).max(1e10),
 supplierDelayMonths:z.number().int().min(0).max(12).optional(),monthlyTaxPaise:z.number().int().min(0).max(1e12).optional(),inventoryInvestmentPaise:z.number().int().min(0).max(1e12).optional(),
 months:z.number().int().min(1).max(24).default(12),startMonth:z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/),obligationsComplete:z.boolean().default(false)
});
export type ScenarioInput=z.infer<typeof scenarioInput>;
export function emiPaise(principal:number,annualRateBps:number,n:number){
 if(!Number.isSafeInteger(principal)||principal<0||principal>1e12||!Number.isInteger(n)||n<1||n>360||!Number.isInteger(annualRateBps)||annualRateBps<0||annualRateBps>6000)throw new AppError('VALIDATION_ERROR',400,'Invalid loan assumptions.');
 const r=annualRateBps/120000;if(!r)return Math.round(principal/n);
 return Math.round(principal*r/(1-Math.pow(1+r,-n)));
}
export function simulate(raw:ScenarioInput){
 const p=scenarioInput.parse(raw),emi=emiPaise(p.principalPaise,p.annualRateBps,p.tenureMonths);
 const receipts=Math.round(p.monthlyReceiptsPaise*(1-p.salesDeclinePct/100)),costs=Math.round(p.monthlyCostsPaise*(1+p.costIncreasePct/100));
 let baseline=p.openingCashPaise,stressed=p.openingCashPaise;
 const rows=Array.from({length:p.months},(_,i)=>{
  const month=new Date(Date.UTC(+p.startMonth.slice(0,4),+p.startMonth.slice(5)-1+i,1)).toISOString().slice(0,7);
  const loanIn=i===0?p.principalPaise:0,fees=i===0?p.feesPaise:0,debt=sumPaise([p.existingDebtPaise,i<p.tenureMonths?emi:0]);
  const actualReceipts=i>=p.delayMonths?receipts:0;
  const tax=p.monthlyTaxPaise??0,inventory=i===0?(p.inventoryInvestmentPaise??0):0,paidCosts=i>=(p.supplierDelayMonths??0)?costs:0;
  baseline=sumPaise([baseline,p.monthlyReceiptsPaise,-p.monthlyCostsPaise,-debt,loanIn,-fees,-tax]);
  stressed=sumPaise([stressed,actualReceipts,-paidCosts,-debt,loanIn,-fees,-tax,-inventory]);
  return {month,baselinePaise:baseline,stressedPaise:stressed,receiptsPaise:actualReceipts,costsPaise:paidCosts,taxPaise:tax,inventoryPaise:inventory,deferredSupplierPaise:i<(p.supplierDelayMonths??0)?costs:0,debtPaise:debt,loanInPaise:loanIn,feesPaise:fees};
 });
 const minimum=Math.min(...rows.map(r=>r.stressedPaise));
 return {version:'cash-scenario-v1',mode:'SCENARIO_ONLY',input:p,emiPaise:emi,illustrativeTotalRepaymentPaise:sumPaise([emi*p.tenureMonths,p.feesPaise]),nominalAnnualRatePct:p.annualRateBps/100,apr:null,
 rows,minimumCashPaise:minimum,liquidityGapPaise:Math.max(0,-minimum),outstandingSupplierPaise:costs*Math.min(p.months,p.supplierDelayMonths??0),negativeMonths:rows.filter(r=>r.stressedPaise<0).map(r=>r.month),
 illustrativeDscr:p.obligationsComplete&&p.existingDebtPaise+emi>0?(receipts-costs-(p.monthlyTaxPaise??0))/(p.existingDebtPaise+emi):null,
 assumptions:['User-entered opening cash and existing debt obligations.','Constant monthly receipts and costs; delayed collections arrive after the stated whole-month lag.','No pre-start receivable collections or supplier obligations assumed. User-entered tax is paid monthly in both paths; extra inventory investment applies to stress month one. Supplier lag defers stressed costs; unpaid costs at horizon remain liabilities.','Both paths include the proposed loan, fees and debt service. EMI rounding may alter the final installment by a few paise.','Nominal rate is not APR. No default prediction or guaranteed repayment capacity.']};
}
export function observedBaseline(cash:CashRow[],asOf:string){
 const months=new Map<string,{receipts:number;costs:number;debt:number}>();
 for(const row of cash){const month=row.occurred_on.slice(0,7);if(month>=asOf.slice(0,7))continue;const m=months.get(month)||{receipts:0,costs:0,debt:0},n=Number(row.amount_paise);
  if(row.category==='BUSINESS_SALE'&&n>0)m.receipts=sumPaise([m.receipts,n]);
  else if(row.category==='CUSTOMER_REFUND'&&n<0)m.receipts=sumPaise([m.receipts,n]);
  else if(row.category==='LOAN_EMI'&&n<0)m.debt=sumPaise([m.debt,-n]);
  else if(n<0&&!['INTERNAL_TRANSFER','CAPITAL_INJECTION','LOAN_DISBURSEMENT','UNKNOWN'].includes(row.category))m.costs=sumPaise([m.costs,-n]);
  months.set(month,m);
 }
 const observations=[...months.entries()].sort(([a],[b])=>a.localeCompare(b)).slice(-6);const n=observations.length;
 return {observedMonths:observations.map(([month])=>month),monthlyReceiptsPaise:n?Math.max(0,Math.round(sumPaise(observations.map(([,m])=>m.receipts))/n)):null,monthlyCostsPaise:n?Math.round(sumPaise(observations.map(([,m])=>m.costs))/n):null,existingDebtPaise:n?Math.round(sumPaise(observations.map(([,m])=>m.debt))/n):null,unknownTransactions:cash.filter(t=>t.category==='UNKNOWN').length,warning:'Suggested averages of supplied completed-month records, which may be partial. Review exclusions and obligations. Not a forecast.'};
}
