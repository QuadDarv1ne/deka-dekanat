import { error, fail } from '@sveltejs/kit';
import { requireRole } from '#modules/auth/server/auth.service.server.ts';
import {
  generateStudyAdvice,
  studyPlan
} from '#modules/study-plan/server/study-plan.service.server.ts';
import { saveStudyPreference } from '#modules/study-plan/server/study-plan.repository.server.ts';
import type { StudyPreference } from '#modules/study-plan/study-plan.types.ts';
import { isUuid } from '#shared/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ locals }) =>
  studyPlan(requireRole(locals.user, 'student'))) satisfies PageServerLoad;

function checkOrigin(request: Request, url: URL) {
  if (request.headers.get('origin') !== url.origin) error(403, 'Недопустимый источник запроса.');
}

export const actions = {
  preference: async ({ locals, request, url }) => {
    const user = requireRole(locals.user, 'student');
    checkOrigin(request, url);
    const form = await request.formData();
    const id = form.get('lesson');
    const ready = form.get('ready');
    const reminder = form.get('reminder');

    if (typeof id !== 'string' || !isUuid(id)) {
      return fail(400, { message: 'Некорректное событие.' });
    }
    let patch: StudyPreference;
    if (reminder === null && (ready === 'yes' || ready === 'no')) {
      patch = { ready: ready === 'yes' };
    } else if (ready === null && (reminder === '0' || reminder === '60' || reminder === '1440')) {
      patch = { reminder: reminder === '60' ? 60 : reminder === '1440' ? 1440 : 0 };
    } else {
      return fail(400, { message: 'Некорректная настройка плана.' });
    }

    if (!(await saveStudyPreference(user, id, patch))) {
      return fail(409, { message: 'Событие или выбранное время напоминания уже недоступно.' });
    }
    return { saved: true };
  },
  advice: async ({ locals, request, url }) => {
    const user = requireRole(locals.user, 'student');
    checkOrigin(request, url);
    const { focus, now } = await studyPlan(user);
    if (focus.length === 0) return fail(400, { message: 'Пока нет данных для рекомендаций.' });

    const result = await generateStudyAdvice(user, focus, now, request.signal);
    if (result.status === 'rate')
      return fail(429, { message: 'Дождитесь ответа или повторите через минуту.' });
    if (result.status === 'busy')
      return fail(503, { message: 'Помощник занят. Попробуйте позже.' });
    if (result.status === 'unavailable')
      return fail(503, { message: 'Помощник не ответил. Базовые шаги доступны ниже.' });

    return { advice: result.advice, adviceFocus: JSON.stringify(focus) };
  }
} satisfies Actions;
