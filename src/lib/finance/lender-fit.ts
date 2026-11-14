export const lenderPreferences = [
 {id:'working-capital',name:'Working capital lender',weights:{revenue:50,compliance:20,counterparty:20,growth:10}},
 {id:'compliance',name:'Compliance focused lender',weights:{compliance:50,revenue:20,counterparty:20,growth:10}},
 {id:'diversification',name:'Diversification focused lender',weights:{counterparty:50,revenue:20,compliance:20,growth:10}},
 {id:'growth',name:'Growth focused lender',weights:{growth:50,revenue:20,compliance:15,counterparty:15}},
] as const;

export type LenderPreference = typeof lenderPreferences[number];
type Domain = {key:string; label:string; score:number|null; weight:number};

const evidenceByDomain: Record<string,string> = {
 revenue:'Review monthly invoice totals and compare them with bank collections.',
 compliance:'Review filing dates and payment history in GST and utility records.',
 counterparty:'Review the share of invoiced sales from the largest customer.',
 growth:'Compare earlier and latest invoice months and check whether collections followed sales.',
};

export function lenderFit(domains:Domain[], preference:LenderPreference){
 const priorities=Object.entries(preference.weights).map(([key,weight])=>({
  key,weight,domain:domains.find(domain=>domain.key===key),evidence:evidenceByDomain[key],
 }));
 const complete=priorities.every(priority=>priority.domain?.score!=null);
 const score=complete?Math.round(priorities.reduce((sum,p)=>sum+p.domain!.score!*p.weight/100,0)):null;
 return {score,priorities};
}
