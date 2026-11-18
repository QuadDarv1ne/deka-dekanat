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
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
