import { fail, isHttpError, isRedirect, redirect, type Action } from '@sveltejs/kit';
import { quickSignIn, signIn } from './auth.service.server.ts';
import { campusPath } from '#modules/campus/campus-links.ts';

// Both "/" and "/login" render the same login form, so they share this action.
// Without it the root route answered POST with 405 Method Not Allowed.
export function destinationAfterLogin(url: URL) {
  const raw = url.searchParams.get('next');
  if (!raw?.startsWith('/')) return '/overview';
  try {
    const target = new URL(raw, url.origin);
    if (target.origin !== url.origin) return '/overview';
    if (target.pathname === campusPath) return target.pathname + target.search;
    if (/^\/student-card\/verify\/[0-9a-f-]{36}$/.test(target.pathname)) return target.pathname;
  } catch {}
  return '/overview';
}

export const loginAction = (async ({ request, cookies, url }) => {
  try {
    const form = await request.formData();
    const next = destinationAfterLogin(url);
    if (form.has('account')) {
      if (!(await quickSignIn(String(form.get('account')), cookies, url)))
        return fail(403, { message: 'Быстрый вход недоступен.' });
      redirect(303, next);
    }
    const email = String(form.get('email') ?? '')
      .trim()
      .toLowerCase();
    const password = String(form.get('password') ?? '');
    if (!email || email.length > 254 || password.length < 1 || password.length > 128)
      return fail(400, { message: 'Введите почту и пароль.' });
    if (!(await signIn(email, password, cookies, url)))
      return fail(400, {
        message: 'Не удалось войти. Проверьте почту и пароль или повторите попытку через 15 минут.'
      });
    redirect(303, next);
  } catch (cause) {
    if (isRedirect(cause) || isHttpError(cause)) throw cause;
    console.error('[login] failed', cause instanceof Error ? cause.message : 'unknown');
    return fail(503, {
      message: 'Сервис временно недоступен. Попробуйте ещё раз через минуту.'
    });
  }
}) satisfies Action;
