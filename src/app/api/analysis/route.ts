import { externalHighlights } from '@/lib/copilot-provider';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { analysisStore } from '@/lib/db/analysis';
import { actor,endpoint,jsonBody,uuid } from '@/lib/security/http';
import { rateLimit } from '@/lib/security/auth-service';
import { scenarioInput } from '@/lib/finance/scenario';
import { AppError } from '@/lib/security/errors';
export const runtime='nodejs';const store=analysisStore(db),today=()=>new Date().toISOString().slice(0,10);
export const GET=endpoint(async req=>{const user=await actor(),id=req.nextUrl.searchParams.get('businessId');if(!uuid.safeParse(id).success)throw new AppError('VALIDATION_ERROR',400,'Business ID required.');return NextResponse.json(await store.read(user,id!,today()));});
export const POST=endpoint(async req=>{
 const user=await actor();await rateLimit(db,`analysis:${user.id}`,90,3600);
 const input=await jsonBody(req,z.discriminatedUnion('action',[
 z.object({action:z.literal('scenario'),businessId:uuid,input:scenarioInput}),
 z.object({action:z.literal('review'),businessId:uuid,key:z.string().min(1).max(50000),status:z.enum(['UNDER_REVIEW','FALSE_POSITIVE','ESCALATED','RESOLVED']),note:z.string().trim().min(5).max(1000)}),
 z.object({action:z.literal('chat'),businessId:uuid,question:z.string().trim().min(2).max(1000),locale:z.enum(['en','hi']).default('en'),externalConsent:z.boolean().default(false)})
 ]),100000);
 if(input.action==='scenario')return NextResponse.json(await store.scenario(user,input.businessId,input.input));
 if(input.action==='review')return NextResponse.json(await store.review(user,input.businessId,input.key,input.status,input.note,today()));
 const result=await store.chat(user,input.businessId,input.question,today(),input.locale);
 const localOnly=result.tool==='policy'||result.tool==='getLoanReadiness';
 const external=localOnly?{status:'NOT_REQUESTED',answer:null,highlights:[],citations:[]}:await externalHighlights(result.answer,result.citations,input.question,input.externalConsent,process.env,fetch,input.locale);
 return NextResponse.json({...result,external});
});
