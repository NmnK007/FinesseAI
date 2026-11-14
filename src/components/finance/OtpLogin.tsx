'use client';
/* localized-ui */
import { T,useLanguage } from '@/components/finance/Language';
import Link from 'next/link';
import { useState } from 'react';
import { TopNav } from '@/components/TopNav';
export function OtpLogin({inbox,demo}:{inbox:boolean;demo:boolean}) {
 const {t}=useLanguage();

  const [email,setEmail]=useState('owner@finnese.test'),[code,setCode]=useState(''),[sent,setSent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(verify:boolean) {
    setBusy(true);setError('');
    try{const response=await fetch(`/api/auth/${verify?'verify-otp':'request-otp'}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(verify?{email,code}:{email})});const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Sign-in failed.');if(verify)window.location.assign('/data-sources');else setSent(true);}
    catch(err){setError(err instanceof Error?err.message:'Sign-in failed.');}finally{setBusy(false);}
  }
  return <main id="main-content" tabIndex={-1} className="min-h-screen bg-cream-fade text-black"><TopNav/><section className="mx-auto max-w-xl px-6 py-16"><div className="rounded-3xl border border-black/10 bg-white/85 p-8"><p className="text-xs font-bold uppercase tracking-widest"><T>Finnese · MSME sign in</T></p><h1 className="mt-5 font-serif text-5xl"><T>Your evidence starts here.</T></h1><p className="my-5 text-sm text-black/65"><T>{inbox?'Development inbox: sign-in codes stay in Mailpit on this computer. No WhatsApp, SMS or real email is sent.':'Sign-in delivery is not configured for this environment. Local inbox authentication is disabled outside development.'}</T></p>
  <form onSubmit={e=>{e.preventDefault();void submit(sent);}} className="space-y-4"><label className="block"><T>Development email</T><input required type="email" maxLength={254} className="mt-2 w-full rounded-xl border border-black/20 p-3" value={email} disabled={busy} onChange={e=>{setEmail(e.target.value);setSent(false);setCode('');}}/></label><T>{sent&&<label className="block"><T>Six-digit code</T><input required pattern="[0-9]{6}" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="mt-2 w-full rounded-xl border border-black/20 p-3 font-mono text-xl" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></label>}</T><p role="alert" className="text-sm text-red-800"><T>{error}</T></p><button disabled={!inbox||busy} className="w-full rounded-full bg-black px-5 py-3 font-semibold text-white disabled:opacity-40"><T>{busy?'Working…':sent?'Sign in':'Send code to development inbox'}</T></button></form>
  <T>{inbox&&<a className="mt-5 block text-sm underline" href="http://127.0.0.1:8025" target="_blank" rel="noreferrer"><T>Open local OTP inbox</T></a>}</T><T>{sent&&<button disabled={busy} onClick={()=>void submit(false)} className="mt-4 text-sm underline"><T>Request a new code</T></button>}</T><T>{demo&&<Link className="mt-6 block text-sm underline" href="/dashboard?mode=demo"><T>Explore synthetic demo without signing in</T></Link>}</T></div></section></main>;
}
