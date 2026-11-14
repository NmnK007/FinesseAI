import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exportBusiness } from '@/lib/db/export';
import { actor,endpoint,uuid } from '@/lib/security/http';
import { AppError } from '@/lib/security/errors';
export const GET=endpoint(async req=>{const user=await actor(),id=req.nextUrl.searchParams.get('businessId');if(!uuid.safeParse(id).success)throw new AppError('VALIDATION_ERROR',400,'Business ID required.');return NextResponse.json(await exportBusiness(db,user,id!),{headers:{'Content-Disposition':'attachment; filename="finnese-evidence.json"','Cache-Control':'no-store'}});});
