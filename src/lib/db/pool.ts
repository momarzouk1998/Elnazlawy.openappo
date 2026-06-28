import { Pool } from 'pg';

const globalPool = globalThis as any;
let pool: Pool;

if (process.env.NODE_ENV === 'production') {
  // Production: optimized for low-RAM server (2GB droplet)
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,                          // Fewer connections on shared 2GB server
    idleTimeoutMillis: 30000,         // Close idle connections after 30s
    connectionTimeoutMillis: 10000,   // 10s timeout for new connections
  });
} else {
  // Development: singleton to avoid exhausting connections during hot-reload
  if (!globalPool.__dbPool) {
    globalPool.__dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  pool = globalPool.__dbPool;
}

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}

export async function transaction<T>(fn: (client: any) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export default pool;
