import { NextResponse } from 'next/server';
export { DELETE } from '../session/route';
export async function POST(){return NextResponse.json({error:{code:'AUTH_REQUIRED',message:'Use request-otp and verify-otp. Fixed credentials have been removed.'}},{status:410});}
