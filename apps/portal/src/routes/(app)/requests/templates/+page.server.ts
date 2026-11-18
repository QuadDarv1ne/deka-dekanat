import { randomUUID } from 'node:crypto';
import { error, fail, isHttpError, redirect } from '@sveltejs/kit';
import { requireRole } from '#modules/auth/server/auth.service.server.ts';
import { createRequest } from '#modules/requests/server/request.service.server.ts';
import { isRequestTemplate, requestTemplates } from '#modules/requests/request-templates.labels.ts';
import { isUuid } from '#shared/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load = (({ locals, url }) => {
  requireRole(locals.user, 'student');
  const selected = url.searchParams.get('type');
  if (selected !== null && !isRequestTemplate(selected)) error(404, 'Шаблон не найден.');
  return { id: randomUUID(), selected };
}) satisfies PageServerLoad;

export const actions = {
  default: async ({ locals, request, url }) => {
    const user = requireRole(locals.user, 'student');
    if (request.headers.get('origin') !== url.origin) error(403, 'Недопустимый источник запроса.');
    const form = await request.formData();
    const template = String(form.get('template') ?? '');
    const id = String(form.get('id') ?? '');
    const details = String(form.get('details') ?? '').trim();
    if (!isRequestTemplate(template) || template !== url.searchParams.get('type') || !isUuid(id))
      return fail(400, { message: 'Выберите шаблон заново.' });
    let saved: string;
    try {
      saved = await createRequest(user, id, requestTemplates[template].kind, details);
    } catch (err) {
      if (isHttpError(err))
        return fail(err.status, { message: err.body.message, id, details: details.slice(0, 2000) });
      throw err;
    }
    redirect(303, '/requests/' + saved);
  }
} satisfies Actions;
