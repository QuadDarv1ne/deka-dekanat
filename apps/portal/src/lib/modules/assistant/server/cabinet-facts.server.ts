import type { User } from '#modules/auth/auth.types.ts';
import { lessons } from '#modules/academics/server/academic.repository.server.ts';
import { studentAttendance } from '#modules/academics/server/attendance.repository.server.ts';
import { countAttendance } from '#modules/academics/student-progress.policy.ts';
import { readyStudentRequests } from '#modules/requests/server/ready-requests.repository.server.ts';
import { listRequests } from '#modules/requests/server/request.repository.server.ts';
import { requestKinds, statusNames } from '#modules/requests/request.labels.ts';
import { fullDate, time } from '#shared/formatting.ts';
import type { ChatSource } from '../assistant.types.ts';
import { cabinetQuestion } from '../cabinet-question.policy.ts';

const schedule = { id: 'schedule', title: 'Расписание', href: '/schedule' };

export async function cabinetFact(
  user: User,
  question: string
): Promise<{ text: string; sources: ChatSource[] } | null> {
  if (user.role !== 'student') return null;
  const kind = cabinetQuestion(question);
  const exam = kind === 'exam';
  const upcoming = kind === 'upcoming';
  if (exam || upcoming) {
    const now = Date.now();
    const records = (await lessons(user))
      .filter(
        (lesson) =>
          !lesson.cancelled_at &&
          Date.parse(lesson.ends_at) > now &&
          (!exam || lesson.kind === 'exam')
      )
      .slice(0, exam ? 1 : 3);
    if (!records.length)
      return {
        text: exam
          ? 'Ближайший экзамен пока не указан в расписании.'
          : 'Ближайших занятий пока нет в расписании.',
        sources: [schedule]
      };
    const lines = records.map(
      (lesson) =>
        `${lesson.subject}: ${fullDate(lesson.starts_at)}, ${time(lesson.starts_at)}–${time(lesson.ends_at)} (МСК), ${lesson.room}.`
    );
    return {
      text: (exam ? 'Ближайший экзамен:\n' : 'Ближайшие занятия:\n') + lines.join('\n'),
      sources: [schedule]
    };
  }
  if (kind === 'ready') {
    const ready = await readyStudentRequests(user);
    const lines = ready.items.map(
      (item) => `${requestKinds[item.kind]}, заявление №${item.number}.`
    );
    return {
      text: ready.count
        ? [
            'К выдаче:',
            ...lines,
            ...(ready.count > ready.items.length
              ? ['Остальные справки есть в списке заявлений.']
              : [])
          ].join('\n')
        : 'Готовых к выдаче документов пока нет.',
      sources: [{ id: 'requests', title: 'Мои заявления', href: '/requests' }]
    };
  }
  if (kind === 'active') {
    const active = (await listRequests(user)).filter((item) =>
      ['new', 'in_progress', 'ready'].includes(item.status)
    );
    if (!active.length)
      return {
        text: 'Активных заявлений нет.',
        sources: [{ id: 'requests', title: 'Мои заявления', href: '/requests' }]
      };
    return {
      text: [
        `Активных заявлений: ${active.length}.`,
        ...active
          .slice(0, 4)
          .map(
            (item) =>
              `${requestKinds[item.kind]}, заявление №${item.number}: ${statusNames[item.status]}.`
          )
      ].join('\n'),
      sources: [{ id: 'requests', title: 'Мои заявления', href: '/requests' }]
    };
  }
  if (kind === 'attendance') {
    const counts = countAttendance(await studentAttendance(user));
    return {
      text: `Посещаемость за последние 30 дней. Пропуски: ${counts.absent}. По уважительной причине: ${counts.excused}. Занятий без отметки: ${counts.unmarked}.`,
      sources: [{ id: 'attendance', title: 'Посещаемость', href: '/schedule/attendance' }]
    };
  }
  return null;
}
