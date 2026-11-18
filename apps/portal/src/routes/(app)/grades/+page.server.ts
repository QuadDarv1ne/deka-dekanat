import { requireRole } from '#modules/auth/server/auth.service.server.ts';
import { grades, groupRank } from '#modules/academics/server/academic.repository.server.ts';
import type { PageServerLoad } from './$types';
export const load = (async ({ locals }) => {
  const user = requireRole(locals.user, 'student', 'dean', 'teacher');
  const [results, rank] = await Promise.all([grades(user), groupRank(user)]);
  return { grades: results, rank };
}) satisfies PageServerLoad;
