import { requireUser, requireRole } from '#modules/auth/server/auth.service.server.ts';
import type { PageServerLoad } from './$types';
import type { Actions } from './$types';
import {
  notifications,
  markAllRead
} from '#modules/notifications/server/notification.repository.server.ts';
export const load = (async ({ locals }) => ({
  notifications: await notifications(requireUser(locals.user).id)
})) satisfies PageServerLoad;
export const actions = {
  read: async ({ locals }) => {
    await markAllRead(requireUser(locals.user).id);
    return { success: true };
  }
} satisfies Actions;
