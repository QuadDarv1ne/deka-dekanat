import type { Handle } from '@sveltejs/kit/hooks';
import { sessionUser } from '#modules/auth/server/auth.service.server.ts';
import { isDatabaseUnavailable } from '#server/database/postgres.ts';

export const handle: Handle = async ({ event, resolve }) => {
  try {
    event.locals.user = await sessionUser(event.cookies, event.url);
    event.locals.database = 'ok';
  } catch (cause) {
    if (!isDatabaseUnavailable(cause)) throw cause;
    event.locals.user = null;
    event.locals.database = 'unavailable';
    console.error(
      '[database] unavailable',
      cause instanceof Error
        ? cause.message.replace(/postgres(?:ql)?:\/\/\S+/gi, 'postgres://…')
        : 'unknown'
    );
  }
  const response = await resolve(event);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  if (!event.url.pathname.startsWith('/_app/') && !event.url.pathname.startsWith('/fonts/')) {
    response.headers.set('Cache-Control', 'private, no-store');
  }
  return response;
};
