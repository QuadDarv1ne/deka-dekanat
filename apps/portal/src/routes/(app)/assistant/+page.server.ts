import { requireUser } from '#modules/auth/server/auth.service.server.ts';
import { threads, messages } from '#modules/assistant/server/assistant.repository.server.ts';
import { modelAvailable } from '#modules/assistant/server/llama.provider.server.ts';
import type { PageServerLoad } from './$types';
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
