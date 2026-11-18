import { requireRole } from '#modules/auth/server/auth.service.server.ts';
import {
  studentCard,
  cardPresentation
} from '#modules/student-cards/server/student-card.service.server.ts';
import type { PageServerLoad } from './$types';
export const load = (async ({ locals, url }) => ({
  presentation: await cardPresentation(
    await studentCard(requireRole(locals.user, 'student')),
    url.origin
  )
})) satisfies PageServerLoad;
