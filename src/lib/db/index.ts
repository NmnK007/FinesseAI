import { Pool } from 'pg';

export interface Sql {
  query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}
export interface Database extends Sql {
  transaction<T>(work: (sql: Sql) => Promise<T>): Promise<T>;
}

const globalDb = globalThis as unknown as { finnesePool?: Pool };
function pool() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_CONFIGURATION_REQUIRED');
  if (!globalDb.finnesePool) {
    const max=Number(process.env.DB_POOL_MAX||8);
    if(!Number.isInteger(max)||max<1||max>20)throw new Error('Invalid DB_POOL_MAX');
    globalDb.finnesePool=new Pool({ connectionString: process.env.DATABASE_URL, max, connectionTimeoutMillis: 5000, statement_timeout: 15000 });
    globalDb.finnesePool.on('error',()=>console.error(JSON.stringify({event:'database_idle_connection_failed'})));
  }
  return globalDb.finnesePool;
}
export const db: Database = {
  async query<T extends Record<string, unknown>>(sql: string, params?: unknown[]) {
    return pool().query<T>(sql, params);
  },
  async transaction<T>(work: (sql: Sql) => Promise<T>) {
    const client = await pool().connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  },
};
