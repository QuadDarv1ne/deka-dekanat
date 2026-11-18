import { query } from '#server/database/postgres.ts';
import type { Notification } from '../notification.types';
export async function notifications(userId: string) {
  return (
    await query<Notification>(
      'SELECT id,title,body,href,read_at,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',
      [userId]
    )
  ).rows;
}
export async function unreadCount(userId: string) {
  return Number(
    (
      await query<{ count: string }>(
        'SELECT count(*) count FROM notifications WHERE user_id=$1 AND read_at IS NULL',
        [userId]
      )
    ).rows[0].count
  );
}
export async function markAllRead(userId: string) {
  await query('UPDATE notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL', [
    userId
  ]);
}
export async function readNotification(userId: string, id: string) {
  const result = await query<{ href: string }>(
    'UPDATE notifications SET read_at=COALESCE(read_at,now()) WHERE id=$1 AND user_id=$2 RETURNING href',
    [id, userId]
  );
  return result.rows[0]?.href ?? null;
}
