import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { intelligenceStore } from '@/lib/db/intelligence';
import { actor,endpoint,jsonBody,uuid } from '@/lib/security/http';
import { rateLimit } from '@/lib/security/auth-service';
import { AppError } from '@/lib/security/errors';
import { evidenceKind } from '@/lib/ingestion/evidence-csv';
import { providerStatuses } from '@/lib/providers';
export const runtime='nodejs';
const store=intelligenceStore(db);
const today=()=>new Date().toISOString().slice(0,10);
export const GET=endpoint(async req=>{
 const user=await actor();const id=req.nextUrl.searchParams.get('businessId');if(!uuid.safeParse(id).success)throw new AppError('VALIDATION_ERROR',400,'Business ID required.');
 return NextResponse.json({...await store.read(user,id!,today()),providers:providerStatuses});
});
export const POST=endpoint(async req=>{
 const user=await actor();await rateLimit(db,`intelligence:${user.id}`,120,3600);
 const input=await jsonBody(req,z.discriminatedUnion('action',[
  z.object({action:z.literal('applicability'),businessId:uuid,kind:z.enum(['GST','UTILITY']),applicable:z.boolean(),reason:z.string().trim().min(5).max(1000)}),
  z.object({action:z.literal('correct'),businessId:uuid,recordId:uuid,expectedId:uuid,data:z.record(z.string(),z.unknown()),reason:z.string().trim().min(5).max(1000)}),
  z.object({action:z.literal('corrections'),businessId:uuid,recordId:uuid}),
  z.object({action:z.literal('preview'),businessId:uuid,kind:evidenceKind,csv:z.string().max(512000),filename:z.string().max(120).regex(/\.csv$/i),consent:z.literal(true)}),
  z.object({action:z.literal('commit'),businessId:uuid,id:uuid}),
  z.object({action:z.literal('assess'),businessId:uuid}),
  z.object({action:z.literal('review'),businessId:uuid,key:uuid,disposition:z.enum(['CONFIRMED','DISMISSED']),note:z.string().trim().min(5).max(1000)})
 ]));
 if(input.action==='applicability')return NextResponse.json(await store.applicability(user,input.businessId,input.kind,input.applicable,input.reason));
 if(input.action==='correct')return NextResponse.json(await store.correct(user,input.businessId,input.recordId,input.data,input.reason,input.expectedId));
 if(input.action==='corrections')return NextResponse.json(await store.corrections(user,input.businessId,input.recordId));
 if(input.action==='preview')return NextResponse.json(await store.preview(user,input.businessId,input.kind,input.csv,input.filename));
 if(input.action==='commit')return NextResponse.json(await store.commit(user,input.businessId,input.id));
 if(input.action==='review')return NextResponse.json(await store.review(user,input.businessId,input.key,input.disposition,input.note));
 return NextResponse.json(await store.snapshot(user,input.businessId,today()));
});
