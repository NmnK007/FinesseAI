import { NextResponse } from 'next/server';
import { actor,endpoint,uuid } from '@/lib/security/http';
import { AppError } from '@/lib/security/errors';
import { db } from '@/lib/db';
import { businessStore } from '@/lib/db/businesses';
export const GET=endpoint(async req=>{const user=await actor();const id=req.nextUrl.searchParams.get('businessId');if(!id)throw new AppError('DATA_NOT_AVAILABLE',404,'GSTIN lookup does not retrieve financial records. Create a business and upload authorized evidence.');if(!uuid.safeParse(id).success)throw new AppError('VALIDATION_ERROR',400,'Invalid business ID.');return NextResponse.json(await businessStore(db).detail(user,id));});
