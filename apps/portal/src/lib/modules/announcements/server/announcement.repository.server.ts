import { query } from '#server/database/postgres.ts';
import type { User } from '#modules/auth/auth.types.ts';
import type { Announcement } from '../announcement.types';
export async function announcements(user: User) {
  return (
    await query<Announcement>(
      'SELECT id,title,body,tag,created_at FROM announcements WHERE faculty_id=$1 ORDER BY created_at DESC LIMIT 20',
      [user.faculty_id]
    )
  ).rows;
}
