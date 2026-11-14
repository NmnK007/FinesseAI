import { cookies } from 'next/headers';
import { redirect,notFound } from 'next/navigation';
import DemoDashboard from '@/components/demo/DemoDashboard';
import { OwnerWorkspace } from '@/components/finance/OwnerWorkspace';
import { findSession } from '@/lib/security/auth-service';
import { SESSION_COOKIE } from '@/lib/security/http';
import { db } from '@/lib/db';
import { demoEnabled } from '@/lib/demo';
export const dynamic='force-dynamic';
export default async function Dashboard({searchParams}:{searchParams:Promise<{mode?:string;gstin?:string;lang?:string}>}) {
  const search=await searchParams;
  if(search.mode==='demo'){if(!demoEnabled())notFound();return <DemoDashboard searchParams={search}/>;}
  const user=await findSession(db,(await cookies()).get(SESSION_COOKIE)?.value).catch(()=>null);
  if(!user)redirect('/login/customer');
  return <OwnerWorkspace demo={demoEnabled()}/>;
}
