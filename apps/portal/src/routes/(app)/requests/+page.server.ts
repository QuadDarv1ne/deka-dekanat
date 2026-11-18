import { requireRole } from '#modules/auth/server/auth.service.server.ts';
import { listRequests } from '#modules/requests/server/request.repository.server.ts';

import type { PageServerLoad } from './$types';
export const load = (async ({ locals }) => ({
  requests: await listRequests(requireRole(locals.user, 'student', 'dean'))
})) satisfies PageServerLoad;
