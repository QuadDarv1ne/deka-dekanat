import { randomUUID } from 'node:crypto';
import { error } from '@sveltejs/kit';
import { transaction } from '#server/database/postgres.ts';
import type { User } from '#modules/auth/auth.types.ts';
import { isUuid } from '#shared/validation.ts';
export async function publishAnnouncement(user: User, form: FormData) {
  if (user.role !== 'dean' || !user.faculty_id) error(403, 'Объявления публикует деканат.');
  const title = String(form.get('title') ?? '').trim(),
    body = String(form.get('body') ?? '').trim(),
    tag = String(form.get('tag') ?? 'Учёба').trim(),
    id = String(form.get('id') ?? '');
  if (
    !isUuid(id) ||
    title.length < 3 ||
    title.length > 160 ||
    body.length < 3 ||
    body.length > 3000 ||
    !['Учёба', 'События', 'Важно'].includes(tag)
  )
    error(400, 'Проверьте заголовок, текст и категорию объявления.');
  await transaction(async (db) => {
    const created = await db.query(
      'INSERT INTO announcements(id,faculty_id,title,body,tag) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING RETURNING id',
      [id, user.faculty_id, title, body, tag]
    );
    if (!created.rowCount) return;
    await db.query(
      `INSERT INTO notifications(id,user_id,title,body,href) SELECT gen_random_uuid(),id,$2,$3,$4 FROM users WHERE faculty_id=$1 AND active AND role IN ('student','teacher')`,
      [user.faculty_id, title, body.slice(0, 200), `/announcements#${id}`]
    );
    await db.query(
      "INSERT INTO audit_log(actor_id,action,entity_id) VALUES($1,'announcement.publish',$2)",
      [user.id, id]
    );
  });
}
export async function removeAnnouncement(user: User, id: string) {
  if (user.role !== 'dean' || !isUuid(id)) error(403, 'Удаление недоступно.');
  await transaction(async (db) => {
    const result = await db.query(
      'DELETE FROM announcements WHERE id=$1 AND faculty_id=$2 RETURNING id',
      [id, user.faculty_id]
    );
    if (!result.rowCount) error(404, 'Объявление не найдено.');
    await db.query('DELETE FROM notifications WHERE href=$1', [`/announcements#${id}`]);
    await db.query(
      "INSERT INTO audit_log(actor_id,action,entity_id) VALUES($1,'announcement.remove',$2)",
      [user.id, id]
    );
  });
}
