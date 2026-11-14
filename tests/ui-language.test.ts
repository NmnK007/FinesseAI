import test from 'node:test';
import assert from 'node:assert/strict';
import {translate} from '../src/lib/ui-language';
import {readFile,readdir} from 'node:fs/promises';
import ts from 'typescript';
import {counterpartyKey} from '../src/lib/finance/counterparty';
test('declared party grouping normalizes Unicode and spacing without guessing identity',()=>{
 assert.equal(counterpartyKey('  ACME　 Trading '),counterpartyKey('acme trading'));
 assert.notEqual(counterpartyKey('Acme Ltd'),counterpartyKey('Acme LLP'));
 assert.notEqual(counterpartyKey('ABC-12'),counterpartyKey('ABC12'));
});
test('UI language preserves record content, IDs and financial values while translating generated explanations',()=>{
 assert.equal(translate('Health Card','en'),'Health Card');
 assert.equal(translate('Health Card','hi'),'वित्तीय स्थिति कार्ड');
 assert.equal(translate('  Custom customer Pvt Ltd  ','hi'),'  Custom customer Pvt Ltd  ');
 assert.equal(translate('₹12,345.67','hi'),'₹12,345.67');
 assert.match(translate('One declared buyer accounts for 73% of supplied invoice sales.','hi'),/73%/);
 assert.doesNotMatch(translate('One declared buyer accounts for 73% of supplied invoice sales.','hi'),/declared/);
 assert.match(translate('Declared sales and classified bank receipts differ by more than 30% in 2026-10.','hi'),/2026-10/);
});
test('secure workspace static UI copy has Hindi translations',async()=>{
 const missing=new Set<string>();
 for(const filename of await readdir('src/components/finance')){
  if(!filename.endsWith('.tsx')||filename==='Language.tsx')continue;
  const source=ts.createSourceFile(filename,await readFile('src/components/finance/'+filename,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const walk=(node:ts.Node)=>{if(ts.isJsxText(node)){const value=node.text.replace(/\s+/g,' ').trim();if(/[A-Za-z]{2}/.test(value)&&translate(value,'hi')===value)missing.add(value);}ts.forEachChild(node,walk);};walk(source);
 }
 assert.deepEqual([...missing],[]);
});
