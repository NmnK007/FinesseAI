import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parsePractice,trainPractice } from '../src/lib/practice-model';
test('historical practice label, grouping, train-only preprocessing and untouched test are enforced',async()=>{
 const rows=parsePractice(await readFile('data/practice/south-german/SouthGermanCredit.asc','utf8'));assert.equal(rows.length,1000);assert.equal(rows.filter(r=>r.y===1).length,300);const first=trainPractice(rows),second=trainPractice(rows.map(r=>r.split==='test'?{...r,x:r.x.map(v=>v*100),y:1-r.y}:r));assert.deepEqual(first.weights,second.weights);assert.deepEqual(first.preprocessing,second.preprocessing);assert.deepEqual(first.validation,second.validation);assert.notDeepEqual(first.test,second.test);assert.equal(first.status,'METHODOLOGY_ONLY_NOT_MSME_VALIDATED');assert.throws(()=>trainPractice([...rows,{...rows[0],split:rows[0].split==='test'?'train':'test'}]),/leakage/);
});
