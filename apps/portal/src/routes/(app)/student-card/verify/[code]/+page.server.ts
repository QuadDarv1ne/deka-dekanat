import { redirect } from '@sveltejs/kit';
import { requireUser } from '#modules/auth/server/auth.service.server.ts';
import {
  verifyStudentCard,
  cardPresentation
} from '#modules/student-cards/server/student-card.service.server.ts';
import type { PageServerLoad } from './$types';
export const load = (async ({ locals, params, url }) => {
  if (!locals.user) redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
  return {
    presentation: await cardPresentation(
      await verifyStudentCard(requireUser(locals.user), params.code),
      url.origin
    ),
    verification: true
  };
}) satisfies PageServerLoad;
