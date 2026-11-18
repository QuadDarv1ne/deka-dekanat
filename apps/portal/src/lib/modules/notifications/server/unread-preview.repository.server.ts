import { query } from '#server/database/postgres.ts';
import type { Notification } from '../notification.types.ts';

export async function unreadPreview(userId: string) {
  return (
    await query<Pick<Notification, 'id' | 'title' | 'created_at'>>(
      `SELECT id,title,created_at FROM notifications
       WHERE user_id=$1 AND read_at IS NULL ORDER BY created_at DESC,id LIMIT 3`,
      [userId]
    )
  ).rows;
}
