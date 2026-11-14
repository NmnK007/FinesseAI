import { validateCorrection } from '../ingestion/correction';
import { randomUUID } from 'node:crypto';
import type { Database,Sql } from './index';
import { ownedBusiness } from './businesses';
import type { Actor } from '../security/auth-service';
import { AppError } from '../security/errors';
import { digest } from '../ingestion/bank-csv';
import { parseEvidence,type EvidenceKind,type EvidencePreview } from '../ingestion/evidence-csv';
import { assess,SCORING_VERSION,type Evidence,type CashRow,type Assessment } from '../finance/assessment';

export async function authorizedFacts(sql:Sql,businessId:string){
 const cash=(await sql.query<CashRow>(`SELECT t.id,t.occurred_on::text,t.amount_paise::text,t.category,t.description,t.reference,t.account_id FROM transactions t JOIN source_evidence e ON e.id=t.evidence_id JOIN ingestion_jobs j ON j.id=e.job_id JOIN consents c ON c.id=j.consent_id WHERE t.business_id=$1 AND c.revoked_at IS NULL AND c.expires_at>now() ORDER BY t.occurred_on,t.id`,[businessId])).rows;
 const evidence=(await sql.query<Evidence>(`SELECT COALESCE(v.id,r.id) AS id,r.id AS source_id,r.kind,COALESCE(v.data,r.data) AS data,b.origin FROM evidence_records r LEFT JOIN LATERAL (SELECT id,data FROM evidence_corrections WHERE record_id=r.id ORDER BY created_at DESC,id DESC LIMIT 1) v ON true JOIN evidence_batches b ON b.id=r.batch_id JOIN consents c ON c.id=b.consent_id WHERE r.business_id=$1 AND c.revoked_at IS NULL AND c.expires_at>now() ORDER BY r.kind,r.record_key`,[businessId])).rows;
 const applicability=(await sql.query<{kind:'GST'|'UTILITY';applicable:boolean;reason:string}>('SELECT kind,applicable,reason FROM source_applicability WHERE business_id=$1',[businessId])).rows;
 return {cash,evidence,applicability};
}
export async function logAction(sql:Sql,user:Actor,businessId:string,action:string,metadata:Record<string,unknown>={}){await sql.query('INSERT INTO audit_events(id,actor_id,business_id,action,metadata) VALUES ($1,$2,$3,$4,$5)',[randomUUID(),user.id,businessId,action,JSON.stringify(metadata)]);}
export function intelligenceStore(db:Database){return {
 async applicability(user:Actor,businessId:string,kind:'GST'|'UTILITY',applicable:boolean,reason:string){return db.transaction(async sql=>{
  await ownedBusiness(sql,user,businessId,true);
  await sql.query('INSERT INTO source_applicability(business_id,kind,applicable,reason,actor_id) VALUES ($1,$2,$3,$4,$5) ON CONFLICT(business_id,kind) DO UPDATE SET applicable=EXCLUDED.applicable,reason=EXCLUDED.reason,actor_id=EXCLUDED.actor_id,updated_at=now()',[businessId,kind,applicable,reason,user.id]);
  await logAction(sql,user,businessId,'SOURCE_APPLICABILITY_UPDATED',{kind,applicable,reason});return {ok:true};
 });},
 async correct(user:Actor,businessId:string,recordId:string,data:unknown,reason:string,expectedId:string){return db.transaction(async sql=>{
  await ownedBusiness(sql,user,businessId,true);const facts=await authorizedFacts(sql,businessId),record=facts.evidence.find(e=>(e.source_id||e.id)===recordId);
  if(!record)throw new AppError('FORBIDDEN',403,'Active evidence required.');
  if(record.id!==expectedId)throw new AppError('VALIDATION_ERROR',409,'Evidence changed. Reload before correcting.');
  let corrected;try{corrected=validateCorrection(record.kind,record.data.key,data);}catch{throw new AppError('VALIDATION_ERROR',400,'Correction fields or record identity are invalid.');}
  const id=randomUUID();await sql.query('INSERT INTO evidence_corrections(id,business_id,record_id,data,reason,actor_id) VALUES ($1,$2,$3,$4,$5,$6)',[id,businessId,recordId,JSON.stringify(corrected),reason,user.id]);
  await logAction(sql,user,businessId,'EVIDENCE_CORRECTED',{recordId,revisionId:id});return {id};
 });},
 async corrections(user:Actor,businessId:string,recordId:string){return db.transaction(async sql=>{
  await ownedBusiness(sql,user,businessId,true);const facts=await authorizedFacts(sql,businessId);if(!facts.evidence.some(e=>(e.source_id||e.id)===recordId))throw new AppError('FORBIDDEN',403,'Active evidence required.');
  return {original:(await sql.query('SELECT data FROM evidence_records WHERE id=$1',[recordId])).rows[0],revisions:(await sql.query('SELECT id,data,reason,created_at FROM evidence_corrections WHERE record_id=$1 ORDER BY created_at,id',[recordId])).rows};
 });},
 async job(user:Actor,businessId:string,id:string){return db.transaction(async sql=>{
  await ownedBusiness(sql,user,businessId,true);
  const row=(await sql.query<{id:string;status:string;preview:EvidencePreview;result:unknown}>(`SELECT b.id,b.status,b.preview,b.result FROM evidence_batches b JOIN consents c ON c.id=b.consent_id WHERE b.business_id=$1 AND b.id=$2 AND c.revoked_at IS NULL AND c.expires_at>now()`,[businessId,id])).rows[0];
  if(!row)throw new AppError('CONSENT_REQUIRED',403,'Evidence access or consent unavailable.');return row;
 });},
 async preview(user:Actor,businessId:string,kind:EvidenceKind,csv:string,filename:string){
  await ownedBusiness(db,user,businessId);const preview=parseEvidence(csv,kind);
  return db.transaction(async sql=>{
   await ownedBusiness(sql,user,businessId,true);
   const prior=(await sql.query<{record_key:string;fingerprint:string}>('SELECT record_key,fingerprint FROM evidence_records WHERE business_id=$1 AND kind=$2',[businessId,kind])).rows;
   const accepted:typeof preview.rows=[];
   for(const row of preview.rows){const old=prior.find(p=>p.record_key===row.key);if(!old)accepted.push(row);else if(old.fingerprint===row.fingerprint)preview.skipped.push({row:row.row,reason:'Already stored; re-upload is idempotent.'});else preview.rejected.push({row:row.row,reason:'Existing identifier has conflicting values. Original source retained; review required.'});}
   preview.rows=accepted;
   const consent=randomUUID(),id=randomUUID();
   await sql.query("INSERT INTO consents(id,business_id,actor_id,purpose,version,categories,expires_at) VALUES ($1,$2,$3,'Financial evidence analysis','evidence-consent-v1',$4,now()+interval '90 days')",[consent,businessId,user.id,[kind]]);
   await sql.query("INSERT INTO evidence_batches(id,business_id,consent_id,kind,status,filename,file_hash,preview) VALUES ($1,$2,$3,$4,'PREVIEW',$5,$6,$7)",[id,businessId,consent,kind,filename.replace(/[^\w. -]/g,'_'),digest(csv),JSON.stringify(preview)]);
   await logAction(sql,user,businessId,'EVIDENCE_PREVIEW',{batchId:id,kind});return {id,preview};
  });
 },
 async commit(user:Actor,businessId:string,id:string){return db.transaction(async sql=>{
  await ownedBusiness(sql,user,businessId,true);
  const batch=(await sql.query<{preview:EvidencePreview;status:string;result:unknown}>(`SELECT b.preview,b.status,b.result FROM evidence_batches b JOIN consents c ON c.id=b.consent_id WHERE b.id=$1 AND b.business_id=$2 AND c.revoked_at IS NULL AND c.expires_at>now() FOR UPDATE OF b`,[id,businessId])).rows[0];
  if(!batch)throw new AppError('CONSENT_REQUIRED',403,'Evidence access or consent unavailable.');if(batch.status==='COMPLETED')return batch.result;
  let accepted=0,skipped=batch.preview.skipped.length;
  for(const row of batch.preview.rows){
   const old=(await sql.query<{fingerprint:string}>('SELECT fingerprint FROM evidence_records WHERE business_id=$1 AND kind=$2 AND record_key=$3',[businessId,batch.preview.kind,row.key])).rows[0];
   if(old){if(old.fingerprint!==row.fingerprint)throw new AppError('VALIDATION_ERROR',409,'A concurrent import has conflicting values. Create a fresh preview.');skipped++;continue;}
   await sql.query('INSERT INTO evidence_records(id,business_id,batch_id,kind,record_key,fingerprint,data) VALUES ($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),businessId,id,batch.preview.kind,row.key,row.fingerprint,JSON.stringify(row.data)]);accepted++;
  }
  const result={accepted,skipped,rejected:batch.preview.rejected.length};
  await sql.query("UPDATE evidence_batches SET status='COMPLETED',result=$2,completed_at=now() WHERE id=$1",[id,JSON.stringify(result)]);
  await logAction(sql,user,businessId,'EVIDENCE_IMPORTED',{batchId:id,...result});return result;
 });},
 async read(user:Actor,businessId:string,asOf:string){return db.transaction(async sql=>{
  const business=await ownedBusiness(sql,user,businessId,true);const facts=await authorizedFacts(sql,businessId);const current=assess(facts.cash,facts.evidence,asOf,facts.applicability);
  const allowed=new Set([...facts.cash,...facts.evidence].map(r=>r.id));
  const history=(await sql.query<{id:string;result:Assessment&{evidenceIds:string[]};created_at:string}>('SELECT id,result,created_at FROM assessments WHERE business_id=$1 ORDER BY created_at DESC LIMIT 30',[businessId])).rows.filter(row=>row.result.evidenceIds.every(id=>allowed.has(id)));
  const batches=(await sql.query(`SELECT b.id,b.kind,b.status,b.filename,b.origin,b.created_at,b.consent_id,c.revoked_at,c.expires_at FROM evidence_batches b JOIN consents c ON c.id=b.consent_id WHERE b.business_id=$1 ORDER BY b.created_at DESC LIMIT 30`,[businessId])).rows;
  const reviews=(await sql.query('SELECT match_key,disposition,note,created_at FROM reconciliation_reviews WHERE business_id=$1 ORDER BY created_at DESC',[businessId])).rows.filter(row=>allowed.has(String(row.match_key)));
  return {business,...facts,current,history,batches,reviews};
 });},
 async snapshot(user:Actor,businessId:string,asOf:string){return db.transaction(async sql=>{
  await ownedBusiness(sql,user,businessId,true);const facts=await authorizedFacts(sql,businessId);
  const result={...assess(facts.cash,facts.evidence,asOf,facts.applicability),evidenceIds:[...facts.cash,...facts.evidence].map(r=>r.id)};
  const hash=digest(JSON.stringify(facts));
  const saved=(await sql.query<{id:string}>(`INSERT INTO assessments(id,business_id,as_of,version,input_hash,result) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT(business_id,as_of,version,input_hash) DO UPDATE SET input_hash=EXCLUDED.input_hash RETURNING id`,[randomUUID(),businessId,asOf,SCORING_VERSION,hash,JSON.stringify(result)])).rows[0];
  await logAction(sql,user,businessId,'ASSESSMENT_SAVED',{assessmentId:saved.id});return {...saved,result};
 });},
 async review(user:Actor,businessId:string,key:string,disposition:'CONFIRMED'|'DISMISSED',note:string){return db.transaction(async sql=>{
  await ownedBusiness(sql,user,businessId,true);const {evidence}=await authorizedFacts(sql,businessId);
  if(!evidence.some(e=>e.id===key&&e.kind==='INVOICE'))throw new AppError('FORBIDDEN',403,'Invoice evidence unavailable.');
  await sql.query('INSERT INTO reconciliation_reviews(id,business_id,match_key,disposition,note,actor_id) VALUES ($1,$2,$3,$4,$5,$6)',[randomUUID(),businessId,key,disposition,note,user.id]);
  await logAction(sql,user,businessId,'RECONCILIATION_REVIEWED',{key,disposition});return {ok:true};
 });}
};}
