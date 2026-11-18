import { requireUser, requireRole } from '#modules/auth/server/auth.service.server.ts';
import type { PageServerLoad } from './$types';
import { auditEvents } from '#modules/administration/server/administration.repository.server.ts';
export const load = (async ({ locals }) => {
  requireRole(locals.user, 'admin');
  return { events: await auditEvents() };
}) satisfies PageServerLoad;
