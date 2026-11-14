import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { businessStore } from '@/lib/db/businesses';
import { actor, endpoint,jsonBody,uuid } from '@/lib/security/http';
import { validateGstin } from '@/lib/gstin';
import { AppError } from '@/lib/security/errors';
export const runtime='nodejs';
const store=businessStore(db);
export const GET=endpoint(async req=>{
  const user=await actor();const id=req.nextUrl.searchParams.get('id');
  if(id&&!uuid.safeParse(id).success)throw new AppError('VALIDATION_ERROR',400,'Invalid business ID.');
  return NextResponse.json(id?await store.detail(user,id):{businesses:await store.list(user)});
});
export const POST=endpoint(async req=>{
  const user=await actor();
  const body=await jsonBody(req,z.object({name:z.string().trim().min(2).max(120),gstin:z.string().trim().max(15).optional()}),2048);
  if(body.gstin&&!validateGstin(body.gstin).ok)throw new AppError('VALIDATION_ERROR',400,'GSTIN format/checksum is invalid. You can leave GSTIN blank.');
  return NextResponse.json({business:await store.create(user,body.name,body.gstin?.toUpperCase())},{status:201});
});
export const DELETE=endpoint(async req=>{
  const user=await actor();const {id}=await jsonBody(req,z.object({id:uuid}),2048);
  await store.remove(user,id);return NextResponse.json({ok:true});
});
