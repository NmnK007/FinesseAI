import { randomUUID } from 'node:crypto';
import type { Database } from './index';
/** Operator task. Default is read-only; applies only after an explicit --apply. */
export async function retention(db:Database,apply=false){return db.transaction(async sql=>{
 const candidates=(await sql.query<{id:string}>(`SELECT DISTINCT business_id AS id FROM consents WHERE COALESCE(revoked_at,expires_at)<now()-interval '30 days' ORDER BY business_id`)).rows;
 let sources=0;for(const {id} of candidates){
  await sql.query('SELECT id FROM businesses WHERE id=$1 FOR UPDATE',[id]);
  const ids=(await sql.query<{id:string}>(`SELECT id FROM consents WHERE business_id=$1 AND COALESCE(revoked_at,expires_at)<now()-interval '30 days'`,[id])).rows.map(r=>r.id);
  const batches=(await sql.query<{id:string}>('SELECT id FROM evidence_batches WHERE business_id=$1 AND consent_id=ANY($2::uuid[])',[id,ids])).rows.map(r=>r.id);
  const jobs=(await sql.query<{id:string}>('SELECT id FROM ingestion_jobs WHERE business_id=$1 AND consent_id=ANY($2::uuid[])',[id,ids])).rows.map(r=>r.id);
  sources+=batches.length+jobs.length;if(!apply||!batches.length&&!jobs.length)continue;
  // Derived notes may quote source data. Clear this business's derived history conservatively.
  for(const table of ['assessments','scenarios','reconciliation_reviews','anomaly_reviews','lender_notes','feature_snapshots','review_inputs'])await sql.query(`DELETE FROM ${table} WHERE business_id=$1`,[id]);
  await sql.query('DELETE FROM transactions WHERE evidence_id IN (SELECT id FROM source_evidence WHERE job_id=ANY($1::uuid[]))',[jobs]);
  await sql.query('DELETE FROM source_evidence WHERE job_id=ANY($1::uuid[])',[jobs]);
  await sql.query('DELETE FROM ingestion_jobs WHERE id=ANY($1::uuid[])',[jobs]);
  await sql.query('DELETE FROM evidence_records WHERE batch_id=ANY($1::uuid[])',[batches]);
  await sql.query('DELETE FROM evidence_batches WHERE id=ANY($1::uuid[])',[batches]);
  await sql.query("INSERT INTO audit_events(id,business_id,action,metadata) VALUES ($1,$2,'RETENTION_PURGED',$3)",[randomUUID(),id,JSON.stringify({sources:batches.length+jobs.length,graceDays:30})]);
 }
 return {mode:apply?'APPLIED':'DRY_RUN',eligibleSources:sources,policy:'30 days after expiry/revocation; affected business derived histories/notes cleared; active source facts preserved'};
});}
