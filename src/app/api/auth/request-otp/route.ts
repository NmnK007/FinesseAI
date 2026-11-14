import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authService } from '@/lib/security/auth-service';
import { mailpitDelivery } from '@/lib/security/mailpit';
import { endpoint,jsonBody } from '@/lib/security/http';
export const runtime='nodejs';
export const POST=endpoint(async req=>{
  const {email}=await jsonBody(req,z.object({email:z.email().max(254).transform(v=>v.toLowerCase())}),2048);
  await authService(db,process.env.OTP_SECRET||'',mailpitDelivery()).request(email);
  return NextResponse.json({ok:true,delivery:'DEVELOPMENT_INBOX',expiresInSeconds:300});
});
