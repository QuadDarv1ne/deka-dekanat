import { randomUUID } from 'node:crypto';
import { transaction } from '#server/database/postgres.ts';

export async function reserveStudyAdvice(userId: string) {
  return transaction(async (db) => {
    // Share the lock, concurrency ceiling and quota used by beginTurn.
    await db.query('SELECT pg_advisory_xact_lock(882705110)');
    await db.query('DELETE FROM assistant_leases WHERE expires_at<now()');
    const active = await db.query<{ same_user: boolean }>(
      'SELECT user_id=$1 AS same_user FROM assistant_leases',
      [userId]
    );
    if (active.rows.some((lease) => lease.same_user)) return { status: 'rate' } as const;
    if (active.rows.length >= 2) return { status: 'busy' } as const;

    const rate = await db.query<{ count: number }>(
      `INSERT INTO assistant_rate_limits(user_id,count,window_start) VALUES($1,1,now())
       ON CONFLICT(user_id) DO UPDATE SET
         count=CASE WHEN assistant_rate_limits.window_start<now()-interval '1 minute'
           THEN 1 ELSE assistant_rate_limits.count+1 END,
         window_start=CASE WHEN assistant_rate_limits.window_start<now()-interval '1 minute'
           THEN now() ELSE assistant_rate_limits.window_start END
       WHERE assistant_rate_limits.count<8 OR assistant_rate_limits.window_start<now()-interval '1 minute'
       RETURNING count`,
      [userId]
    );
    if (!rate.rowCount) return { status: 'rate' } as const;

    const token = randomUUID();
    await db.query(
      "INSERT INTO assistant_leases(user_id,token,expires_at) VALUES($1,$2,now()+interval '120 seconds')",
      [userId, token]
    );
    return { status: 'reserved', token } as const;
  });
}
