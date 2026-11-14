import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { OwnerWorkspace } from '@/components/finance/OwnerWorkspace';
import { findSession } from '@/lib/security/auth-service';
import { SESSION_COOKIE } from '@/lib/security/http';
import { db } from '@/lib/db';
import { demoEnabled } from '@/lib/demo';
export const dynamic='force-dynamic';
export default async function DataSources() {
  const user=await findSession(db,(await cookies()).get(SESSION_COOKIE)?.value).catch(()=>null);
  if(!user)redirect('/login/customer');
  return <OwnerWorkspace upload demo={demoEnabled()}/>;
}
