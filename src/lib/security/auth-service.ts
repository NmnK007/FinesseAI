import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Database, Sql } from '../db';
import { AppError } from './errors';

export type Actor = { id: string; email: string; role: 'customer' | 'lender' | 'admin' };
export interface OtpDeliveryProvider { send(email: string, code: string): Promise<void> }
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const invalidCode = () => new AppError('AUTH_REQUIRED', 401, 'Code is invalid, expired or already used.');

export async function rateLimit(sql: Sql, key: string, limit: number, seconds: number) {
  const { rows } = await sql.query<{ count: number }>(`INSERT INTO rate_limits(key,count,resets_at)
    VALUES ($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET
    count=CASE WHEN rate_limits.resets_at <= now() THEN 1 ELSE rate_limits.count+1 END,
    resets_at=CASE WHEN rate_limits.resets_at <= now() THEN now()+$2*interval '1 second' ELSE rate_limits.resets_at END
    RETURNING count`, [key, seconds]);
  if (rows[0].count > limit) throw new AppError('RATE_LIMITED', 429, 'Too many attempts. Please try later.');
}

export function authService(database: Database, secret: string, delivery: OtpDeliveryProvider) {
  if (secret.length < 32) throw new Error('OTP_SECRET must contain at least 32 characters.');
  const verifier = (id: string, email: string, code: string) => createHmac('sha256', secret).update(`${id}:${email}:${code}`).digest('hex');
  return {
    async request(email: string) {
      await rateLimit(database, 'otp:global', 60, 900);
      await rateLimit(database, `otp:${tokenHash(email)}`, 5, 900);
      const id = randomUUID();
      const code = randomInt(0, 1000000).toString().padStart(6, '0');
      await database.query(`INSERT INTO otp_challenges(email,id,verifier,expires_at) VALUES ($1,$2,$3,now()+interval '5 minutes')
        ON CONFLICT(email) DO UPDATE SET id=$2,verifier=$3,expires_at=now()+interval '5 minutes',attempts=0,consumed_at=NULL,created_at=now()`, [email,id,verifier(id,email,code)]);
      try { await delivery.send(email,code); }
      catch {
        await database.query('UPDATE otp_challenges SET consumed_at=now() WHERE email=$1 AND id=$2', [email,id]);
        throw new AppError('PROVIDER_UNAVAILABLE',503,'Development inbox is unavailable. Start Mailpit and request a new code.');
      }
    },
    async verify(email: string, code: string) {
      await rateLimit(database, 'verify:global', 300, 900);
      await rateLimit(database, `verify:${tokenHash(email)}`, 20, 900);
      // Return invalid attempts from the transaction so their increments COMMIT.
      const result = await database.transaction(async sql => {
        const { rows } = await sql.query<{ id: string; verifier: string; attempts: number; active: boolean }>(`SELECT id,verifier,attempts,(expires_at>now() AND consumed_at IS NULL) AS active FROM otp_challenges WHERE email=$1 FOR UPDATE`, [email]);
        const challenge = rows[0];
        if (!challenge || !challenge.active || challenge.attempts >= 5) return null;
        await sql.query('UPDATE otp_challenges SET attempts=attempts+1 WHERE email=$1', [email]);
        if (!timingSafeEqual(Buffer.from(challenge.verifier,'hex'), Buffer.from(verifier(challenge.id,email,code),'hex'))) return null;
        await sql.query('UPDATE otp_challenges SET consumed_at=now() WHERE email=$1', [email]);
        const user = await sql.query<Actor>(`INSERT INTO users(id,email) VALUES ($1,$2) ON CONFLICT(email) DO UPDATE SET email=EXCLUDED.email RETURNING id,email,role`, [randomUUID(),email]);
        const token = randomBytes(32).toString('base64url');
        await sql.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '8 hours')", [tokenHash(token),user.rows[0].id]);
        await sql.query("INSERT INTO audit_events(id,actor_id,action) VALUES ($1,$2,'LOGIN')", [randomUUID(),user.rows[0].id]);
        return { token, actor: user.rows[0] };
      });
      if (!result) throw invalidCode();
      return result;
    },
  };
}

export async function findSession(database: Sql, token?: string): Promise<Actor | null> {
  if (!token || !/^[\w-]{43}$/.test(token)) return null;
  const { rows } = await database.query<Actor>(`SELECT u.id,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`, [tokenHash(token)]);
  return rows[0] ?? null;
}
