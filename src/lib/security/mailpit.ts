import nodemailer from 'nodemailer';
import type { OtpDeliveryProvider } from './auth-service';
import { AppError } from './errors';

export function devInboxEnabled(env = process.env) {
  return env.NODE_ENV === 'development' && env.AUTH_DELIVERY === 'mailpit';
}
export function mailpitDelivery(): OtpDeliveryProvider {
  if (!devInboxEnabled()) throw new AppError('PROVIDER_UNAVAILABLE',503,'Sign-in transport is not configured. Local inbox is development-only.');
  // No configurable remote SMTP host: development codes must stay on this machine.
  const transport = nodemailer.createTransport({ host: '127.0.0.1', port: 1025, secure: false, ignoreTLS: true, connectionTimeout: 3000, socketTimeout: 5000 });
  return { async send(email, code) {
    await transport.sendMail({ from:'Finnese Development <no-reply@finnese.test>', to:email, subject:'Finnese development sign-in code', text:`Your development code is ${code}. It expires in 5 minutes and works once. This message stays in your local Mailpit inbox.` });
  } };
}
