import type { Handle } from '@sveltejs/kit/hooks';
import { sessionUser } from '#modules/auth/server/auth.service.server.ts';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = await sessionUser(event.cookies, event.url);
  const response = await resolve(event);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  if (!event.url.pathname.startsWith('/_app/') && !event.url.pathname.startsWith('/fonts/')) {
    response.headers.set('Cache-Control', 'private, no-store');
  }
  return response;
};
