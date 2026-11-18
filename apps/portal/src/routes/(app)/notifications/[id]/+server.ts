import { error, redirect } from '@sveltejs/kit';
import { requireUser } from '#modules/auth/server/auth.service.server.ts';
import { readNotification } from '#modules/notifications/server/notification.repository.server.ts';
import { isUuid } from '#shared/validation.ts';
import type { RequestHandler } from './$types';
export const POST: RequestHandler = async ({ locals, params }) => {
  const user = requireUser(locals.user);
  if (!isUuid(params.id)) error(404, 'Уведомление не найдено.');
  const href = await readNotification(user.id, params.id);
  if (!href || !href.startsWith('/') || href.startsWith('//'))
    error(404, 'Уведомление не найдено.');
  redirect(303, href);
};
