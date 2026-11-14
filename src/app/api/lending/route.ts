import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { lendingStore } from '@/lib/db/lending';
import { actor,endpoint,jsonBody,uuid } from '@/lib/security/http';
import { AppError } from '@/lib/security/errors';
import { rateLimit } from '@/lib/security/auth-service';
const store=lendingStore(db);export const runtime='nodejs';
export const GET=endpoint(async req=>{const user=await actor(),id=req.nextUrl.searchParams.get('businessId');if(id&&!uuid.safeParse(id).success)throw new AppError('VALIDATION_ERROR',400,'Invalid business ID.');if(req.nextUrl.searchParams.get('review')==='1')return NextResponse.json(id?await store.review(user,id,new Date().toISOString().slice(0,10)):{businesses:await store.pipeline(user)});if(!id)throw new AppError('VALIDATION_ERROR',400,'Business ID required.');return NextResponse.json(await store.owner(user,id));});
export const POST=endpoint(async req=>{
 const user=await actor();await rateLimit(db,`lending:${user.id}`,90,3600);const input=await jsonBody(req,z.discriminatedUnion('action',[
 z.object({action:z.literal('share'),businessId:uuid,email:z.email().max(254).transform(s=>s.toLowerCase())}),
 z.object({action:z.literal('revoke'),businessId:uuid,grantId:uuid}),
 z.object({action:z.literal('note'),businessId:uuid,disposition:z.enum(['NEEDS_INFORMATION','REVIEWED','ESCALATED']),note:z.string().trim().min(5).max(1000)}),
 z.object({action:z.literal('create'),businessId:uuid,profile:z.enum(['ILLUSTRATIVE_A','ILLUSTRATIVE_B','ILLUSTRATIVE_C']),principalPaise:z.number().int().min(10000).max(1e12),tenureMonths:z.number().int().min(1).max(360)}),
 z.object({action:z.literal('transition'),businessId:uuid,id:uuid,status:z.enum(['SIMULATED_SUBMISSION','CANCELLED']),acknowledged:z.literal(true)})
 ]),10000);
 if(input.action==='share')return NextResponse.json(await store.share(user,input.businessId,input.email));
 if(input.action==='revoke')return NextResponse.json(await store.revoke(user,input.businessId,input.grantId));
 if(input.action==='note')return NextResponse.json(await store.note(user,input.businessId,input.disposition,input.note));
 if(input.action==='create')return NextResponse.json(await store.create(user,input.businessId,input.profile,input.principalPaise,input.tenureMonths));
 return NextResponse.json(await store.transition(user,input.businessId,input.id,input.status));
});
