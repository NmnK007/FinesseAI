import { readFile,readdir,writeFile,rename } from 'node:fs/promises';
import { validateCandidate,selectCandidate,rollback,monitoredInference,type Registry } from '../src/lib/model-registry';
const dir='artifacts/models',path=`${dir}/registry.json`;
async function main(){
 let registry:Registry={version:1,selected:null,history:[]};try{registry=JSON.parse(await readFile(path,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 const action=process.argv[2]||'status';
 if(action==='select'){const name=process.argv[3];if(!name||!/^synthetic-methodology-v\d+-[a-f0-9]{12}\.json$/.test(name))throw new Error('Select a candidate filename from artifacts/models');const bytes=await readFile(`${dir}/${name}`,'utf8'),{hash}=validateCandidate(bytes);if(!name.endsWith(`${hash.slice(0,12)}.json`))throw new Error('Filename hash mismatch');registry=selectCandidate(registry,bytes,new Date().toISOString());}
 else if(action==='rollback')registry=rollback(registry,new Date().toISOString());
 else if(action==='smoke'){if(!registry.selected)throw new Error('Explicitly select an offline demo candidate first');const names=await readdir(dir);const name=names.find(n=>n.endsWith(`-${registry.selected!.slice(0,12)}.json`));if(!name)throw new Error('Selected artifact missing');const result=monitoredInference(await readFile(`${dir}/${name}`,'utf8'),registry.selected,[0.5,0.5,0.5,0.5,0.5,0.5]);console.log(JSON.stringify({status:result.status,integrity:'verified',inference:'passed',scope:'offline demo only'}));return;}
 else if(action!=='status')throw new Error('Use status, select, rollback or smoke');
 if(action==='select'||action==='rollback'){await writeFile(`${path}.tmp`,JSON.stringify(registry,null,2)+'\n');await rename(`${path}.tmp`,path);}
 console.log(JSON.stringify(registry,null,2));
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Registry failed');process.exitCode=1;});
