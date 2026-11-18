import { error } from '@sveltejs/kit';
import { query } from '#server/database/postgres.ts';
import { isUuid } from '#shared/validation.ts';
import type { StudyRequest, RequestStatus, DocumentVerification } from '../request.types';
import type { User } from '#modules/auth/auth.types.ts';
const select = `SELECT r.*,u.full_name student_name,g.name group_name FROM requests r JOIN users u ON u.id=r.student_id JOIN study_groups g ON g.id=u.group_id`;
function scope(user: User) {
  if (user.role === 'student') return { sql: 'r.student_id=$1', value: user.id };
  if (user.role === 'dean') return { sql: 'r.faculty_id=$1', value: user.faculty_id };
  error(403, 'Заявления доступны студентам и сотрудникам деканата.');
}
export async function listRequests(user: User) {
  const access = scope(user);
  return (
    await query<StudyRequest>(
      `${select} WHERE ${access.sql} ORDER BY r.created_at DESC LIMIT 200`,
      [access.value]
    )
  ).rows;
}
export async function getRequest(user: User, id: string) {
  if (!isUuid(id)) error(404, 'Заявление не найдено.');
  const access = scope(user);
  const result = await query<StudyRequest>(`${select} WHERE ${access.sql} AND r.id=$2`, [
    access.value,
    id
  ]);
  if (!result.rowCount) error(404, 'Заявление не найдено.');
  return result.rows[0];
}
export async function requestEvents(requestId: string) {
  return (
    await query<{
      id: string;
      status: RequestStatus;
      note: string;
      created_at: string;
      actor: string;
    }>(
      `SELECT e.id,e.status,e.note,e.created_at,u.full_name actor FROM request_events e JOIN users u ON u.id=e.actor_id WHERE request_id=$1 ORDER BY e.created_at,e.id`,
      [requestId]
    )
  ).rows;
}

export async function requestStats(user: User) {
  const access = scope(user);
  return (
    await query<{ active: string; new: string }>(
      `SELECT count(*) FILTER (WHERE status IN ('new','in_progress','ready')) active,count(*) FILTER (WHERE status='new') new FROM requests r WHERE ${access.sql}`,
      [access.value]
    )
  ).rows[0];
}

export async function verifyDocument(code: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(code)) error(404, 'Документ не найден.');
  const result = await query<DocumentVerification>(
    `SELECT number,kind,updated_at FROM requests WHERE verification_code=$1 AND status IN ('ready','done') AND kind IN ('study','scholarship','tax')`,
    [code]
  );
  if (!result.rowCount) error(404, 'Документ не найден или недействителен.');
  return result.rows[0];
}
