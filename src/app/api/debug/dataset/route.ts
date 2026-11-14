import { NextResponse } from 'next/server';
import { demoEnabled } from '@/lib/demo';
export async function GET(){return NextResponse.json(demoEnabled()?{source:'SYNTHETIC_DEMO',message:'AgamiAI synthetic fixtures; diagnostic identifiers are not exposed.'}:{error:{code:'FORBIDDEN',message:'Development diagnostic unavailable.'}},{status:demoEnabled()?200:403});}
