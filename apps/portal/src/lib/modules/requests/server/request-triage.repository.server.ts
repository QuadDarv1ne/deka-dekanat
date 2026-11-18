import type { User } from '#modules/auth/auth.types.ts';
import { query } from '#server/database/postgres.ts';
import { WAITING_DAYS, type RequestTriage } from '../request-triage.types.ts';

export async function requestTriage(user: User) {
  const result = await query<RequestTriage>(
    `WITH active AS (
       SELECT r.id,r.number::text,r.kind,r.status,r.created_at,r.student_id,
         greatest(0,floor(extract(epoch FROM (now()-r.created_at))/86400))::integer age_days
       FROM requests r WHERE r.faculty_id=$1 AND r.status IN ('new','in_progress','ready')
     ), oldest AS (
       SELECT a.id,a.number,a.kind,a.status,a.age_days,u.full_name student_name,g.name group_name,a.created_at
       FROM active a JOIN users u ON u.id=a.student_id JOIN study_groups g ON g.id=u.group_id
       WHERE a.status IN ('new','in_progress')
       ORDER BY a.created_at,a.id LIMIT 30
     )
     SELECT
       count(*) FILTER (WHERE status='new')::int new_count,
       count(*) FILTER (WHERE status='in_progress')::int in_progress_count,
       count(*) FILTER (WHERE status='ready')::int ready_count,
       count(*) FILTER (WHERE status IN ('new','in_progress') AND age_days>=$2)::int waiting_count,
       coalesce((SELECT jsonb_agg(to_jsonb(o)-'created_at' ORDER BY o.created_at,o.id)
         FROM oldest o),'[]'::jsonb) items
     FROM active`,
    [user.faculty_id, WAITING_DAYS]
  );
  return result.rows[0];
}
