import { redirect } from '@sveltejs/kit';
import { signOut } from '#modules/auth/server/auth.service.server.ts';
import type { RequestHandler } from './$types';

// Signing out must be a POST (a GET link would let any page log the user out),
// but a stale bookmark or a manual visit should not land on a bare
// "405 Method Not Allowed" text page: send the visitor back to the cabinet,
// or to the login form when there is no session left.
export const GET: RequestHandler = ({ locals }) => {
  redirect(303, locals.user ? '/overview' : '/login');
};

export const POST: RequestHandler = async ({ cookies }) => {
  await signOut(cookies);
  redirect(303, '/login');
};
