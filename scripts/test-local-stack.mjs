// Finite integration-test harness. Not an application launcher or Docker replacement.
import { spawn,execFileSync } from 'node:child_process';
import { createConnection } from 'node:net';
import { randomBytes } from 'node:crypto';
import { mkdir,open } from 'node:fs/promises';
import { resolve } from 'node:path';
const children=[],handles=[];
const env={...process.env,NODE_ENV:'development',DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:5544/postgres',DB_POOL_MAX:'1',OTP_SECRET:randomBytes(32).toString('hex'),APP_ORIGIN:'http://localhost:3100',SMOKE_URL:'http://localhost:3100',AUTH_DELIVERY:'mailpit',ENABLE_DEMO:'true'};
async function listening(port){return new Promise(r=>{const s=createConnection({host:'127.0.0.1',port});s.on('connect',()=>{s.destroy();r(true);});s.on('error',()=>r(false));});}
async function launch(name,exe,args){const log=await open(`.test-artifacts/${name}.log`,'w');handles.push(log);const child=spawn(exe,args,{env,windowsHide:true,stdio:['ignore',log.fd,log.fd]});children.push(child);return child;}
async function run(args){await new Promise((yes,no)=>{const c=spawn(process.execPath,args,{env,windowsHide:true,stdio:'inherit'});children.push(c);c.on('error',no);c.on('exit',code=>code===0?yes():no(new Error(`Test command failed (${code})`)));});}
async function ready(port){for(let i=0;i<120;i++){if(await listening(port))return;await new Promise(r=>setTimeout(r,250));}throw new Error(`Test service ${port} did not start`);}
try{
 await mkdir('.test-artifacts',{recursive:true});for(const port of [5544,3100,1025,8025])if(await listening(port))throw new Error(`Port ${port} already in use; refusing to replace an existing service`);
 await launch('test-db',process.execPath,['node_modules/@electric-sql/pglite-socket/dist/scripts/server.js','--host=127.0.0.1','--port=5544',`--db=.test-artifacts/db-${Date.now()}`]);await ready(5544);
 await launch('test-mail',resolve('.local/mailpit/mailpit.exe'),['--smtp','127.0.0.1:1025','--listen','127.0.0.1:8025']);await ready(8025);
 await run(['node_modules/tsx/dist/cli.mjs','scripts/migrate.ts']);await run(['-e',"const {Pool}=require('pg');const {randomUUID}=require('crypto');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query(\"INSERT INTO users(id,email,role) VALUES ($1,'reviewer-browser@finnese.test','lender')\",[randomUUID()]).then(()=>p.end()).catch(()=>{process.exitCode=1;p.end();});"]);await launch('test-next',process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3100']);await ready(3100);
 if(!process.argv.includes('--intelligence-only'))await run(['scripts/smoke-phase1.mjs']);await run(['scripts/smoke-intelligence.mjs']);
}finally{
 for(const child of children.reverse())if(child.pid&&child.exitCode===null){try{if(process.platform==='win32')execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else child.kill('SIGTERM');}catch{}}
 for(const h of handles)await h.close();
}
