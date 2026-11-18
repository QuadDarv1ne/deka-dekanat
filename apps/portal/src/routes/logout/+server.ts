import { redirect } from '@sveltejs/kit';
import { signOut } from '#modules/auth/server/auth.service.server.ts';
import type { RequestHandler } from './$types';
export const POST: RequestHandler = async ({ cookies }) => {
  await signOut(cookies);
  redirect(303, '/login');
};
