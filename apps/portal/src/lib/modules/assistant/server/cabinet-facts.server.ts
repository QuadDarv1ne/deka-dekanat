import type { User } from '#modules/auth/auth.types.ts';
import { lessons } from '#modules/academics/server/academic.repository.server.ts';
import { studentAttendance } from '#modules/academics/server/attendance.repository.server.ts';
import { countAttendance } from '#modules/academics/student-progress.policy.ts';
import { readyStudentRequests } from '#modules/requests/server/ready-requests.repository.server.ts';
import { requestKinds } from '#modules/requests/request.labels.ts';
import { fullDate, time } from '#shared/formatting.ts';
import type { ChatSource } from '../assistant.types.ts';

const schedule = { id: 'schedule', title: 'Расписание', href: '/schedule' };

export async function cabinetFact(
  user: User,
  question: string
): Promise<{ text: string; sources: ChatSource[] } | null> {
  if (user.role !== 'student') return null;
  const text = question
    .toLocaleLowerCase('ru-RU')
    .trim()
    .replace(/[.!?]+$/, '')
    .trim();
  const exam =
    /^(?:когда|во сколько) (?:у меня )?ближайший экзамен(?: и по какой дисциплине)?$/u.test(text);
  const upcoming = /^какие (?:у меня )?(?:ближайшие|следующие) (?:занятия|пары)(?: у меня)?$/u.test(
    text
  );
  if (exam || upcoming) {
    const now = Date.now();
    const records = (await lessons(user))
      .filter((lesson) => Date.parse(lesson.ends_at) > now && (!exam || lesson.kind === 'exam'))
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
  if (/^какие (?:мои )?(?:документы|справки) готовы(?: к выдаче)?$/u.test(text)) {
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
  if (/^есть ли у меня пропуски(?: занятий)?$/u.test(text)) {
    const counts = countAttendance(await studentAttendance(user));
    return {
      text: `Посещаемость за последние 30 дней. Пропуски: ${counts.absent}. По уважительной причине: ${counts.excused}. Занятий без отметки: ${counts.unmarked}.`,
      sources: [{ id: 'attendance', title: 'Посещаемость', href: '/schedule/attendance' }]
    };
  }
  return null;
}
