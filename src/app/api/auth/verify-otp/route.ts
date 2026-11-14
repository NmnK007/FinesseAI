import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authService } from '@/lib/security/auth-service';
import { mailpitDelivery } from '@/lib/security/mailpit';
import { endpoint,jsonBody,SESSION_COOKIE } from '@/lib/security/http';
export const runtime='nodejs';
export const POST=endpoint(async req=>{
  const {email,code}=await jsonBody(req,z.object({email:z.email().max(254).transform(v=>v.toLowerCase()),code:z.string().regex(/^\d{6}$/)}),2048);
  const {token}=await authService(db,process.env.OTP_SECRET||'',mailpitDelivery()).verify(email,code);
  const res=NextResponse.json({ok:true});
  res.cookies.set(SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:8*3600});
  return res;
});
