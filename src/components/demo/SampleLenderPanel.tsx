'use client';

import { useState } from 'react';
import { T } from '@/components/finance/Language';
import { LenderFit,LenderPreferenceSelect } from '@/components/finance/LenderFit';
import { lenderFit,lenderPreferences,type LenderPreference } from '@/lib/finance/lender-fit';

export type SampleBusiness = {
 id: string;
 name: string;
 sector: string;
 overall: number;
 scores: { key: string; label: string; weight: number; score: number }[];
};

export function SampleLenderPanel({businesses}:{businesses:SampleBusiness[]}){
 const [selected,setSelected]=useState<string|null>(null);
 const [funded,setFunded]=useState<string[]>([]);
 const [preference,setPreference]=useState<LenderPreference>(lenderPreferences[0]);
 const ranked=businesses.map(business=>({business,fit:lenderFit(business.scores,preference)}))
  .sort((a,b)=>(b.fit.score??-1)-(a.fit.score??-1)||a.business.name.localeCompare(b.business.name));

 return <section className="mx-auto max-w-5xl space-y-4 px-5 py-10 text-black" aria-labelledby="sample-lender">
  <p className="text-sm font-semibold"><T>Fictional lending demo</T></p>
  <h1 id="sample-lender" className="font-serif text-5xl"><T>Finesse Demo Lending Desk</T></h1>
  <p><T>Compare sample businesses and simulate a funding decision. Choices last until this page is reloaded.</T></p>
  <LenderPreferenceSelect preference={preference} onChange={setPreference}/>
  <p><T>Businesses are ranked by illustrative lender fit. The Financial Health Index keeps its original weights.</T></p>
  <div className="grid gap-4 md:grid-cols-2">
   {ranked.map(({business,fit})=><article key={business.id} className="space-y-3 rounded-2xl border border-black/10 bg-white p-5">
    <div><h2 className="font-serif text-3xl">{business.name}</h2><p className="text-sm">{business.sector}</p></div>
    <p className="font-semibold"><T>Financial Health Index</T> {business.overall}/1000</p>
    <dl className="space-y-1 text-sm">
     {business.scores.map(domain=><div key={domain.key} className="flex items-baseline justify-between gap-2">
      <dt><T>{domain.label}</T> ({Math.round(domain.weight*100)}%)</dt>
      <dd className="shrink-0">{domain.score}/1000</dd>
     </div>)}
    </dl>
    <LenderFit fit={fit}/>
    {selected===business.id?<div className="flex flex-wrap gap-3">
     <button type="button" className="rounded-full bg-black px-4 py-2 text-sm text-white" onClick={()=>{
      setFunded(previous=>[...previous,business.id]);
      setSelected(null);
     }}><T>Confirm simulated funding</T></button>
     <button type="button" className="underline" onClick={()=>setSelected(null)}><T>Cancel</T></button>
    </div>:<button type="button" className="rounded-full bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
     aria-label={`Select ${business.name} for simulated funding`}
     disabled={funded.includes(business.id)} onClick={()=>setSelected(business.id)}>
     <T>{funded.includes(business.id)?'Marked funded in demo':'Select for simulated funding'}</T>
    </button>}
   </article>)}
  </div>
  <div aria-live="polite">
   {funded.length>0&&<p className="mt-3 text-sm"><T>Marked funded in demo</T> · {businesses.filter(b=>funded.includes(b.id)).map(b=>b.name).join(', ')}</p>}
  </div>
 </section>;
}
