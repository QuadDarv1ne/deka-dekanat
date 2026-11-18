import { redirect } from '@sveltejs/kit';
export function load({ locals }: import('./$types').PageServerLoadEvent) {
  redirect(303, locals.user ? '/overview' : '/login');
}
