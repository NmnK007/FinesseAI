import { actor,endpoint } from '@/lib/security/http';
import { AppError } from '@/lib/security/errors';
const unavailable=endpoint(async()=>{await actor();throw new AppError('PROVIDER_UNAVAILABLE',503,'Lending sandbox persistence and sharing authorization are not configured. No application was submitted.');});
export const GET=unavailable;export const POST=unavailable;
