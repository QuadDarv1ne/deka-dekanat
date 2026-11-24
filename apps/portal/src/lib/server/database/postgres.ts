import pg, { type PoolClient, type QueryResultRow } from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  statement_timeout: 10000
});
pool.on('error', (error) => console.error('Idle database connection failed', error.message));
// Return serializable dates and avoid implicit timezone conversions in page data.
pg.types.setTypeParser(1184, (value) => new Date(value).toISOString());

const unavailableCodes = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  '57P01',
  '57P03',
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '53300'
]);
export function isDatabaseUnavailable(cause: unknown) {
  if (!cause || typeof cause !== 'object') return false;
  const error = cause as { code?: string; message?: string };
  if (error.code && unavailableCodes.has(error.code)) return true;
  return /timeout exceeded when trying to connect|Connection terminated|the database system is (?:starting up|shutting down)/i.test(
    error.message ?? ''
  );
}
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
) {
  return pool.query<T>(sql, params);
}
export async function transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollback) {
      console.error(
        '[database] rollback failed',
        rollback instanceof Error
          ? rollback.message.replace(/postgres(?:ql)?:\/\/\S+/gi, 'postgres://…')
          : 'unknown'
      );
    }
    throw error;
  } finally {
    client.release();
  }
}
