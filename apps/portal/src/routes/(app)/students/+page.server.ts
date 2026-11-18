import { requireRole } from '#modules/auth/server/auth.service.server.ts';
import { studentDirectory } from '#modules/administration/server/student-directory.server.ts';
import type { PageServerLoad } from './$types';
export const load = (async ({ locals, url }) => {
  const search = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
  return {
    search,
    students: await studentDirectory(requireRole(locals.user, 'dean', 'teacher'), search)
  };
}) satisfies PageServerLoad;
