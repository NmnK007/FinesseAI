import { actor } from '@/lib/security/http';
import { redirect } from 'next/navigation';
import { ReviewerWorkspace } from '@/components/finance/LendingPanels';
import DemoLender from '@/components/demo/DemoLender';
import { demoEnabled } from '@/lib/demo';
import { notFound } from 'next/navigation';
import { TopNav } from '@/components/TopNav';
export const dynamic='force-dynamic';
export default async function Lender({searchParams}:{searchParams:Promise<{mode?:string}>}) {
  if((await searchParams).mode==='demo'){if(!demoEnabled())notFound();return <DemoLender/>;}
  if(!await actor().catch(()=>null))redirect('/login/lender');
  return <main id="main-content" tabIndex={-1} className="min-h-screen bg-cream-fade text-black"><TopNav/><ReviewerWorkspace/></main>;
}
