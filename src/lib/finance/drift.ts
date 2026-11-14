import type { CashRow } from './assessment';
export function monitorDrift(cash:CashRow[],asOf:string){
 const cutoff=new Date(asOf+'T00:00:00Z');const month=(delta:number)=>new Date(Date.UTC(cutoff.getUTCFullYear(),cutoff.getUTCMonth()+delta,1)).toISOString().slice(0,7),end=month(0),middle=month(-3),start=month(-9);
 const before=cash.filter(r=>r.occurred_on.slice(0,7)>=start&&r.occurred_on.slice(0,7)<middle),after=cash.filter(r=>r.occurred_on.slice(0,7)>=middle&&r.occurred_on.slice(0,7)<end);
 const bins=['BUSINESS_SALE','CUSTOMER_REFUND','INTERNAL_TRANSFER','UNKNOWN','OTHER'];
 if(before.length<20||after.length<20)return {status:'INSUFFICIENT_DATA',baselineCount:before.length,currentCount:after.length,psi:null,distribution:[],warning:'At least 20 supplied records in both comparison windows are required. Missing source coverage is not filled.'};
 const frequencies=(rows:CashRow[])=>bins.map(b=>(1+rows.filter(r=>(bins.includes(r.category)?r.category:'OTHER')===b).length)/(rows.length+bins.length));
 const a=frequencies(before),b=frequencies(after),psi=a.reduce((n,p,i)=>n+(b[i]-p)*Math.log(b[i]/p),0);
 return {status:psi>=0.25?'REVIEW_DATA_SHIFT':'NO_LARGE_SHIFT',baselineCount:before.length,currentCount:after.length,psi,distribution:bins.map((category,i)=>({category,baseline:a[i],current:b[i]})),warning:'PSI compares category frequencies in prior six versus latest three completed months with add-one smoothing. 0.25 is a review heuristic, not proof of model degradation or fraud; coverage and classification changes can cause shifts.'};
}
