import { NextResponse } from 'next/server';
import { z } from 'zod';
import { actor,endpoint,jsonBody,uuid } from '@/lib/security/http';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/security/auth-service';
import { intelligenceStore } from '@/lib/db/intelligence';
import { matchingOptions,reconcile } from '@/lib/finance/reconciliation';
export const POST=endpoint(async req=>{const user=await actor();await rateLimit(db,`matching:${user.id}`,60,3600);const input=await jsonBody(req,z.object({businessId:uuid,options:matchingOptions}),5000),asOf=new Date().toISOString().slice(0,10);const facts=await intelligenceStore(db).read(user,input.businessId,asOf);return NextResponse.json(reconcile(facts.cash,facts.evidence,asOf,input.options));});
