import { error } from '@sveltejs/kit';
import { requireRole } from '#modules/auth/server/auth.service.server.ts';
import { assessmentWithReminder } from '#modules/study-plan/server/study-plan.repository.server.ts';
import { studyCalendar } from '#modules/study-plan/server/study-calendar.server.ts';
import { isUuid } from '#shared/validation.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
  const user = requireRole(locals.user, 'student');
  if (!isUuid(params.id)) error(404, 'Напоминание не найдено.');
  const assessment = await assessmentWithReminder(user, params.id);
  if (!assessment?.reminder_minutes) error(404, 'Напоминание не найдено.');

  return new Response(studyCalendar(assessment, assessment.reminder_minutes), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="deka-assessment.ics"',
      'Cache-Control': 'private, no-store'
    }
  });
};
