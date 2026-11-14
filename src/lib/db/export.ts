import { activeReviewInputs } from './review-inputs';
import type { Database } from './index';
import type { Actor } from '../security/auth-service';
import { ownedBusiness } from './businesses';
import { authorizedFacts,logAction } from './intelligence';
import { detectAlerts } from '../finance/anomalies';
export async function exportBusiness(db:Database,user:Actor,id:string){return db.transaction(async sql=>{
 const business=await ownedBusiness(sql,user,id,true),facts=await authorizedFacts(sql,id),allowed=new Set([...facts.cash,...facts.evidence].map(r=>r.id));
 const assessments=(await sql.query<{result:{evidenceIds:string[]}}>('SELECT id,as_of,version,result,created_at FROM assessments WHERE business_id=$1',[id])).rows.filter(r=>r.result.evidenceIds.every(i=>allowed.has(i)));
 const scenarios=(await sql.query<{evidence_ids:string[]}>('SELECT id,input,result,evidence_ids,created_at FROM scenarios WHERE business_id=$1',[id])).rows.filter(r=>r.evidence_ids.every(i=>allowed.has(i)));
 const matches=(await sql.query('SELECT match_key,disposition,note,created_at FROM reconciliation_reviews WHERE business_id=$1',[id])).rows.filter(r=>allowed.has(String(r.match_key)));
 const alerts=detectAlerts(facts.cash,facts.evidence,new Date().toISOString().slice(0,10)),keys=new Set(alerts.map(a=>a.key));
 const reviews=(await sql.query('SELECT alert_key,status,note,created_at FROM anomaly_reviews WHERE business_id=$1',[id])).rows.filter(r=>keys.has(String(r.alert_key)));
 const applications=(await sql.query('SELECT id,profile,terms,status,created_at FROM sandbox_applications WHERE business_id=$1',[id])).rows;
 const grants=(await sql.query('SELECT id,purpose,expires_at,revoked_at,created_at FROM sharing_grants WHERE business_id=$1',[id])).rows;
 const consents=(await sql.query('SELECT id,purpose,categories,version,expires_at,revoked_at FROM consents WHERE business_id=$1',[id])).rows;
 const reviewInputs=await activeReviewInputs(sql,id,allowed);
 const reviewerNotes=(await sql.query<{evidence_ids:string[]|null}>("SELECT id,disposition,note,created_at,evidence_ids,export_policy FROM lender_notes WHERE business_id=$1 AND export_policy='OWNER_VISIBLE_SCOPED'",[id])).rows.filter(n=>n.evidence_ids!==null&&n.evidence_ids.every(key=>allowed.has(key)));
 await logAction(sql,user,id,'BUSINESS_EXPORTED',{format:'authorized-evidence-v1'});
 return {version:'authorized-evidence-v1',exportedAt:new Date().toISOString(),business,...facts,assessments,scenarios,matches,alerts,reviews,applications,grants,consents,reviewerNotes,reviewInputs,limitations:['Revoked/expired source facts and dependent results are excluded.','Legacy unscoped reviewer notes and notes dependent on unavailable source revisions are omitted. New reviewer notes are explicitly owner-visible.','JSON export; strings are data, never spreadsheet formulas.']};
});}
