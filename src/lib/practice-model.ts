import { createHash } from 'node:crypto';
import { fit,predict,evaluate,bootstrapIntervals } from './ml-evaluation';
export const practiceFeatures=['laufzeit','hoehe','rate','wohnzeit','bishkred','pers'];
export type PracticeRow={id:string;split:'train'|'validation'|'test';x:number[];y:number;age:number};
export function parsePractice(text:string):PracticeRow[]{
 const lines=text.trim().split(/\r?\n/),headers=lines.shift()!.trim().split(/\s+/);
 if(headers.length!==21||!['kredit','alter',...practiceFeatures].every(c=>headers.includes(c)))throw new Error('Practice dataset schema mismatch');
 return lines.map(line=>{const values=line.trim().split(/\s+/).map(Number);if(values.length!==21||values.some(v=>!Number.isFinite(v))||![0,1].includes(values[headers.indexOf('kredit')]))throw new Error('Invalid practice row');
  const group=values.filter((_,i)=>headers[i]!=='kredit').join(','),id=createHash('sha256').update(group).digest('hex'),bucket=parseInt(id.slice(0,8),16)%100;
  return {id,split:bucket<60?'train':bucket<80?'validation':'test',x:practiceFeatures.map(f=>values[headers.indexOf(f)]),y:1-values[headers.indexOf('kredit')],age:values[headers.indexOf('alter')]};
 });
}
export function trainPractice(rows:PracticeRow[]){
 const train=rows.filter(r=>r.split==='train'),validation=rows.filter(r=>r.split==='validation'),test=rows.filter(r=>r.split==='test');
 if(Math.min(train.length,validation.length,test.length)<50)throw new Error('Insufficient practice split');
 const assignments=new Map<string,string>();for(const r of rows){if(assignments.has(r.id)&&assignments.get(r.id)!==r.split)throw new Error('Group leakage');assignments.set(r.id,r.split);}
 const mean=practiceFeatures.map((_,i)=>train.reduce((n,r)=>n+r.x[i],0)/train.length),std=mean.map((m,i)=>Math.sqrt(train.reduce((n,r)=>n+(r.x[i]-m)**2,0)/train.length)||1);
 const transform=(r:PracticeRow)=>({...r,x:r.x.map((v,i)=>(v-mean[i])/std[i])}),prepared=train.map(transform);
 const candidates=[0.001,0.01,0.1].map(lambda=>{const weights=fit(prepared,lambda);return {lambda,weights,validation:evaluate(validation.map(r=>({p:predict(weights,transform(r).x),y:r.y})))};}).sort((a,b)=>a.validation.brier-b.validation.brier);
 const chosen=candidates[0],scored=test.map(r=>({p:predict(chosen.weights,transform(r).x),y:r.y})),prior=train.reduce((n,r)=>n+r.y,0)/train.length;
 return {version:'south-german-practice-v1',status:'METHODOLOGY_ONLY_NOT_MSME_VALIDATED',target:'Historical dataset bad-credit label (kredit=0); no asserted delinquency horizon or real-world PD',features:practiceFeatures,preprocessing:{mean,std,fitOn:'train only',ordinalHandling:'Ordinal codes treated as numerical for this limited six-feature baseline; amount is transformed historical DM, not INR'},split:{train:train.length,validation:validation.length,test:test.length,method:'SHA256 of all 20 observed predictor values modulo 100; identical vectors stay together. Borrower IDs and per-record dates unavailable.'},training:{epochs:200,learningRate:0.3,l2:chosen.lambda,threshold:0.5,classWeighting:'none'},weights:chosen.weights,validation:chosen.validation,test:evaluate(scored),confidenceIntervals:bootstrapIntervals(scored),baseline:evaluate(test.map(r=>({p:prior,y:r.y}))),segments:[{name:'age < 30',rows:test.filter(r=>r.age<30)},{name:'age >= 30',rows:test.filter(r=>r.age>=30)}].map(g=>({name:g.name,metrics:g.rows.length?evaluate(g.rows.map(r=>({p:predict(chosen.weights,transform(r).x),y:r.y}))):null})),limitations:['Foreign historical consumer population, oversampled bad outcomes and unknown sampling weights; probabilities are not population PD.','No actual borrower identifiers or record timestamps; cannot prove borrower independence or out-of-time validation.','Age excluded from fitting; age segment diagnostics do not establish fairness.','No app inference, Health Card integration, model publication or lending use.']};
}
