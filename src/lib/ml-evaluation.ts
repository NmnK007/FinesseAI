import { createHash } from 'node:crypto';
export type Sample={id:string;x:number[];y:number};
const sigmoid=(n:number)=>1/(1+Math.exp(-n));
export function demoDataset(){
 let state=20261113;const rnd=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 return Array.from({length:4000},(_,i)=>{const x=Array.from({length:6},rnd);return {id:`fictional-${i}`,x,y:rnd()<sigmoid(-2.5+3*x[0]+2*x[1]+x[2]+x[3]-2*x[4]-x[5])?1:0};});
}
export function fit(train:Sample[],lambda=0.01){
 const w=Array(7).fill(0) as number[];
 for(let epoch=0;epoch<200;epoch++){const g=Array(7).fill(0) as number[];for(const s of train){const error=predict(w,s.x)-s.y;g[0]+=error;for(let j=0;j<6;j++)g[j+1]+=error*s.x[j];}for(let j=0;j<7;j++)w[j]-=0.3*(g[j]/train.length+(j?lambda*w[j]:0));}
 return w;
}
export function predict(w:number[],x:number[]){if(w.length!==7||x.length!==6||[...w,...x].some(n=>!Number.isFinite(n)))throw new Error('Incompatible feature schema');return sigmoid(w[0]+x.reduce((n,v,i)=>n+v*w[i+1],0));}
export function bootstrapIntervals(rows:{p:number;y:number}[]){
 if(!rows.length)throw new Error('Evaluation rows required');let state=314159;const accuracy:number[]=[],brier:number[]=[];
 for(let b=0;b<500;b++){let correct=0,error=0;for(let i=0;i<rows.length;i++){state=(Math.imul(state,1664525)+1013904223)>>>0;const r=rows[Math.floor(state/4294967296*rows.length)];correct+=Number((r.p>=0.5?1:0)===r.y);error+=(r.p-r.y)**2;}accuracy.push(correct/rows.length);brier.push(error/rows.length);}
 const interval=(a:number[])=>{a.sort((a,b)=>a-b);return {lower:a[12],upper:a[487]};};
 return {method:'Seeded 500-resample iid percentile bootstrap, approximate 95%; resampled test rows only, not target-population validation',accuracy:interval(accuracy),brier:interval(brier)};
}
export function evaluate(rows:{p:number;y:number}[],threshold=0.5){
 if(!rows.length||rows.some(r=>!Number.isFinite(r.p)||r.p<0||r.p>1||![0,1].includes(r.y)))throw new Error('Invalid evaluation rows');
 const positive=rows.filter(r=>r.y===1),negative=rows.filter(r=>r.y===0);let wins=0;
 for(const a of positive)for(const b of negative)wins+=a.p>b.p?1:a.p===b.p?0.5:0;
 const tp=positive.filter(r=>r.p>=threshold).length,fp=negative.filter(r=>r.p>=threshold).length,fn=positive.length-tp,tn=negative.length-fp;
 const sorted=[...rows].sort((a,b)=>b.p-a.p);let seen=0,hits=0,ap=0;
 for(let i=0;i<sorted.length;){let j=i;let groupHits=0;while(j<sorted.length&&sorted[j].p===sorted[i].p){groupHits+=sorted[j].y;j++;}seen+=j-i;hits+=groupHits;ap+=groupHits*(hits/seen);i=j;}
 const div=(a:number,b:number)=>b?a/b:null;
 return {n:rows.length,threshold,prevalence:positive.length/rows.length,auroc:div(wins,positive.length*negative.length),averagePrecision:div(ap,positive.length),precision:div(tp,tp+fp),recall:div(tp,tp+fn),falsePositiveRate:div(fp,fp+tn),falseNegativeRate:div(fn,fn+tp),confusion:{tp,fp,tn,fn},accuracy:(tp+tn)/rows.length,brier:rows.reduce((n,r)=>n+(r.p-r.y)**2,0)/rows.length,calibration:Array.from({length:10},(_,i)=>{const bin=rows.filter(r=>Math.min(9,Math.floor(r.p*10))===i);return {from:i/10,to:(i+1)/10,n:bin.length,meanPrediction:bin.length?bin.reduce((n,r)=>n+r.p,0)/bin.length:null,observedRate:bin.length?bin.reduce((n,r)=>n+r.y,0)/bin.length:null};})};
}
export function trainCandidate(rows=demoDataset()){
 // Entity ids are unique synthetic businesses. Split BEFORE fitting or selecting lambda.
 if(new Set(rows.map(r=>r.id)).size!==rows.length)throw new Error('Entity leakage: duplicate synthetic business');
 const train=rows.slice(0,2400),validation=rows.slice(2400,3200),test=rows.slice(3200);
 const candidates=[0.001,0.01,0.1].map(lambda=>{const weights=fit(train,lambda);return {lambda,weights,validation:evaluate(validation.map(s=>({p:predict(weights,s.x),y:s.y})))};});
 candidates.sort((a,b)=>a.validation.brier-b.validation.brier);const selected=candidates[0];
 const testMetrics=evaluate(test.map(s=>({p:predict(selected.weights,s.x),y:s.y})));
 const prior=train.reduce((n,s)=>n+s.y,0)/train.length;
 return {version:'synthetic-methodology-v1',status:'DEMO_ONLY',deployment:'OFFLINE_CANDIDATE_NOT_SELECTED_FOR_APP',target:'Seeded Bernoulli outcome from author-written financial heuristics, NOT real approval/default',seed:20261113,datasetHash:createHash('sha256').update(JSON.stringify(rows)).digest('hex'),source:'Repository-generated fictional independent entities; no external records or observed outcomes',featureVersion:'synthetic-six-unit-v1',featureOrder:['revenue','compliance','diversification','growth','amountRatio','tenor'],preprocessing:'Fixed unit-interval generation; no fitted imputation/scaling',split:{train:train.length,validation:validation.length,test:test.length,method:'Disjoint ordered synthetic entity ids; no historical dates exist'},selection:'Minimum validation Brier across L2 penalties; fixed 0.5 threshold; test never used in selection',training:{epochs:200,learningRate:0.3,classWeighting:'none',lambda:selected.lambda},weights:selected.weights,validation:selected.validation,test:testMetrics,confidenceIntervals:bootstrapIntervals(test.map(s=>({p:predict(selected.weights,s.x),y:s.y}))),baseline:evaluate(test.map(s=>({p:prior,y:s.y}))),segments:[{name:'amountRatio < 0.5',metrics:evaluate(test.filter(s=>s.x[4]<0.5).map(s=>({p:predict(selected.weights,s.x),y:s.y})))},{name:'amountRatio >= 0.5',metrics:evaluate(test.filter(s=>s.x[4]>=0.5).map(s=>({p:predict(selected.weights,s.x),y:s.y})))}],limitations:['Synthetic metrics describe a fabricated data generator only.','No PD, lending decision, fairness validation or representative population inference.','No real out-of-time evaluation; entity ids have no repeated histories.','Calibration bins are diagnostics, not post-hoc probability calibration.']};
}
