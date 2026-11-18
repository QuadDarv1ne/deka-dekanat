import { requireRole } from '#modules/auth/server/auth.service.server.ts';
import { studentProgress } from '#modules/academics/server/student-progress.service.server.ts';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => ({
  courses: await studentProgress(requireRole(locals.user, 'student'))
})) satisfies PageServerLoad;
