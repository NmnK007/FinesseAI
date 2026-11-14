'use client';

import { useEffect,useState } from 'react';
import { lenderPreferences } from '@/lib/finance/lender-fit';
import { request } from './request';
import { T } from './Language';

type Interest={reviewer:string;profile_id:string;created_at:string};
export function LenderInterestInbox({businessId}:{businessId:string}){
 const [interest,setInterest]=useState<Interest[]|null>(null);
 const [unavailable,setUnavailable]=useState(false);
 useEffect(()=>{
  let active=true,inFlight=false;
  async function refresh(){
   if(inFlight)return;
   inFlight=true;
   try{
    const result=await request(`/api/lending?inbox=1&businessId=${businessId}`);
    if(active){setInterest(result.interest);setUnavailable(false);}
   }catch{
    if(active){setInterest(null);setUnavailable(true);}
   }finally{inFlight=false;}
  }
  void refresh();
  const timer=window.setInterval(()=>void refresh(),15000);
  return ()=>{active=false;window.clearInterval(timer);};
 },[businessId]);
 return <section className="space-y-2 rounded-2xl border border-black/10 bg-white p-5">
  <h2 className="font-serif text-3xl"><T>Lender interest inbox</T>{interest?.length? ` (${interest.length})`:''}</h2>
  <p className="text-sm"><T>An expression of interest is an invitation to discuss funding. It carries no funding commitment.</T></p>
  <div aria-live="polite">
   {unavailable?<p><T>Could not load lender interest.</T></p>:interest?.length===0?<p><T>No lender interest yet.</T></p>:null}
   {interest?.map(item=><article className="border-t border-black/10 py-2" key={`${item.reviewer}:${item.profile_id}`}>
    <p className="font-semibold"><T>Interested in discussing funding</T></p>
    <p className="break-words">{item.reviewer} · <T>{lenderPreferences.find(profile=>profile.id===item.profile_id)?.name??item.profile_id}</T></p>
    <time dateTime={new Date(item.created_at).toISOString()} className="text-sm">{new Date(item.created_at).toLocaleString()}</time>
   </article>)}
  </div>
 </section>;
}
