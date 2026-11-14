'use client';

import { T } from './Language';
import { lenderPreferences,lenderFit,type LenderPreference } from '@/lib/finance/lender-fit';

export function LenderPreferenceSelect({preference,onChange}:{preference:LenderPreference;onChange:(preference:LenderPreference)=>void}){
 return <label className="block space-y-1">
  <T>Lender profile</T>
  <select className="block w-full max-w-sm rounded-lg border border-black/20 bg-white p-2"
   value={preference.id} onChange={event=>{
    const next=lenderPreferences.find(option=>option.id===event.target.value);
    if(next)onChange(next);
   }}>
   {lenderPreferences.map(option=><option key={option.id} value={option.id}><T>{option.name}</T></option>)}
  </select>
 </label>;
}

export function LenderFit({fit}:{fit:ReturnType<typeof lenderFit>}){
 return <div className="space-y-2 rounded-xl bg-black/5 p-3 text-sm">
  <p className="font-semibold"><T>Illustrative lender fit</T> · {fit.score==null?<T>Incomplete evidence</T>:`${fit.score}/1000`}</p>
  <ol className="space-y-2">
   {fit.priorities.map(({key,weight,domain,evidence},index)=><li key={key}>
    {index===0&&<strong className="mr-1"><T>Top priority</T> · </strong>}
    {domain&&<><T>{domain.label}</T> · </>}{weight}% <T>lender weight</T> · {domain?.score==null?<T>Unavailable</T>:`${domain.score}/1000`}
    <p><T>{evidence}</T></p>
   </li>)}
  </ol>
 </div>;
}
