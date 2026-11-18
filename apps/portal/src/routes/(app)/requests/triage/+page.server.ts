import { requireRole } from '#modules/auth/server/auth.service.server.ts';
import { requestTriage } from '#modules/requests/server/request-triage.repository.server.ts';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => ({
  queue: await requestTriage(requireRole(locals.user, 'dean'))
})) satisfies PageServerLoad;
