import { OtpLogin } from '@/components/finance/OtpLogin';
import { devInboxEnabled } from '@/lib/security/mailpit';
import { demoEnabled } from '@/lib/demo';
export const dynamic='force-dynamic';
export default function Login(){return <OtpLogin inbox={devInboxEnabled()} demo={demoEnabled()}/>;}
