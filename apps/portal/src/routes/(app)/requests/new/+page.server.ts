import { randomUUID } from 'node:crypto';
import { isHttpError, fail, redirect } from '@sveltejs/kit';
import { requireRole } from '#modules/auth/server/auth.service.server.ts';
import { createRequest } from '#modules/requests/server/request.service.server.ts';
import type { Actions, PageServerLoad } from './$types';
export const load = (({ locals }) => {
  requireRole(locals.user, 'student');
  return { id: randomUUID() };
}) satisfies PageServerLoad;
export const actions = {
  default: async ({ locals, request }) => {
    const user = requireRole(locals.user, 'student');
    const form = await request.formData();
    let id: string;
    try {
      id = await createRequest(
        user,
        String(form.get('id') ?? ''),
        String(form.get('kind') ?? ''),
        String(form.get('details') ?? '').trim()
      );
    } catch (err) {
      if (isHttpError(err)) return fail(err.status, { message: err.body.message });
      throw err;
    }
    redirect(303, `/requests/${id}`);
  }
} satisfies Actions;
