import { writeFile } from 'node:fs/promises';
import { trainDemoModel,type LenderKey } from '../src/lib/mlModel';
async function main(){
  const lenders:LenderKey[]=['Illustrative lender A','Illustrative lender B','Illustrative lender C'];
  const models=lenders.map(lender=>trainDemoModel(lender));
  await writeFile('src/data/demo/models.json',JSON.stringify({status:'DEMO_ONLY',featureVersion:'legacy-six-v1',target:'Seeded synthetic approval heuristic; no real outcomes',seed:'lender.length * 7919 + 1',split:'2400 generated train rows; 600 separately generated holdout rows per profile; fixed scaling',models},null,2)+'\n');
  console.log('Wrote three deterministic synthetic model artifacts. No real credit-risk validation.');
}
main().catch(()=>{console.error('Demo training failed.');process.exitCode=1;});
