import { requireUser, requireRole } from '#modules/auth/server/auth.service.server.ts';
import type { PageServerLoad } from './$types';
import { announcements } from '#modules/announcements/server/announcement.repository.server.ts';
import {
  publishAnnouncement,
  removeAnnouncement
} from '#modules/announcements/server/announcement.service.server.ts';
import { fail, isHttpError, redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import type { Actions } from './$types';
export const load = (async ({ locals }) => ({
  announcements: await announcements(requireUser(locals.user)),
  publicationId: randomUUID()
})) satisfies PageServerLoad;
export const actions = {
  publish: async ({ locals, request }) => {
    try {
      await publishAnnouncement(requireRole(locals.user, 'dean'), await request.formData());
    } catch (cause) {
      if (isHttpError(cause)) return fail(cause.status, { message: cause.body.message });
      throw cause;
    }
    redirect(303, '/announcements');
  },
  remove: async ({ locals, request }) => {
    await removeAnnouncement(
      requireRole(locals.user, 'dean'),
      String((await request.formData()).get('id') ?? '')
    );
    redirect(303, '/announcements');
  }
} satisfies Actions;
