import { fail, isHttpError } from '@sveltejs/kit';
import { requireRole } from '#modules/auth/server/auth.service.server.ts';
import { getRequest, requestEvents } from '#modules/requests/server/request.repository.server.ts';
import { transitionRequest } from '#modules/requests/server/request.service.server.ts';
import {
  postRequestMessage,
  requestMessages
} from '#modules/requests/server/request-conversation.server.ts';
import type { RequestStatus } from '#modules/requests/request.types.ts';
import type { Actions, PageServerLoad } from './$types';
export const load = (async ({ locals, params }) => {
  const user = requireRole(locals.user, 'student', 'dean');
  const request = await getRequest(user, params.id);
  const [events, conversation] = await Promise.all([
    requestEvents(user, request.id),
    requestMessages(user, request.id)
  ]);
  return { request, events, conversation, submissionId: crypto.randomUUID() };
}) satisfies PageServerLoad;
export const actions = {
  default: async ({ locals, request, params }) => {
    const user = requireRole(locals.user, 'student', 'dean');
    const form = await request.formData();
    if (form.get('intent') === 'message') {
      const body = String(form.get('body') ?? '').trim();
      try {
        await postRequestMessage(user, params.id, String(form.get('submissionId') ?? ''), body);
        return { operation: 'message' as const, success: true, message: 'Сообщение отправлено.' };
      } catch (err) {
        if (isHttpError(err)) {
          if (err.status === 404) throw err;
          return fail(err.status, {
            operation: 'message' as const,
            message: err.body.message,
            body: body.slice(0, 1200)
          });
        }
        throw err;
      }
    }
    try {
      await transitionRequest(
        user,
        params.id,
        String(form.get('status')) as RequestStatus,
        Number(form.get('version')),
        String(form.get('note') ?? '').trim()
      );
    } catch (err) {
      if (isHttpError(err)) return fail(err.status, { message: err.body.message });
      throw err;
    }
    return { message: 'Статус заявления обновлён.', success: true };
  }
} satisfies Actions;
