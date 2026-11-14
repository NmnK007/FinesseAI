import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { businessStore } from '@/lib/db/businesses';
import { actor,endpoint,jsonBody,uuid } from '@/lib/security/http';
import { AppError } from '@/lib/security/errors';
import { CATEGORIES } from '@/lib/ingestion/bank-csv';
export const runtime='nodejs';
export const GET=endpoint(async req=>{
  const user=await actor();const id=req.nextUrl.searchParams.get('id');
  if(!uuid.safeParse(id).success)throw new AppError('VALIDATION_ERROR',400,'Invalid import ID.');
  const job=await businessStore(db).job(user,id!);
  if(req.nextUrl.searchParams.get('events')==='1') {
    // Bounded jobs replay persisted milestones; clients reconnect after confirmation.
    const milestones=[{stage:'VALIDATED',at:job.created_at},...(job.status==='COMPLETED'?[{stage:'COMPLETED',at:job.completed_at}]:[])];
    return new Response(milestones.map((event,i)=>`id: ${i}\nevent: progress\ndata: ${JSON.stringify(event)}\n\n`).join(''),{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-store','X-Accel-Buffering':'no'}});
  }
  return NextResponse.json(job);
});
export const POST=endpoint(async req=>{
  const user=await actor();const body=await jsonBody(req,z.object({id:uuid,corrections:z.record(z.string().regex(/^\d+$/),z.enum(CATEGORIES)).optional()}),100_000);
  return NextResponse.json(await businessStore(db).commit(user,body.id,body.corrections));
});
