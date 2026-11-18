import { error } from '@sveltejs/kit';
import { requireUser } from '#modules/auth/server/auth.service.server.ts';
import { isUuid } from '#shared/validation.ts';

import { beginTurn } from '#modules/assistant/server/assistant.repository.server.ts';
import { answer } from '#modules/assistant/server/assistant.service.server.ts';
import type { ChatInput } from '#modules/assistant/assistant.types.ts';
import type { RequestHandler } from './$types';
export const POST: RequestHandler = async ({ locals, request, url }) => {
  if (!locals.user) error(401, 'Сессия истекла. Войдите в личный кабинет.');
  const user = requireUser(locals.user);
  if (request.headers.get('origin') !== url.origin) error(403, 'Недопустимый источник запроса.');
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    error(415, 'Ожидается JSON.');
  if (Number(request.headers.get('content-length')) > 16000)
    error(413, 'Сообщение слишком длинное.');
  let input: ChatInput;
  try {
    const raw = await request.text();
    if (raw.length > 8000) error(413, 'Сообщение слишком длинное.');
    input = JSON.parse(raw);
  } catch (err) {
    if (err instanceof SyntaxError) error(400, 'Некорректный запрос.');
    throw err;
  }
  if (
    !input ||
    typeof input.message !== 'string' ||
    !input.message.trim() ||
    input.message.length > 2000 ||
    typeof input.messageId !== 'string' ||
    !isUuid(input.messageId) ||
    (input.threadId !== undefined &&
      (typeof input.threadId !== 'string' || !isUuid(input.threadId)))
  )
    error(400, 'Введите вопрос длиной до 2000 символов.');
  input.message = input.message.trim();
  const turn = await beginTurn(user.id, input);
  const abort = new AbortController();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: unknown) => {
        if (!abort.signal.aborted)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      send({ type: 'meta', threadId: turn.threadId, messageId: turn.answerId });
      void answer(user, turn, abort.signal, send)
        .catch(() => {
          if (!abort.signal.aborted)
            send({ type: 'error', message: 'Не удалось сохранить ответ.' });
        })
        .finally(() => {
          if (!abort.signal.aborted) controller.close();
        });
    },
    cancel() {
      abort.abort();
    }
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Accel-Buffering': 'no'
    }
  });
};
