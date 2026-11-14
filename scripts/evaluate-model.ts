import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { trainCandidate,predict } from '../src/lib/ml-evaluation';
async function main(){
 const model=trainCandidate(),bytes=JSON.stringify(model,null,2)+'\n',hash=createHash('sha256').update(bytes).digest('hex');
 await mkdir('artifacts/models',{recursive:true});const path=`artifacts/models/${model.version}-${hash.slice(0,12)}.json`;
 // Content-addressed artifacts retain older versions; this does not publish to app inference.
 await writeFile(path,bytes);const loaded=JSON.parse(await readFile(path,'utf8'));
 if(loaded.featureVersion!=='synthetic-six-unit-v1')throw new Error('Schema mismatch');
 const output=predict(loaded.weights,[0.5,0.5,0.5,0.5,0.5,0.5]);if(!Number.isFinite(output))throw new Error('Inference smoke failed');
 console.log(JSON.stringify({status:model.status,artifact:path,sha256:hash,syntheticTest:model.test,baselineBrier:model.baseline.brier,inferenceSmoke:'passed'},null,2));
}
main().catch(()=>{console.error('Offline model evaluation failed');process.exitCode=1;});
