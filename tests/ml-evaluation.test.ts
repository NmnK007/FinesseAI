import test from 'node:test';
import assert from 'node:assert/strict';
import { demoDataset,evaluate,trainCandidate,predict,bootstrapIntervals } from '../src/lib/ml-evaluation';
test('evaluation handles ties, confusion, calibration and absent classes',()=>{
 const r=evaluate([{p:0.8,y:1},{p:0.8,y:0},{p:0.2,y:1},{p:0.2,y:0}]);assert.equal(r.auroc,0.5);assert.equal(r.averagePrecision,0.5);assert.deepEqual(r.confusion,{tp:1,fp:1,tn:1,fn:1});assert.equal(r.calibration.reduce((n,b)=>n+b.n,0),4);assert.equal(evaluate([{p:0.5,y:1}]).auroc,null);assert.throws(()=>predict([0],[1]),/schema/);
});
test('candidate reproducible; untouched test changes never alter fitted weights or model selection',()=>{
 const rows=demoDataset(),first=trainCandidate(rows),again=trainCandidate(rows);assert.deepEqual(first,again);
 const poisoned=rows.map((s,i)=>i>=3200?{...s,y:1-s.y,x:s.x.map(n=>1-n)}:s);const second=trainCandidate(poisoned);assert.deepEqual(first.weights,second.weights);assert.deepEqual(first.validation,second.validation);assert.notDeepEqual(first.test,second.test);assert.notEqual(first.datasetHash,second.datasetHash);
 assert.equal(first.status,'DEMO_ONLY');assert.throws(()=>trainCandidate([...rows,rows[0]]),/leakage/);
});

test('bootstrap intervals are seeded, ordered and bounded',()=>{
 const rows=[{p:0.8,y:1},{p:0.2,y:0},{p:0.6,y:0},{p:0.3,y:1}],a=bootstrapIntervals(rows);assert.deepEqual(a,bootstrapIntervals(rows));assert.ok(a.brier.lower<=a.brier.upper);assert.ok(a.accuracy.lower>=0&&a.accuracy.upper<=1);assert.throws(()=>bootstrapIntervals([]));
});
