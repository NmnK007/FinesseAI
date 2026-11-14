import { AppError } from '../security/errors';
import { parseEvidence,type EvidenceKind } from '../ingestion/evidence-csv';
export interface FinancialDataProvider {
 id:string;status:'UPLOAD_ONLY'|'SANDBOX'|'CONFIGURATION_REQUIRED';
 listCapabilities():string[];
 startConsentOrAuthorize(granted:boolean):{status:string};
 fetch():Promise<{origin:string;csv:string}>;
 normalize(csv:string,kind:EvidenceKind):ReturnType<typeof parseEvidence>;
 revoke():void;
}
export function provider(id:'upload'|'simulator'|'aa'|'gst'|'utility'):FinancialDataProvider{
 let consent=false;
 return {id,status:id==='upload'?'UPLOAD_ONLY':id==='simulator'?'SANDBOX':'CONFIGURATION_REQUIRED',
 listCapabilities:()=>id==='upload'?['INVOICE','UTILITY','GST']:id==='simulator'?['SYNTHETIC_UTILITY_CONTRACT']:[],
 startConsentOrAuthorize(granted){consent=granted;return {status:granted?'AUTHORIZED_LOCAL_ONLY':'CONSENT_REQUIRED'};},
 async fetch(){if(!consent)throw new AppError('CONSENT_REQUIRED',403,'Consent required.');if(id!=='simulator')throw new AppError('PROVIDER_UNAVAILABLE',503,'No partner connection configured. Use authorized exports.');return {origin:'SANDBOX',csv:'bill_id,period,due_on,amount,paid_amount,paid_on,disputed\nSIM-001,2026-08,2026-09-10,100,100,2026-09-09,false'};},
 normalize:parseEvidence,revoke(){consent=false;}};
}
export const providerStatuses=[provider('upload'),provider('simulator'),provider('aa'),provider('gst'),provider('utility')].map(p=>({id:p.id,status:p.status,capabilities:p.listCapabilities()}));
