import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { actor,endpoint,uuid } from '@/lib/security/http';
import { intelligenceStore } from '@/lib/db/intelligence';
import { AppError } from '@/lib/security/errors';
export const GET=endpoint(async req=>{
 const user=await actor(),businessId=req.nextUrl.searchParams.get('businessId'),id=req.nextUrl.searchParams.get('id');
 if(!uuid.safeParse(businessId).success||!uuid.safeParse(id).success)throw new AppError('VALIDATION_ERROR',400,'Business and job IDs required.');
 const job=await intelligenceStore(db).job(user,businessId!,id!);
 if(req.nextUrl.searchParams.get('events')==='1')return new Response(`event: status\ndata: ${JSON.stringify({id:job.id,status:job.status})}\n\n`,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-store'}});
 return NextResponse.json(job);
});
