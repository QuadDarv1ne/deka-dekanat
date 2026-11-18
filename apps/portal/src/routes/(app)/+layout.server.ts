import { requireUser } from '#modules/auth/server/auth.service.server.ts';
import { unreadCount } from '#modules/notifications/server/notification.repository.server.ts';
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { campusPath } from '#modules/campus/campus-links.ts';
export const load = (async ({ locals, url }) => {
  if (
    !locals.user &&
    (url.pathname.startsWith('/student-card/verify/') || url.pathname === campusPath)
  ) {
    const next = url.pathname + (url.pathname === campusPath ? url.search : '');
    redirect(303, `/login?next=${encodeURIComponent(next)}`);
  }
  const user = requireUser(locals.user);
  return { user, unread: await unreadCount(user.id) };
}) satisfies LayoutServerLoad;
