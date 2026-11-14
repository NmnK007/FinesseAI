import { randomUUID } from 'node:crypto';
import type { Database, Sql } from './index';
import type { Actor } from '../security/auth-service';
import { AppError } from '../security/errors';
import { parseBankCsv, digest, type Mapping, type Preview, type Category } from '../ingestion/bank-csv';
import { financialMetrics, type MetricTransaction } from '../finance/metrics';

export async function ownedBusiness(sql: Sql, actor: Actor, id: string, lock=false) {
  const { rows } = await sql.query<{id:string;name:string;gstin:string|null}>(`SELECT b.id,b.name,b.gstin FROM businesses b JOIN memberships m ON m.organization_id=b.organization_id
    WHERE b.id=$1 AND m.user_id=$2 AND m.role='owner' ${lock ? 'FOR UPDATE OF b' : ''}`, [id,actor.id]);
  if (!rows[0]) throw new AppError('FORBIDDEN',403,'Business access is not available.');
  return rows[0];
}
async function audit(sql:Sql, actor:Actor, businessId:string, action:string, metadata:Record<string,unknown>={}) {
  await sql.query('INSERT INTO audit_events(id,actor_id,business_id,action,metadata) VALUES ($1,$2,$3,$4,$5)',[randomUUID(),actor.id,businessId,action,JSON.stringify(metadata)]);
}
async function activeConsent(sql:Sql,businessId:string,consentId:string) {
  const {rows}=await sql.query('SELECT id FROM consents WHERE id=$1 AND business_id=$2 AND revoked_at IS NULL AND expires_at>now()',[consentId,businessId]);
  if (!rows.length) throw new AppError('CONSENT_REQUIRED',403,'Import consent has expired or was revoked.');
}
async function transactions(sql:Sql,businessId:string) {
  return (await sql.query<MetricTransaction>(`SELECT t.id,t.occurred_on::text,t.amount_paise::text,t.balance_paise::text,t.account_id,t.category,t.category_confidence,t.category_method,t.description,t.reference,t.evidence_id
    FROM transactions t JOIN source_evidence e ON e.id=t.evidence_id JOIN ingestion_jobs j ON j.id=e.job_id
    JOIN consents c ON c.id=j.consent_id WHERE t.business_id=$1 AND c.revoked_at IS NULL AND c.expires_at>now()
    ORDER BY t.occurred_on,t.created_at,t.id`,[businessId])).rows;
}
export function businessStore(database:Database) {
  return {
    async list(actor:Actor) {
      return (await database.query(`SELECT b.id,b.name,b.gstin FROM businesses b JOIN memberships m ON m.organization_id=b.organization_id WHERE m.user_id=$1 AND m.role='owner' ORDER BY b.created_at`,[actor.id])).rows;
    },
    async create(actor:Actor,name:string,gstin?:string) {
      if(actor.role!=='customer') throw new AppError('FORBIDDEN',403,'Only business owners can create a business.');
      return database.transaction(async sql=>{
        const organizationId=randomUUID(), id=randomUUID();
        await sql.query('INSERT INTO organizations(id,name) VALUES ($1,$2)',[organizationId,name]);
        await sql.query("INSERT INTO memberships(organization_id,user_id,role) VALUES ($1,$2,'owner')",[organizationId,actor.id]);
        await sql.query('INSERT INTO businesses(id,organization_id,name,gstin) VALUES ($1,$2,$3,$4)',[id,organizationId,name,gstin||null]);
        await audit(sql,actor,id,'BUSINESS_CREATED');
        return {id,name,gstin:gstin||null};
      });
    },
    async preview(actor:Actor,input:{businessId:string;accountAlias:string;csv:string;filename:string;mapping?:Mapping}) {
      await ownedBusiness(database,actor,input.businessId);
      const preview=parseBankCsv(input.csv,input.mapping);
      return database.transaction(async sql=>{
        await ownedBusiness(sql,actor,input.businessId,true);
        const account=await sql.query<{id:string}>(`INSERT INTO accounts(id,business_id,alias) VALUES ($1,$2,$3) ON CONFLICT(business_id,alias) DO UPDATE SET alias=EXCLUDED.alias RETURNING id`,[randomUUID(),input.businessId,input.accountAlias]);
        const consentId=randomUUID(), jobId=randomUUID();
        await sql.query("INSERT INTO consents(id,business_id,actor_id,purpose,version,categories,expires_at) VALUES ($1,$2,$3,'Local financial analysis','upload-consent-v1',ARRAY['bank_transactions'],now()+interval '90 days')",[consentId,input.businessId,actor.id]);
        const prior=await sql.query<{fingerprint:string}>('SELECT fingerprint FROM transactions WHERE account_id=$1',[account.rows[0].id]);
        const fingerprints=new Set(prior.rows.map(row=>row.fingerprint));
        for(const row of preview.rows) if(fingerprints.has(row.fingerprint)) preview.skipped.push({row:row.row,reason:'Already stored for this account; re-upload will not count it again.'});
        preview.rows=preview.rows.filter(row=>!fingerprints.has(row.fingerprint));
        await sql.query("INSERT INTO ingestion_jobs(id,business_id,account_id,consent_id,status,file_hash,filename,parser_version,preview) VALUES ($1,$2,$3,$4,'PREVIEW',$5,$6,$7,$8)",[jobId,input.businessId,account.rows[0].id,consentId,digest(input.csv),input.filename.replace(/[^a-zA-Z0-9._ -]/g,'_').slice(0,120),preview.parserVersion,JSON.stringify(preview)]);
        await audit(sql,actor,input.businessId,'IMPORT_PREVIEW',{jobId,rows:preview.rows.length});
        return {id:jobId,businessId:input.businessId,status:'PREVIEW',preview};
      });
    },
    async job(actor:Actor,id:string) {
      const {rows}=await database.query<{id:string;business_id:string;status:string;preview:Preview;result:unknown;created_at:string;completed_at:string|null;consent_id:string}>('SELECT id,business_id,status,preview,result,created_at,completed_at,consent_id FROM ingestion_jobs WHERE id=$1',[id]);
      if(!rows[0]) throw new AppError('FORBIDDEN',403,'Import access is not available.');
      await ownedBusiness(database,actor,rows[0].business_id);
      await activeConsent(database,rows[0].business_id,rows[0].consent_id);
      return rows[0];
    },
    async commit(actor:Actor,id:string,corrections:Record<string,Category>={}) {
      return database.transaction(async sql=>{
        const {rows}=await sql.query<{id:string;business_id:string;account_id:string;consent_id:string;preview:Preview;file_hash:string;status:string;result:unknown}>('SELECT * FROM ingestion_jobs WHERE id=$1',[id]);
        const job=rows[0];
        if(!job) throw new AppError('FORBIDDEN',403,'Import access is not available.');
        // Business lock serializes imports, consent changes and snapshot generation across instances.
        await ownedBusiness(sql,actor,job.business_id,true);
        await activeConsent(sql,job.business_id,job.consent_id);
        const fresh=await sql.query<{status:string;result:unknown}>('SELECT status,result FROM ingestion_jobs WHERE id=$1',[id]);
        if(fresh.rows[0].status==='COMPLETED') return fresh.rows[0].result;
        for (const key of Object.keys(corrections)) if (!job.preview.rows.some(r=>String(r.row)===key)) throw new AppError('VALIDATION_ERROR',400,'Category correction refers to an unknown row.');
        const evidenceId=randomUUID();
        await sql.query("INSERT INTO source_evidence(id,business_id,job_id,origin,file_hash,transformations) VALUES ($1,$2,$3,'USER_UPLOADED_UNVERIFIED',$4,'bank-csv-v1; INR paise; strict dates; narration categories; fingerprint dedupe')",[evidenceId,job.business_id,id,job.file_hash]);
        let accepted=0,duplicates=0;
        for(const row of job.preview.rows) {
          const category=corrections[String(row.row)] ?? row.category;
          if((category==='BUSINESS_SALE' || category==='CAPITAL_INJECTION' || category==='LOAN_DISBURSEMENT') && row.amountPaise<0) throw new AppError('VALIDATION_ERROR',400,'Receipt category requires a positive amount.');
          if(['CUSTOMER_REFUND','LOAN_EMI','SUPPLIER_PAYMENT','SALARY','TAX','UTILITY','FEES'].includes(category) && row.amountPaise>0) throw new AppError('VALIDATION_ERROR',400,'Payment category requires a negative amount.');
          const corrected=Object.hasOwn(corrections,String(row.row));
          const inserted=await sql.query(`INSERT INTO transactions(id,business_id,account_id,evidence_id,occurred_on,amount_paise,balance_paise,description,reference,fingerprint,category,category_confidence,category_method)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(account_id,fingerprint) DO NOTHING RETURNING id`,
            [randomUUID(),job.business_id,job.account_id,evidenceId,row.date,row.amountPaise,row.balancePaise,row.description,row.reference,row.fingerprint,category,corrected?1:row.categoryConfidence,corrected?'owner_reviewed':'inferred']);
          if(inserted.rows.length) accepted++; else duplicates++;
        }
        const metrics=financialMetrics(await transactions(sql,job.business_id));
        const result={accepted,skipped:job.preview.skipped.length+duplicates,rejected:job.preview.rejected.length,metrics,evidenceId};
        await sql.query("INSERT INTO feature_snapshots(id,business_id,job_id,version,metrics) VALUES ($1,$2,$3,'cash-metrics-v1',$4)",[randomUUID(),job.business_id,id,JSON.stringify(metrics)]);
        await sql.query("UPDATE ingestion_jobs SET status='COMPLETED',result=$2,completed_at=now() WHERE id=$1",[id,JSON.stringify(result)]);
        await audit(sql,actor,job.business_id,'IMPORT_COMPLETED',{jobId:id,accepted,duplicates,correctedRows:Object.keys(corrections).length});
        return result;
      });
    },
    async detail(actor:Actor,id:string) {
      return database.transaction(async sql=>{
        const business=await ownedBusiness(sql,actor,id,true);
        const rows=await transactions(sql,id);
        const sources=await sql.query(`SELECT e.id,e.origin,e.imported_at,j.filename,j.parser_version,c.id AS consent_id,c.expires_at,c.revoked_at FROM source_evidence e JOIN ingestion_jobs j ON j.id=e.job_id JOIN consents c ON c.id=j.consent_id WHERE e.business_id=$1 ORDER BY e.imported_at DESC`,[id]);
        const jobs=await sql.query(`SELECT j.id,j.status,j.filename,j.created_at FROM ingestion_jobs j JOIN consents c ON c.id=j.consent_id WHERE j.business_id=$1 AND c.revoked_at IS NULL AND c.expires_at>now() ORDER BY j.created_at DESC LIMIT 30`,[id]);
        return {business,metrics:financialMetrics(rows),transactions:rows,sources:sources.rows,jobs:jobs.rows};
      });
    },
    async revoke(actor:Actor,businessId:string,consentId:string) {
      await database.transaction(async sql=>{
        await ownedBusiness(sql,actor,businessId,true);
        await sql.query('UPDATE consents SET revoked_at=COALESCE(revoked_at,now()) WHERE id=$1 AND business_id=$2',[consentId,businessId]);
        // Historical snapshots may include this source: remove derived data so it cannot be reused.
        await sql.query('DELETE FROM feature_snapshots WHERE business_id=$1',[businessId]);
        await audit(sql,actor,businessId,'CONSENT_REVOKED',{consentId});
      });
    },
    async remove(actor:Actor,id:string) {
      await database.transaction(async sql=>{
        await ownedBusiness(sql,actor,id,true);
        // Audit only the action after deletion; no business identifier or financial data retained.
        const org=await sql.query<{organization_id:string}>('SELECT organization_id FROM businesses WHERE id=$1',[id]);
        await sql.query('DELETE FROM organizations WHERE id=$1',[org.rows[0].organization_id]);
        await sql.query("INSERT INTO audit_events(id,actor_id,action) VALUES ($1,$2,'BUSINESS_DELETED')",[randomUUID(),actor.id]);
      });
    },
  };
}
