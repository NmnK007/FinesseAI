import { randomUUID } from 'node:crypto';
import type { Database,Sql } from './index';
import type { Actor } from '../security/auth-service';
import { ownedBusiness } from './businesses';
import { authorizedFacts,logAction } from './intelligence';
import { assess } from '../finance/assessment';
import { detectAlerts } from '../finance/anomalies';
import { emiPaise } from '../finance/scenario';
import { AppError } from '../security/errors';
export const profiles=[{id:'ILLUSTRATIVE_A',name:'Illustrative lender A',annualRateBps:1200,feesPaise:50000},{id:'ILLUSTRATIVE_B',name:'Illustrative lender B',annualRateBps:1400,feesPaise:25000},{id:'ILLUSTRATIVE_C',name:'Illustrative lender C',annualRateBps:1600,feesPaise:0}];
async function shared(sql:Sql,user:Actor,id:string){
 if(!['lender','admin'].includes(user.role))throw new AppError('FORBIDDEN',403,'Reviewer role required.');
 const grant=(await sql.query('SELECT id FROM sharing_grants WHERE business_id=$1 AND reviewer_id=$2 AND revoked_at IS NULL AND expires_at>now()',[id,user.id])).rows[0];
 if(!grant)throw new AppError('FORBIDDEN',403,'Owner sharing grant is unavailable.');
}
export function lendingStore(db:Database){return {
 async owner(user:Actor,id:string){await ownedBusiness(db,user,id);return {profiles,grants:(await db.query('SELECT g.id,g.reviewer_id,u.email,g.expires_at,g.revoked_at FROM sharing_grants g JOIN users u ON u.id=g.reviewer_id WHERE g.business_id=$1',[id])).rows,applications:(await db.query('SELECT id,profile,terms,status,created_at FROM sandbox_applications WHERE business_id=$1 ORDER BY created_at DESC',[id])).rows};},
 async share(user:Actor,id:string,email:string){return db.transaction(async sql=>{
  await ownedBusiness(sql,user,id,true);const reviewer=(await sql.query<{id:string}>("SELECT id FROM users WHERE email=$1 AND role IN ('lender','admin')",[email])).rows[0];
  if(!reviewer)throw new AppError('VALIDATION_ERROR',400,'An enrolled reviewer with this address is required.');
  await sql.query("INSERT INTO sharing_grants(id,business_id,reviewer_id,owner_id,purpose,expires_at) VALUES ($1,$2,$3,$4,'Read-only financial evidence review',now()+interval '7 days') ON CONFLICT(business_id,reviewer_id) DO UPDATE SET expires_at=now()+interval '7 days',revoked_at=NULL",[randomUUID(),id,reviewer.id,user.id]);
  await logAction(sql,user,id,'LENDER_ACCESS_GRANTED',{reviewerId:reviewer.id});return {ok:true};
 });},
 async revoke(user:Actor,id:string,grantId:string){return db.transaction(async sql=>{await ownedBusiness(sql,user,id,true);await sql.query('UPDATE sharing_grants SET revoked_at=now() WHERE id=$1 AND business_id=$2',[grantId,id]);await logAction(sql,user,id,'LENDER_ACCESS_REVOKED',{grantId});return {ok:true};});},
 async pipeline(user:Actor){if(!['lender','admin'].includes(user.role))throw new AppError('FORBIDDEN',403,'Reviewer role required.');return (await db.query('SELECT b.id,b.name,g.expires_at FROM businesses b JOIN sharing_grants g ON g.business_id=b.id WHERE g.reviewer_id=$1 AND g.revoked_at IS NULL AND g.expires_at>now() ORDER BY b.name',[user.id])).rows;},
 async review(user:Actor,id:string,asOf:string){return db.transaction(async sql=>{
  await shared(sql,user,id);await sql.query('SELECT id FROM businesses WHERE id=$1 FOR UPDATE',[id]);await shared(sql,user,id);
  const facts=await authorizedFacts(sql,id);return {card:assess(facts.cash,facts.evidence,asOf,facts.applicability),alerts:detectAlerts(facts.cash,facts.evidence,asOf),...facts,notes:(await sql.query<{disposition:string;note:string;created_at:string;evidence_ids:string[]|null}>('SELECT disposition,note,created_at,evidence_ids FROM lender_notes WHERE business_id=$1 ORDER BY created_at DESC',[id])).rows.filter(n=>n.evidence_ids!==null&&n.evidence_ids.every(key=>[...facts.cash,...facts.evidence].some(r=>r.id===key)))};
 });},
 async note(user:Actor,id:string,disposition:string,note:string){return db.transaction(async sql=>{await sql.query('SELECT id FROM businesses WHERE id=$1 FOR UPDATE',[id]);await shared(sql,user,id);const facts=await authorizedFacts(sql,id);await sql.query("INSERT INTO lender_notes(id,business_id,reviewer_id,disposition,note,evidence_ids,export_policy) VALUES ($1,$2,$3,$4,$5,$6,'OWNER_VISIBLE_SCOPED')",[randomUUID(),id,user.id,disposition,note,JSON.stringify([...facts.cash,...facts.evidence].map(r=>r.id))]);await logAction(sql,user,id,'LENDER_REVIEW_NOTE',{disposition});return {ok:true};});},
 async create(user:Actor,id:string,profileId:string,principal:number,tenure:number){return db.transaction(async sql=>{
  await ownedBusiness(sql,user,id,true);const profile=profiles.find(p=>p.id===profileId);if(!profile)throw new AppError('VALIDATION_ERROR',400,'Unknown illustrative profile.');
  const emi=emiPaise(principal,profile.annualRateBps,tenure),applicationId=randomUUID();
  const terms={mode:'SIMULATED',notAnOffer:true,principalPaise:principal,tenureMonths:tenure,nominalAnnualRatePct:profile.annualRateBps/100,apr:null,feesPaise:profile.feesPaise,emiPaise:emi,totalRepaymentPaise:emi*tenure+profile.feesPaise,date:new Date().toISOString().slice(0,10),disclosure:'Illustrative arithmetic only. No real lender participation, credit decision, application transmission or commitment.'};
  await sql.query('INSERT INTO sandbox_applications(id,business_id,actor_id,profile,terms) VALUES ($1,$2,$3,$4,$5)',[applicationId,id,user.id,profile.name,JSON.stringify(terms)]);await logAction(sql,user,id,'SANDBOX_DRAFT_CREATED',{applicationId});return {id:applicationId,terms};
 });},
 async transition(user:Actor,id:string,applicationId:string,status:'SIMULATED_SUBMISSION'|'CANCELLED'){return db.transaction(async sql=>{
  await ownedBusiness(sql,user,id,true);const result=await sql.query('UPDATE sandbox_applications SET status=$3 WHERE id=$1 AND business_id=$2 AND status=\'DRAFT\' RETURNING id',[applicationId,id,status]);if(!result.rows.length)throw new AppError('VALIDATION_ERROR',409,'Draft unavailable or already finalized.');await logAction(sql,user,id,'SANDBOX_STATUS_CHANGED',{applicationId,status});return {ok:true,mode:'SIMULATED',transmitted:false};
 });}
};}
