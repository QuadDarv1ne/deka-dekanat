import { error, fail, isHttpError } from '@sveltejs/kit';
import { requireRole } from '#modules/auth/server/auth.service.server.ts';
import {
  attendanceRoster,
  studentAttendance,
  teacherAttendanceLessons
} from '#modules/academics/server/attendance.repository.server.ts';
import { markAttendance } from '#modules/academics/server/attendance.service.server.ts';
import { attendanceLabels } from '#modules/academics/attendance.labels.ts';
import type { AttendanceValue } from '#modules/academics/attendance.types.ts';
import { isUuid } from '#shared/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ locals, url }) => {
  const user = requireRole(locals.user, 'student', 'teacher');
  if (user.role === 'student') {
    return { journal: { role: 'student' as const, entries: await studentAttendance(user) } };
  }

  const requested = url.searchParams.get('lesson');
  const lessons = await teacherAttendanceLessons(user);
  const selected =
    requested === null ? lessons[0] : lessons.find((lesson) => lesson.id === requested);
  if (requested !== null && !selected) error(404, 'Занятие недоступно.');
  const roster = selected ? await attendanceRoster(user, selected.id) : [];
  return { journal: { role: 'teacher' as const, lessons, selected: selected ?? null, roster } };
}) satisfies PageServerLoad;

export const actions = {
  default: async ({ locals, request, url }) => {
    const user = requireRole(locals.user, 'teacher');
    if (request.headers.get('origin') !== url.origin) error(403, 'Недопустимый источник запроса.');
    const form = await request.formData();
    const lessonId = String(form.get('lesson') ?? '');
    const studentId = String(form.get('student') ?? '');
    const status = String(form.get('status') ?? '');
    const version = String(form.get('version') ?? '');

    if (
      !isUuid(lessonId) ||
      !isUuid(studentId) ||
      !Object.hasOwn(attendanceLabels, status) ||
      !/^\d{1,9}$/.test(version)
    ) {
      return fail(400, { message: 'Проверьте отметку и обновите журнал.' });
    }
    try {
      await markAttendance(user, {
        lessonId,
        studentId,
        status: status as AttendanceValue,
        version: Number(version)
      });
    } catch (err) {
      if (isHttpError(err)) return fail(err.status, { message: err.body.message });
      throw err;
    }
    return { saved: true };
  }
} satisfies Actions;
