import { NextResponse } from 'next/server';
export async function GET(){return NextResponse.json({status:'DEMO_ONLY',defaultProbability:null,message:'No validated credit-risk model. Request-triggered training is disabled.'});}
export async function POST(){return NextResponse.json({error:{code:'MODEL_NOT_VALIDATED',message:'Training is offline only. No production model is available.'}},{status:409});}
