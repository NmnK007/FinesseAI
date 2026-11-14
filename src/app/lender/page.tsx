import { actor } from '@/lib/security/http';
import { redirect } from 'next/navigation';
import { ReviewerWorkspace } from '@/components/finance/LendingPanels';
import DemoLender from '@/components/demo/DemoLender';
import { demoEnabled } from '@/lib/demo';
import { notFound } from 'next/navigation';
import { TopNav } from '@/components/TopNav';
import { listProfiles } from '@/lib/mockData';
import { computeHealthCard } from '@/lib/scoreEngine';
import { SampleLenderPanel } from '@/components/demo/SampleLenderPanel';
export const dynamic='force-dynamic';
export default async function Lender({searchParams}:{searchParams:Promise<{mode?:string}>}) {
  const mode=(await searchParams).mode;
  if(mode==='legacy-demo'){if(!demoEnabled())notFound();return <DemoLender/>;}
  const sampleEnabled=process.env.NODE_ENV==='development';
  if(mode==='demo'&&!sampleEnabled)notFound();
  const samplePanel=sampleEnabled&&<SampleLenderPanel businesses={listProfiles().map(profile=>{
   const {overall,subScores}=computeHealthCard(profile);
   return {id:profile.gstin,name:profile.tradeName,sector:profile.sector,overall,scores:subScores.map(({key,label,weight,score})=>({key,label,weight,score}))};
  })}/>;
  if(mode==='demo')return <main id="main-content" tabIndex={-1} className="min-h-screen bg-cream-fade"><TopNav/>{samplePanel}</main>;
  if(!await actor().catch(()=>null)){
   if(sampleEnabled)redirect('/lender?mode=demo');
   redirect('/login/lender');
  }
  return <main id="main-content" tabIndex={-1} className="min-h-screen bg-cream-fade text-black"><TopNav/>{samplePanel}<ReviewerWorkspace/></main>;
}
