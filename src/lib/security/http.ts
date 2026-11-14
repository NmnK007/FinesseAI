import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '../db';
import { findSession } from './auth-service';
import { AppError } from './errors';

export const SESSION_COOKIE='finnese_session';
export function sameOrigin(req: Request) {
  const expected=process.env.APP_ORIGIN || (process.env.NODE_ENV==='production' ? '' : 'http://localhost:3000');
  if(!expected || req.headers.get('origin')!==expected) throw new AppError('FORBIDDEN',403,'Request origin is not allowed.');
}
export async function actor() {
  const session=await findSession(db,(await cookies()).get(SESSION_COOKIE)?.value);
  if(!session) throw new AppError('AUTH_REQUIRED',401,'Sign in to continue.');
  return session;
}
export async function jsonBody<T>(req:Request,schema:z.ZodType<T>,limit=1_000_000):Promise<T> {
  if(!req.headers.get('content-type')?.startsWith('application/json')) throw new AppError('VALIDATION_ERROR',415,'Send application/json.');
  if(Number(req.headers.get('content-length')||0)>limit) throw new AppError('VALIDATION_ERROR',413,'Request is too large.');
  const reader=req.body?.getReader();
  if(!reader) throw new AppError('VALIDATION_ERROR',400,'Request body is required.');
  const chunks:Uint8Array[]=[];let size=0;
  while(true) { const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new AppError('VALIDATION_ERROR',413,'Request is too large.');}chunks.push(value); }
  try { return schema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
  catch { throw new AppError('VALIDATION_ERROR',400,'Request fields are invalid. Check the required values.'); }
}
export function endpoint(handler:(req:NextRequest)=>Promise<NextResponse|Response>) {
  return async(req:NextRequest)=>{
    try { if(!['GET','HEAD'].includes(req.method))sameOrigin(req);const res=await handler(req);res.headers.set('Cache-Control','no-store');return res; }
    catch(error) {
      const known=error instanceof AppError;
      // Never log financial payloads, OTPs, identities or database error text.
      if(!known) {
        const code=typeof error==='object'&&error!==null&&'code' in error?String(error.code):'';
        console.error(JSON.stringify({event:'request_failed',code:'INTERNAL_ERROR',causeCode:/^[A-Z0-9_]{1,30}$/.test(code)?code:undefined}));
      }
      return NextResponse.json({error:{code:known?error.code:'PROVIDER_UNAVAILABLE',message:known?error.message:'Service unavailable. Check local database configuration.'}},{status:known?error.status:503,headers:{'Cache-Control':'no-store'}});
    }
  };
}
export const uuid=z.string().uuid();
