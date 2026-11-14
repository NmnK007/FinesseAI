'use client';
/* localized-ui */
import { T,useLanguage } from '@/components/finance/Language';
import { useState } from 'react';
import type { reconcile } from '@/lib/finance/reconciliation';
import { request } from './request';
import { formatPaise } from '@/lib/finance/money';
export function MatchingPanel({businessId}:{businessId:string}){
 const {t}=useLanguage();

 const [options,setOptions]=useState({tolerancePaise:1,windowDays:90,withholdingPct:0,allowNarrationMatch:false}),[result,setResult]=useState<ReturnType<typeof reconcile>|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <details className="my-5 rounded-xl border border-black/20 p-4"><summary><T>Explore matching tolerances and withholding assumptions</T></summary><p className="my-3 text-sm"><T>Review-only suggestions; this does not change the original Health Card or confirm settlements.</T></p><div className="grid gap-3 sm:grid-cols-3"><T>{([['tolerancePaise','Tolerance in paise',10000],['windowDays','Days after invoice',180],['withholdingPct','Assumed withheld percentage',30]] as const).map(([key,label,max])=><label key={key}><T>{label}</T><input className="block w-full rounded border bg-white text-black p-2" type="number" min={key==='windowDays'?1:0} max={max} value={options[key]} onChange={e=>{setOptions({...options,[key]:Number(e.target.value)});setResult(null);}}/></label>)}</T></div><label className="my-3 flex gap-2"><input type="checkbox" checked={options.allowNarrationMatch} onChange={e=>{setOptions({...options,allowNarrationMatch:e.target.checked});setResult(null);}}/><T>Allow low-confidence counterparty words in narration</T></label><button disabled={busy} className="rounded-full bg-black px-4 py-2 text-white" onClick={async()=>{setBusy(true);setError('');try{setResult(await request('/api/intelligence/reconcile',{businessId,options}));}catch(e){setError(e instanceof Error?e.message:'Matching failed');}finally{setBusy(false);}}}><T>Calculate review suggestions</T></button><p role="alert"><T>{error}</T></p><T>{result?.matches.map(m=><article key={m.invoiceId} className="my-3 text-sm"><a className="break-all underline" href={`#evidence-${m.invoiceId}`}><T>{m.invoiceId}</T></a><p><T>{m.status}</T><T> · </T><T>{m.method}</T></p><p><T>{formatPaise(m.matchedPaise)}</T><T> of expected </T><T>{formatPaise(m.expectedPaise)}</T></p><p><T>{m.caveat}</T></p><T>{m.transactionIds.map(id=><a key={id} className="mr-3 break-all underline" href={`#evidence-${id}`}><T>{id}</T></a>)}</T></article>)}</T></details>;
}

