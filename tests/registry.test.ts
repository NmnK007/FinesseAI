import test from 'node:test';
import assert from 'node:assert/strict';
import { trainCandidate } from '../src/lib/ml-evaluation';
import { selectCandidate,rollback,monitoredInference,validateCandidate } from '../src/lib/model-registry';
test('offline registry explicitly selects, rolls back, rejects tampering and unsupported schema',()=>{
 const candidate=trainCandidate(),first=JSON.stringify(candidate),second=JSON.stringify({...candidate,version:'synthetic-methodology-v2'}),a=selectCandidate({version:1,selected:null,history:[]},first,'2026-11-13T00:00:00Z'),b=selectCandidate(a,second,'2026-11-13T01:00:00Z');
 assert.notEqual(a.selected,b.selected);assert.equal(rollback(b,'2026-11-13T02:00:00Z').selected,a.selected);assert.throws(()=>rollback(a,'now'),/previous/);
 assert.equal(monitoredInference(first,a.selected!,[0.5,0.5,0.5,0.5,0.5,0.5]).status,'DEMO_ONLY');assert.equal(monitoredInference(first,a.selected!,[2,0,0,0,0,0]).prediction,null);assert.throws(()=>monitoredInference(second,a.selected!,[0,0,0,0,0,0]),/integrity/);assert.throws(()=>validateCandidate(JSON.stringify({...candidate,status:'PRODUCTION'})),/gate/);
});
