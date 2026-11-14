import { randomUUID } from 'node:crypto';
import type { Database,Sql } from './index';
import type { Actor } from '../security/auth-service';
import { ownedBusiness } from './businesses';
import { authorizedFacts,logAction } from './intelligence';
import { AppError } from '../security/errors';
export type ReviewInput={id:string;kind:string;evidence_id:string;amount_paise:string|null;party_alias:string|null;reason:string;active:boolean;created_at:string};
export async function activeReviewInputs(sql:Sql,businessId:string,allowed:Set<string>){return (await sql.query<ReviewInput>('SELECT id,kind,evidence_id,amount_paise::text,party_alias,reason,active,created_at FROM review_inputs WHERE business_id=$1 ORDER BY created_at DESC',[businessId])).rows.filter(r=>allowed.has(r.evidence_id));}
export async function addReviewInput(db:Database,user:Actor,businessId:string,input:{kind:string;evidenceId:string;amountPaise?:number;partyAlias?:string;reason:string}){return db.transaction(async sql=>{
 await ownedBusiness(sql,user,businessId,true);const facts=await authorizedFacts(sql,businessId);
 if(input.kind==='FINANCING_CLAIM'?!facts.evidence.some(e=>e.id===input.evidenceId&&e.kind==='INVOICE'):!facts.cash.some(t=>t.id===input.evidenceId))throw new AppError('FORBIDDEN',403,'The selected source record is unavailable or unsuitable.');
 const id=randomUUID();await sql.query('INSERT INTO review_inputs(id,business_id,actor_id,kind,evidence_id,amount_paise,party_alias,reason) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',[id,businessId,user.id,input.kind,input.evidenceId,input.amountPaise??null,input.partyAlias??null,input.reason]);await logAction(sql,user,businessId,'REVIEW_INPUT_ADDED',{id,kind:input.kind});return {id};
});}
export async function closeReviewInput(db:Database,user:Actor,businessId:string,id:string){return db.transaction(async sql=>{await ownedBusiness(sql,user,businessId,true);await sql.query('UPDATE review_inputs SET active=false,closed_at=now() WHERE id=$1 AND business_id=$2',[id,businessId]);await logAction(sql,user,businessId,'REVIEW_INPUT_CLOSED',{id});return {ok:true};});}
export function reviewInputSignals(inputs:ReviewInput[]){const active=inputs.filter(i=>i.active),claims=new Map<string,ReviewInput[]>();for(const i of active.filter(i=>i.kind==='FINANCING_CLAIM'))claims.set(i.evidence_id,[...(claims.get(i.evidence_id)||[]),i]);return {duplicateClaims:[...claims].filter(([,rs])=>rs.length>1).map(([evidenceId,rs])=>({evidenceId,claimIds:rs.map(r=>r.id),count:rs.length})),events:['REVERSAL','TECHNICAL_FAILURE','INSUFFICIENT_FUNDS'].map(kind=>({kind,count:active.filter(i=>i.kind===kind).length,evidenceIds:[...new Set(active.filter(i=>i.kind===kind).map(i=>i.evidence_id))]})),provenance:'OWNER_DECLARED_UNVERIFIED',warning:'Claims and event reasons are owner declarations, not bank/provider confirmations. Multiple claims may be legitimate co-financing or amendments.'};}
