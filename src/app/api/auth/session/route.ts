import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { findSession, tokenHash } from '@/lib/security/auth-service';
import { endpoint,SESSION_COOKIE } from '@/lib/security/http';
export const runtime='nodejs';
export const GET=endpoint(async()=>{
  const session=await findSession(db,(await cookies()).get(SESSION_COOKIE)?.value);
  return NextResponse.json({session:session?{id:session.id,role:session.role,displayName:session.email,loginAt:''}:null});
});
export const DELETE=endpoint(async()=>{
  const token=(await cookies()).get(SESSION_COOKIE)?.value;
  if(token) await db.query('DELETE FROM sessions WHERE token_hash=$1',[tokenHash(token)]);
  const res=NextResponse.json({ok:true});
  res.cookies.set(SESSION_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});
  res.cookies.set('udyamai_session','',{path:'/',maxAge:0});
  return res;
});
