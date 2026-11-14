import { loadEnvConfig } from '@next/env';
import { Pool } from 'pg';
import { retention } from '../src/lib/db/retention';
async function main(){loadEnvConfig(process.cwd());if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required');const pool=new Pool({connectionString:process.env.DATABASE_URL});try{console.log(JSON.stringify(await retention({query:(s,p)=>pool.query(s,p),transaction:async fn=>{const c=await pool.connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}},process.argv.includes('--apply'))));}finally{await pool.end();}}
main().catch(()=>{console.error('Retention task failed; transaction rolled back.');process.exitCode=1;});
