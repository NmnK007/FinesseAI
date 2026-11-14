import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
export default function Apply(){return <main className="min-h-screen bg-cream-fade text-black"><TopNav/><section className="mx-auto max-w-3xl p-10"><h1 className="font-serif text-5xl">Lending sandbox</h1><p className="my-5">This prototype cannot submit real loan applications or provide lender offers. The authenticated sandbox journey is scheduled for Phase 5.</p><Link className="underline" href="/dashboard">Return to financial evidence</Link></section></main>;}
