import { NextResponse } from 'next/server';
import { z } from 'zod';
import { actor,endpoint,jsonBody,uuid } from '@/lib/security/http';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/security/auth-service';
import { addReviewInput,closeReviewInput } from '@/lib/db/review-inputs';
export const POST=endpoint(async req=>{const user=await actor();await rateLimit(db,`review-input:${user.id}`,90,3600);const body=await jsonBody(req,z.discriminatedUnion('action',[
 z.object({action:z.literal('add'),businessId:uuid,kind:z.enum(['FINANCING_CLAIM','REVERSAL','TECHNICAL_FAILURE','INSUFFICIENT_FUNDS']),evidenceId:uuid,amountPaise:z.number().int().positive().max(1e12).optional(),partyAlias:z.string().trim().min(2).max(120).optional(),reason:z.string().trim().min(5).max(1000)}),z.object({action:z.literal('close'),businessId:uuid,id:uuid})]),10000);return NextResponse.json(body.action==='close'?await closeReviewInput(db,user,body.businessId,body.id):await addReviewInput(db,user,body.businessId,body));});
