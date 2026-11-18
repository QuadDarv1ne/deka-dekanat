import { requireRole } from '#modules/auth/server/auth.service.server.ts';
import { lessons } from '#modules/academics/server/academic.repository.server.ts';
import type { PageServerLoad } from './$types';
export const load = (async ({ locals }) => ({
  lessons: await lessons(requireRole(locals.user, 'student', 'dean', 'teacher')),
  today: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(new Date())
})) satisfies PageServerLoad;
