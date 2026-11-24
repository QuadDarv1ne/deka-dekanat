import { redirect } from '@sveltejs/kit';
import { isLocalDemo } from '#modules/auth/server/auth.service.server.ts';
import { loginAction, destinationAfterLogin } from '#modules/auth/server/login-action.server.ts';
import { previewAccounts } from '#modules/auth/preview-accounts.ts';
import type { Actions, PageServerLoad } from './$types';

export const load = (({ locals, url }) => {
  if (locals.user) redirect(303, destinationAfterLogin(url));
  const demo = isLocalDemo(url);
  return {
    demo,
    accounts: demo ? previewAccounts : [],
    unavailable: locals.database === 'unavailable'
  };
}) satisfies PageServerLoad;

export const actions = { default: loginAction } satisfies Actions;
