import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { businessStore } from '@/lib/db/businesses';
import { actor,endpoint,jsonBody,uuid } from '@/lib/security/http';
export const POST=endpoint(async req=>{
  const user=await actor();const {businessId,consentId}=await jsonBody(req,z.object({businessId:uuid,consentId:uuid}),2048);
  await businessStore(db).revoke(user,businessId,consentId);return NextResponse.json({ok:true});
});
