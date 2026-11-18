import type { User } from '#modules/auth/auth.types.ts';
import { query } from '#server/database/postgres.ts';
import type { StudyRequest } from '../request.types.ts';

export async function readyStudentRequests(user: User) {
  const result = await query<
    Pick<StudyRequest, 'id' | 'number' | 'kind' | 'status' | 'updated_at'> & { total: number }
  >(
    `SELECT id,number,kind,status,updated_at,count(*) OVER ()::int total FROM requests
     WHERE student_id=$1 AND status='ready' AND kind IN ('study','scholarship','tax') ORDER BY updated_at DESC,id LIMIT 3`,
    [user.id]
  );
  return { count: result.rows[0]?.total ?? 0, items: result.rows };
}
