import { redirect } from 'next/navigation';
import { actor } from '@/lib/security/http';
import { IntelligenceWorkspace } from '@/components/finance/IntelligenceWorkspace';
export const dynamic='force-dynamic';
export default async function Page(){if(!await actor().catch(()=>null))redirect('/login/customer');return <IntelligenceWorkspace/>;}
