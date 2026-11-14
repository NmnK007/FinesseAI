import test from 'node:test';
import assert from 'node:assert/strict';
import { trainLR,type Features } from '../src/lib/agami/lrRetrain';
import { getModel,trainDemoModel,type LenderKey } from '../src/lib/mlModel';
test('Agami evaluation rows never affect fitted weights',()=>{
  const rows=Array.from({length:40},(_,i)=>({features:[i/40,0.5,0.4,0.2,0.3,0.6] as Features}));
  const changed=rows.map((r,i)=>i<10?{features:[100,100,100,100,100,100] as Features}:r);
  assert.deepEqual(trainLR('Illustrative lender A',rows).weights,trainLR('Illustrative lender A',changed).weights);
});
test('offline synthetic artifacts reproduce and online inference uses those fixed weights',()=>{
  for(const key of ['Illustrative lender A','Illustrative lender B','Illustrative lender C'] as LenderKey[]){
    assert.deepEqual(getModel(key),trainDemoModel(key));
    assert.equal(getModel(key).weights.length,7);
  }
});
