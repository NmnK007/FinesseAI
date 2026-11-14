import type { CashRow } from './assessment';
import { sumPaise } from './money';
/** Walk-forward comparison: every prediction uses only earlier completed months. */
export function validateSeasonality(cash:CashRow[],asOf:string){
 const months=new Map<string,number>();
 for(const r of cash){const m=r.occurred_on.slice(0,7);if(m>=asOf.slice(0,7))continue;months.set(m,months.get(m)??0);if(r.category==='BUSINESS_SALE'&&Number(r.amount_paise)>0)months.set(m,sumPaise([months.get(m)!,Number(r.amount_paise)]));}
 const ordered=[...months].sort(([a],[b])=>a.localeCompare(b));
 const consecutive=ordered.every(([m],i)=>!i||new Date(Date.UTC(+m.slice(0,4),+m.slice(5)-2,1)).toISOString().slice(0,7)===ordered[i-1][0]);
 const caveat='Supplied months may be incomplete. This compares historical receipt baselines and does not validate future repayment capacity.';
 if(!consecutive||ordered.length<18)return {status:'INSUFFICIENT_HISTORY',reason:'Requires at least 18 consecutive observed completed months; absent months are not filled with zero.',folds:[],seasonalMaePaise:null,recentMeanMaePaise:null,caveat};
 const folds=ordered.slice(12).map(([month,actual],j)=>{const i=j+12;return {month,actualPaise:actual,seasonalPaise:ordered[i-12][1],recentMeanPaise:Math.round(sumPaise(ordered.slice(i-3,i).map(([,n])=>n))/3)};});
 return {status:'HISTORICAL_COMPARISON',reason:'Same month last year versus prior three observed months; no test-month input used.',folds,seasonalMaePaise:Math.round(folds.reduce((n,f)=>n+Math.abs(f.actualPaise-f.seasonalPaise),0)/folds.length),recentMeanMaePaise:Math.round(folds.reduce((n,f)=>n+Math.abs(f.actualPaise-f.recentMeanPaise),0)/folds.length),caveat};
}
