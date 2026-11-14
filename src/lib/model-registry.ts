import { createHash } from 'node:crypto';
import type { trainCandidate } from './ml-evaluation';
import { predict } from './ml-evaluation';
type Candidate=ReturnType<typeof trainCandidate>;
export type Registry={version:1;selected:string|null;history:{hash:string;selectedAt:string}[]};
export function validateCandidate(bytes:string){
 const candidate=JSON.parse(bytes) as Candidate;
 if(candidate.status!=='DEMO_ONLY'||candidate.featureVersion!=='synthetic-six-unit-v1'||candidate.deployment!=='OFFLINE_CANDIDATE_NOT_SELECTED_FOR_APP'||candidate.split?.test<100||!Number.isFinite(candidate.validation?.brier)||candidate.validation.brier<0||candidate.validation.brier>1)throw new Error('Candidate failed schema/status/validation gate');
 predict(candidate.weights,[0.5,0.5,0.5,0.5,0.5,0.5]);
 return {candidate,hash:createHash('sha256').update(bytes).digest('hex')};
}
export function selectCandidate(registry:Registry,bytes:string,at:string){const {hash}=validateCandidate(bytes);return {version:1 as const,selected:hash,history:[...registry.history,{hash,selectedAt:at}]};}
export function rollback(registry:Registry,at:string):Registry{const previous=[...registry.history].reverse().find(h=>h.hash!==registry.selected);if(!previous)throw new Error('No previous distinct candidate');return {...registry,selected:previous.hash,history:[...registry.history,{hash:previous.hash,selectedAt:at}]};}
export function monitoredInference(bytes:string,expectedHash:string,x:number[]){const {candidate,hash}=validateCandidate(bytes);if(hash!==expectedHash)throw new Error('Artifact integrity mismatch');if(x.length!==6||x.some(v=>!Number.isFinite(v)||v<0||v>1))return {status:'OUT_OF_DISTRIBUTION',prediction:null};return {status:'DEMO_ONLY',prediction:predict(candidate.weights,x),warning:'Synthetic label probability, never a real default probability or credit decision.'};}
