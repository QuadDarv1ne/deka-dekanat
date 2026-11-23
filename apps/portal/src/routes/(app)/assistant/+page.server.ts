import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#modules/auth/server/auth.service.server.ts';
import {
  threads,
  messages,
  renameThread,
  deleteThread
} from '#modules/assistant/server/assistant.repository.server.ts';
import { modelAvailable } from '#modules/assistant/server/llama.provider.server.ts';
import { isUuid } from '#shared/validation.ts';
import type { Actions, PageServerLoad } from './$types';
export const load = (async ({ locals, url }) => {
  const user = requireUser(locals.user),
    threadId = url.searchParams.get('thread');
  const [history, items, available] = await Promise.all([
    threads(user.id),
    threadId ? messages(user.id, threadId) : Promise.resolve([]),
    modelAvailable()
  ]);
  return {
    threads: history,
    messages: items,
    threadId,
    available,
    question: (url.searchParams.get('question') ?? '').slice(0, 2000)
  };
}) satisfies PageServerLoad;
export const actions = {
  rename: async ({ locals, request }) => {
    const user = requireUser(locals.user),
      form = await request.formData(),
      threadId = form.get('threadId'),
      title = String(form.get('title') ?? '').trim();
    if (typeof threadId !== 'string' || !isUuid(threadId))
      return fail(400, { message: 'Некорректный чат.' });
    if (!title || title.length > 100)
      return fail(400, { message: 'Название чата должно быть от 1 до 100 символов.' });
    await renameThread(user.id, threadId, title);
    return { renamed: threadId, message: 'Название чата обновлено.' };
  },
  delete: async ({ locals, request, url }) => {
    const user = requireUser(locals.user),
      threadId = (await request.formData()).get('threadId');
    if (typeof threadId !== 'string' || !isUuid(threadId))
      return fail(400, { message: 'Некорректный чат.' });
    await deleteThread(user.id, threadId);
    if (url.searchParams.get('thread') === threadId) redirect(303, '/assistant');
    return { deleted: threadId, message: 'Чат удалён.' };
  }
} satisfies Actions;
