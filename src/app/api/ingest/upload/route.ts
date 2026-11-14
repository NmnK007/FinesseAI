import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { businessStore } from '@/lib/db/businesses';
import { actor,endpoint,jsonBody,uuid } from '@/lib/security/http';
import { rateLimit } from '@/lib/security/auth-service';
const column=z.string().max(100);
export const runtime='nodejs';
export const POST=endpoint(async req=>{
  const user=await actor();
  await rateLimit(db,`upload:${user.id}`,30,3600);
  const input=await jsonBody(req,z.object({businessId:uuid,accountAlias:z.string().trim().min(1).max(60),filename:z.string().min(1).max(120).regex(/\.csv$/i),csv:z.string().min(1).max(512000),consent:z.literal(true),mapping:z.object({date:column,description:column,amount:column.optional(),debit:column.optional(),credit:column.optional(),balance:column.optional(),reference:column.optional()}).optional()}));
  return NextResponse.json(await businessStore(db).preview(user,input),{status:201});
});
