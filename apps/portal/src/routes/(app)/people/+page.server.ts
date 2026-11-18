import { requireUser, requireRole } from '#modules/auth/server/auth.service.server.ts';
import type { PageServerLoad } from './$types';
import { accounts } from '#modules/administration/server/administration.repository.server.ts';
export const load = (async ({ locals }) => {
  requireRole(locals.user, 'admin');
  return { users: await accounts() };
}) satisfies PageServerLoad;
