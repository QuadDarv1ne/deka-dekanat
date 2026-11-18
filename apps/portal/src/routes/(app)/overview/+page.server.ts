import { requireUser } from '#modules/auth/server/auth.service.server.ts';
import type { PageServerLoad } from './$types';
import { getOverview } from '#modules/overview/server/overview.service.server.ts';
import { studentHome } from '#modules/overview/server/student-home.service.server.ts';

export const load = (async ({ locals }) => {
  const user = requireUser(locals.user);
  const [overview, home] = await Promise.all([
    getOverview(user),
    user.role === 'student' ? studentHome(user) : null
  ]);
  return { ...overview, studentHome: home };
}) satisfies PageServerLoad;
