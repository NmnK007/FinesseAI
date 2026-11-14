'use client';
/* localized-ui */
import { T,useLanguage } from '@/components/finance/Language';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TopNav } from '@/components/TopNav';
import { formatPaise } from '@/lib/finance/money';
import type { financialMetrics } from '@/lib/finance/metrics';
import type { Preview,Mapping,Category } from '@/lib/ingestion/bank-csv';

type Business={id:string;name:string;gstin:string|null};
type Metrics=ReturnType<typeof financialMetrics>;
type Detail={business:Business;metrics:Metrics;jobs:{id:string;status:string;filename:string}[];sources:{id:string;origin:string;filename:string;imported_at:string;consent_id:string;revoked_at:string|null;expires_at:string}[]};
const categories:Category[]=['BUSINESS_SALE','CUSTOMER_REFUND','INTERNAL_TRANSFER','CAPITAL_INJECTION','LOAN_DISBURSEMENT','LOAN_EMI','SUPPLIER_PAYMENT','SALARY','TAX','UTILITY','FEES','UNKNOWN'];
const field='w-full rounded-xl border border-black/20 bg-white px-3 py-2 text-black';
const button='rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40';
async function api(path:string,body?:unknown,method='POST') {
  const response=await fetch(path,body?{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});
  const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Request failed.');return data;
}
function download(name:string,data:unknown) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=name;link.click();URL.revokeObjectURL(url);
}
export function OwnerWorkspace({upload=false,demo=false}:{upload?:boolean;demo?:boolean}) {
 const {t}=useLanguage();

  const [businesses,setBusinesses]=useState<Business[]>([]),[selected,setSelected]=useState(''),[detail,setDetail]=useState<Detail|null>(null);
  const [name,setName]=useState(''),[gstin,setGstin]=useState(''),[account,setAccount]=useState('Operating account');
  const [file,setFile]=useState<File|null>(null),[consent,setConsent]=useState(false),[custom,setCustom]=useState(false),[mapping,setMapping]=useState<Mapping>({date:'',description:''});
  const [job,setJob]=useState<{id:string;preview:Preview}|null>(null),[corrections,setCorrections]=useState<Record<string,Category>>({}),[page,setPage]=useState(0);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[progress,setProgress]=useState('');
  async function refresh(id=selected) { if(id)setDetail(await api(`/api/businesses?id=${encodeURIComponent(id)}`)); }
  useEffect(()=>{api('/api/businesses').then(data=>{setBusinesses(data.businesses);setSelected(data.businesses[0]?.id||'');}).catch(err=>setError(err.message));},[]);
  useEffect(()=>{
    let active=true;setDetail(null);setJob(null);setNotice('');setProgress('');
    if(selected)api(`/api/businesses?id=${encodeURIComponent(selected)}`).then(data=>{if(active)setDetail(data);}).catch(err=>{if(active)setError(err.message);});
    return()=>{active=false;};
  },[selected]);
  async function act(work:()=>Promise<void>) {setBusy(true);setError('');try{await work();}catch(err){setError(err instanceof Error?err.message:'Operation failed.');}finally{setBusy(false);}}
  function watch(id:string) {
    const events=new EventSource(`/api/ingest/jobs?id=${id}&events=1`);
    events.addEventListener('progress',event=>setProgress(JSON.parse((event as MessageEvent).data).stage));
    events.onerror=()=>events.close();
  }
  return <main id="main-content" tabIndex={-1} className="min-h-screen bg-cream-fade text-black"><TopNav/><div className="mx-auto max-w-6xl px-5 py-10">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest"><T>Finnese · Owner workspace</T></p><h1 className="mt-3 font-serif text-5xl"><T>{upload?'Your financial evidence.':'Your business, in view.'}</T></h1></div><Link className={button} href={upload?'/dashboard':'/data-sources'}><T>{upload?'View financial metrics':'Upload bank statement'}</T></Link></div>
    <p className="my-5 max-w-3xl text-sm text-black/70"><T>Informative prototype. Uploaded records are unverified and support financial analysis only. Finnese does not provide a bureau score, predict default or approve loans.</T></p>
    <T>{demo&&<Link className="text-sm underline" href="/dashboard?mode=demo"><T>Explore the separate synthetic demonstration</T></Link>}</T>
    <div role="alert" className="my-4 text-red-800"><T>{error}</T></div><div role="status" aria-live="polite" className="my-3 font-medium"><T>{busy?'Working…':notice}</T></div>
    <label className="block max-w-xl text-sm font-semibold"><T>Business</T><select disabled={busy} className={`${field} mt-2`} value={selected} onChange={e=>setSelected(e.target.value)}><option value=""><T>Select your business</T></option><T>{businesses.map(b=><option key={b.id} value={b.id}><T>{b.name}</T></option>)}</T></select></label>
    <T>{(!businesses.length||upload)&&<form className="my-7 rounded-2xl border border-black/10 bg-white/75 p-6" onSubmit={e=>{e.preventDefault();void act(async()=>{const data=await api('/api/businesses',{name,gstin:gstin||undefined});setBusinesses([...businesses,data.business]);setSelected(data.business.id);setName('');setGstin('');});}}>
      <h2 className="mb-4 font-serif text-3xl"><T>Create a business</T></h2><div className="grid gap-4 sm:grid-cols-2"><label><T>Business name</T><input className={field} required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label><label><T>GSTIN (optional)</T><input className={field} maxLength={15} value={gstin} onChange={e=>setGstin(e.target.value.toUpperCase())}/></label></div><p className="my-3 text-sm text-black/65"><T>GSTIN validates format only. It does not establish ownership or retrieve financial records.</T></p><button disabled={busy} className={button}><T>Create business</T></button>
    </form>}</T>
    <T>{!selected&&<p className="my-8"><T>Create a business to start. Missing records never generate a synthetic score.</T></p>}</T>
    <T>{selected&&upload&&<section className="my-7 rounded-2xl border border-black/10 bg-white/80 p-6"><h2 className="font-serif text-3xl"><T>Import a bank CSV</T></h2><p className="my-3 text-sm"><T>UTF-8 CSV · INR only · up to 500 KB / 1,000 rows. Use a stable account alias on every re-upload. Never enter an account number.</T></p><a className="text-sm underline" href="/samples/fictional-bank.csv" download><T>Download fictional sample statement</T></a>
      <div className="my-5 grid gap-4 sm:grid-cols-2"><label><T>Account alias</T><input disabled={busy} className={field} value={account} onChange={e=>{setAccount(e.target.value);setJob(null);}} maxLength={60}/></label><label><T>Bank statement</T><input disabled={busy} className={field} type="file" accept=".csv,text/csv" onChange={e=>{setFile(e.target.files?.[0]||null);setJob(null);}}/></label></div>
      <label className="flex items-center gap-2"><input type="checkbox" checked={custom} onChange={e=>{setCustom(e.target.checked);setJob(null);}}/><T>Map columns manually</T></label>
      <T>{custom&&<div className="my-4 grid gap-3 sm:grid-cols-3"><T>{(['date','description','amount','debit','credit','balance','reference'] as const).map(key=><label key={key} className="text-sm"><T>{key}</T><T> column</T><input className={field} value={mapping[key]||''} placeholder={t("Exact CSV header")} onChange={e=>{setMapping({...mapping,[key]:e.target.value});setJob(null);}}/></label>)}</T></div>}</T>
      <label className="my-5 flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span><T>I am authorized to use this statement and consent to local financial analysis for 90 days. I can revoke consent or delete the business. The raw file is not retained; normalized rows and validation results are stored.</T></span></label>
      <button className={button} disabled={busy||!file||!account.trim()||!consent} onClick={()=>void act(async()=>{
        if(!file)return;if(file.size>512000)throw new Error('CSV limit is 500 KB.');
        if(file.type&&!['text/csv','application/vnd.ms-excel','text/plain'].includes(file.type))throw new Error('Choose a text CSV file.');
        const clean=Object.fromEntries(Object.entries(mapping).filter(([,value])=>value.trim()));
        const data=await api('/api/ingest/upload',{businessId:selected,accountAlias:account.trim(),filename:file.name,csv:await file.text(),consent:true,mapping:custom?clean:undefined});setJob(data);setCorrections({});setPage(0);watch(data.id);
      })}><T>Preview import</T></button>
    </section>}</T>
    <T>{upload&&detail&&detail.jobs.some(j=>j.status==='PREVIEW')&&!job&&<section className="my-5 rounded-2xl border border-black/10 bg-white p-5"><h2 className="font-semibold"><T>Saved import reviews</T></h2><T>{detail.jobs.filter(j=>j.status==='PREVIEW').map(j=><div className="mt-3 flex flex-wrap justify-between gap-2" key={j.id}><span><T>{j.filename}</T></span><button disabled={busy} className="underline" onClick={()=>void act(async()=>{const saved=await api(`/api/ingest/jobs?id=${j.id}`);setJob(saved);setCorrections({});setConsent(true);setPage(0);watch(j.id);})}><T>Resume review</T></button></div>)}</T></section>}</T>
    <T>{job&&<section className="my-7 rounded-2xl border border-black/10 bg-white p-6"><h2 className="font-serif text-3xl"><T>Review before importing</T></h2><p className="my-3"><T>{job.preview.rows.length}</T><T> accepted · </T><T>{job.preview.rejected.length}</T><T> rejected · </T><T>{job.preview.skipped.length}</T><T> skipped. </T><T>{progress&&`Status: ${progress}`}</T></p><button className="text-sm underline" onClick={()=>download('validation-report.json',{...job.preview,corrections})}><T>Download validation report</T></button>
      <ul className="my-4 list-disc space-y-2 pl-5 text-sm"><T>{[...job.preview.warnings,...job.preview.rejected,...job.preview.skipped].slice(0,20).map((issue,i)=><li key={i}><T>{issue.row?`Row ${issue.row}: `:''}</T><T>{issue.reason}</T></li>)}</T></ul>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only"><T>Accepted statement rows and inferred categories</T></caption><thead><tr><th className="p-2"><T>Date</T></th><th className="p-2"><T>Narration</T></th><th className="p-2"><T>Amount</T></th><th className="p-2"><T>Category (reviewable)</T></th></tr></thead><tbody><T>{job.preview.rows.slice(page*20,page*20+20).map(row=><tr key={row.row} className="border-t border-black/10"><td className="p-2 whitespace-nowrap"><T>{row.date}</T></td><td className="p-2"><T>{row.description}</T></td><td className="p-2 whitespace-nowrap"><T>{formatPaise(row.amountPaise)}</T></td><td className="p-2"><select aria-label={`Category for row ${row.row}`} className={field} value={corrections[row.row]||row.category} onChange={e=>setCorrections({...corrections,[row.row]:e.target.value as Category})}><T>{categories.map(c=><option value={c} key={c}><T>{c}</T></option>)}</T></select></td></tr>)}</T></tbody></table></div>
      <div className="my-4 flex gap-4"><button disabled={page===0} onClick={()=>setPage(page-1)}><T>Previous rows</T></button><button disabled={(page+1)*20>=job.preview.rows.length} onClick={()=>setPage(page+1)}><T>Next rows</T></button></div>
      <button className={button} disabled={busy||!consent} onClick={()=>void act(async()=>{const result=await api('/api/ingest/jobs',{id:job.id,corrections});watch(job.id);setNotice(`Import complete: ${result.accepted} stored, ${result.skipped} skipped, ${result.rejected} rejected.`);setJob(null);await refresh();})}><T>Confirm import</T></button>
    </section>}</T>
    <T>{detail&&<><section className="my-8"><h2 className="mb-5 font-serif text-3xl"><T>{detail.business.name}</T><T> · Stored financial metrics</T></h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><T>{[['Total inflows',formatPaise(detail.metrics.inflowPaise)],['Total outflows',formatPaise(detail.metrics.outflowPaise)],['Classified sales receipts',formatPaise(detail.metrics.salesReceiptsPaise)],['Net cash movement',formatPaise(detail.metrics.netMovementPaise)]].map(([label,value])=><div key={label} className="rounded-2xl border border-black/10 bg-white/80 p-5"><div className="text-sm text-black/65"><T>{label}</T></div><div className="mt-3 text-2xl font-semibold tabular-nums"><T>{value}</T></div></div>)}</T></div>
      <p className="mt-4 text-sm"><T>{detail.metrics.transactionCount}</T><T> stored transactions · </T><T>{detail.metrics.unknownCount}</T><T> unclassified · User-uploaded, unverified. Customer refunds: </T><T>{formatPaise(detail.metrics.customerRefundsPaise)}</T><T>.</T></p>
      <div className="my-5 rounded-2xl bg-sage-fade p-5"><h3 className="text-xl font-semibold"><T>Health Score: not available</T></h3><p className="mt-2 text-sm"><T>Bank cash movements alone do not establish all four health dimensions. GST, invoice, utility and other applicable evidence remain missing. Default probability: not validated.</T></p></div>
      <p className="mb-2 text-xs text-black/60 sm:hidden"><T>Scroll the table horizontally to view all columns.</T></p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="mb-3 text-left font-semibold"><T>Observed monthly cash movements (partial periods possible)</T></caption><thead><tr><th className="p-3"><T>Month</T></th><th className="p-3"><T>Inflow</T></th><th className="p-3"><T>Outflow</T></th><th className="p-3"><T>Sales receipts</T></th></tr></thead><tbody><T>{detail.metrics.monthly.map(m=><tr key={m.month} className="border-t border-black/15"><td className="p-3 whitespace-nowrap"><T>{m.month}</T></td><td className="p-3"><T>{formatPaise(m.inflowPaise)}</T></td><td className="p-3"><T>{formatPaise(m.outflowPaise)}</T></td><td className="p-3"><T>{formatPaise(m.salesReceiptsPaise)}</T></td></tr>)}</T></tbody></table></div>
      <ul className="mt-4 list-disc pl-5 text-sm text-black/65"><T>{detail.metrics.limitations.map(text=><li key={text}><T>{text}</T></li>)}</T></ul>
    </section><section className="my-8"><h2 className="font-serif text-3xl"><T>Source provenance and consent</T></h2><T>{!detail.sources.length&&<p className="mt-3"><T>No imported evidence. Upload a statement to begin.</T></p>}</T><T>{detail.sources.map(source=><div key={source.id} className="my-3 rounded-xl border border-black/15 bg-white/70 p-4 text-sm"><p className="font-semibold"><T>{source.filename}</T><T> · </T><T>{source.origin}</T></p><p><T>Imported </T><T>{new Date(source.imported_at).toLocaleDateString('en-IN')}</T><T> · Consent </T><T>{source.revoked_at?'revoked':`expires ${new Date(source.expires_at).toLocaleDateString('en-IN')}`}</T></p><p className="break-all text-xs text-black/60"><T>Evidence </T><T>{source.id}</T></p><T>{!source.revoked_at&&<button disabled={busy} className="mt-3 underline" onClick={()=>void act(async()=>{await api('/api/businesses/consent',{businessId:selected,consentId:source.consent_id});await refresh();setNotice('Consent revoked. This source is excluded from financial analysis.');})}><T>Revoke consent</T></button>}</T></div>)}</T></section>
    <div className="flex flex-wrap gap-5 border-t border-black/15 py-6 text-sm"><button disabled={busy} className="underline" onClick={()=>void act(async()=>download('business-export.json',await api(`/api/businesses?id=${selected}`)))}><T>Export authorized records</T></button><button disabled={busy} className="text-red-800 underline" onClick={()=>{if(window.confirm(t('Permanently delete this business and its stored financial records?')))void act(async()=>{await api('/api/businesses',{id:selected},'DELETE');setBusinesses(businesses.filter(b=>b.id!==selected));setSelected('');setDetail(null);setNotice('Business and financial records deleted.');});}}><T>Delete business and records</T></button></div></>}</T>
  </div></main>;
}
