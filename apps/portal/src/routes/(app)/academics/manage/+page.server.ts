import { fail, redirect, isHttpError } from '@sveltejs/kit';
import { requireRole } from '#modules/auth/server/auth.service.server.ts';
import {
  teachingAssignments,
  academicStudents,
  managedLessons,
  managedGrades,
  gradeHistory
} from '#modules/academics/server/academic-management.repository.server.ts';
import {
  saveLesson,
  saveGrade,
  cancelLesson
} from '#modules/academics/server/academic-management.service.server.ts';
import { lessonValues, gradeValues } from '#modules/academics/server/academic-validation.server.ts';
import { assignmentKey } from '#modules/academics/academic-management.types.ts';
import {
  prepareAcademicImport,
  importPreview,
  confirmAcademicImport
} from '#modules/academics/server/academic-import.service.server.ts';
import type { Actions, PageServerLoad } from './$types';
export const load = (async ({ locals, url }) => {
  const user = requireRole(locals.user, 'dean', 'teacher');
  const [assignments, students, lessons, draft] = await Promise.all([
    teachingAssignments(user),
    academicStudents(user),
    managedLessons(user),
    importPreview(user, url.searchParams.get('draft'))
  ]);
  const assignment =
    assignments.find((a) => assignmentKey(a) === url.searchParams.get('assignment')) ??
    assignments[0];
  const groupStudents = students.filter((s) => s.group_id === assignment?.group_id);
  const student =
    groupStudents.find((s) => s.id === url.searchParams.get('student')) ?? groupStudents[0];
  const [grades, history] = await Promise.all([
    assignment
      ? managedGrades(user, assignment.subject_id, assignment.group_id)
      : Promise.resolve([]),
    assignment && student
      ? gradeHistory(user, student.id, assignment.subject_id)
      : Promise.resolve([])
  ]);
  return {
    assignments,
    students,
    lessons,
    draft,
    grades,
    history,
    gradeSelection: {
      assignment: assignment ? assignmentKey(assignment) : '',
      student: student?.id ?? ''
    },
    tab:
      user.role === 'teacher' || url.searchParams.get('tab') === 'grades'
        ? ('grades' as const)
        : ('schedule' as const),
    saved: url.searchParams.has('saved')
  };
}) satisfies PageServerLoad;
const recover = (cause: unknown) => {
  if (isHttpError(cause)) return fail(cause.status, { message: cause.body.message });
  throw cause;
};
export const actions = {
  lesson: async ({ locals, request }) => {
    try {
      await saveLesson(requireRole(locals.user, 'dean'), lessonValues(await request.formData()));
    } catch (cause) {
      return recover(cause);
    }
    redirect(303, '/academics/manage?tab=schedule&saved');
  },
  grade: async ({ locals, request }) => {
    let destination = '/academics/manage?tab=grades&saved';
    try {
      const user = requireRole(locals.user, 'dean', 'teacher');
      const values = gradeValues(await request.formData());
      await saveGrade(user, values);
      destination +=
        '&assignment=' +
        encodeURIComponent(assignmentKey(values)) +
        '&student=' +
        values.student_id;
    } catch (cause) {
      return recover(cause);
    }
    redirect(303, destination);
  },
  cancel: async ({ locals, request }) => {
    const form = await request.formData();
    try {
      await cancelLesson(
        requireRole(locals.user, 'dean'),
        String(form.get('id') ?? ''),
        Number(form.get('version'))
      );
    } catch (cause) {
      return recover(cause);
    }
    redirect(303, '/academics/manage?tab=schedule&saved');
  },
  preview: async ({ locals, request }) => {
    const user = requireRole(locals.user, 'dean', 'teacher'),
      form = await request.formData(),
      kind = form.get('kind'),
      file = form.get('file');
    if (!['schedule', 'grades'].includes(String(kind)) || !(file instanceof File))
      return fail(400, { message: 'Выберите тип импорта и файл.' });
    let id: string;
    try {
      id = await prepareAcademicImport(user, kind as 'schedule' | 'grades', file);
    } catch (cause) {
      return recover(cause);
    }
    redirect(303, `/academics/manage?tab=${kind}&draft=${id}`);
  },
  confirm: async ({ locals, request }) => {
    const form = await request.formData();
    let kind: string;
    try {
      kind = await confirmAcademicImport(
        requireRole(locals.user, 'dean', 'teacher'),
        String(form.get('id') ?? '')
      );
    } catch (cause) {
      return recover(cause);
    }
    redirect(303, `/academics/manage?tab=${kind}&saved`);
  }
} satisfies Actions;
