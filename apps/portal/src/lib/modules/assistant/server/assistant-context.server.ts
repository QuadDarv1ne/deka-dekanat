import type { User } from '#modules/auth/auth.types.ts';
import type { ChatSource } from '../assistant.types';
import { lessons, grades } from '#modules/academics/server/academic.repository.server.ts';
import { announcements } from '#modules/announcements/server/announcement.repository.server.ts';
import { listRequests } from '#modules/requests/server/request.repository.server.ts';
import { studentAttendance } from '#modules/academics/server/attendance.repository.server.ts';
import { studyAssessments } from '#modules/study-plan/server/study-plan.repository.server.ts';
import { contextSections, lessonKindsForQuestion } from '../context-selection.policy.ts';
import { learningReferences } from '../learning-references.ts';
import { attendanceLabels } from '#modules/academics/attendance.labels.ts';
import { countAttendance } from '#modules/academics/student-progress.policy.ts';

import { requestKinds, statusNames } from '#modules/requests/request.labels.ts';
import { fullDate, time } from '#shared/formatting.ts';

export async function assistantContext(
  user: User,
  question: string,
  previousQuestions: string[] = []
) {
  const selected = contextSections(question, previousQuestions);
  const personal = user.role === 'student';
  const [schedule, results, news, requests] = await Promise.all([
    selected.has('schedule') ? lessons(user) : Promise.resolve([]),
    personal && selected.has('grades') ? grades(user) : Promise.resolve([]),
    selected.has('announcements') ? announcements(user) : Promise.resolve([]),
    personal && selected.has('requests') ? listRequests(user) : Promise.resolve([])
  ]);
  const [attendance, preparation] = await Promise.all([
    personal && selected.has('attendance') ? studentAttendance(user) : Promise.resolve([]),
    personal && selected.has('preparation') ? studyAssessments(user) : Promise.resolve([])
  ]);
  const sources: ChatSource[] = [];
  const context: Record<string, unknown> = {
    currentDate: fullDate(new Date().toISOString()),
    currentTimeMoscow: new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      dateStyle: 'full',
      timeStyle: 'long'
    }).format(new Date()),
    role: user.role
  };
  function add(id: string, title: string, href: string, values: unknown[]) {
    const included: unknown[] = [];
    for (const value of values) {
      if (
        JSON.stringify(included).length + JSON.stringify(value).length > 700 ||
        JSON.stringify(context).length + JSON.stringify(included).length > 4000
      )
        break;
      included.push(value);
    }
    context[id] = { records: included, hasMore: values.length > included.length };
    sources.push({ id, title, href });
  }
  if (selected.has('help')) {
    context.help =
      'Справку об обучении, о стипендии или для налоговой можно запросить в "Моих заявлениях". Выберите тип и укажите цель. Срок подготовки уточняется в деканате. Официальный документ требует подписи вуза.';
    sources.push({ id: 'help', title: 'Подача заявления', href: '/requests/templates' });
  }
  if (selected.has('schedule')) {
    const kinds = lessonKindsForQuestion(question, previousQuestions);
    add(
      'schedule',
      'Расписание',
      '/schedule',
      schedule
        .filter((l) => !l.cancelled_at && new Date(l.ends_at) > new Date())
        .filter((l) => !kinds || (kinds as readonly string[]).includes(l.kind))
        .slice(0, 6)
        .map((l) => ({
          subject: l.subject,
          date: fullDate(l.starts_at),
          start: time(l.starts_at),
          end: time(l.ends_at),
          room: l.room,
          teacher: l.teacher,
          kind: l.kind
        }))
    );
  }
  if (personal && selected.has('grades')) {
    context.scoring =
      'Шкала интерфейса: 85-100 отлично, 70-84 хорошо, 55-69 удовлетворительно. Балл ниже 55 требует уточнить работы у преподавателя. Это не официальное решение об академической задолженности.';
    add(
      'grades',
      'Успеваемость',
      '/grades',
      results.slice(0, 12).map((g) => ({ subject: g.subject, points: g.points }))
    );
  }
  if (personal && selected.has('requests')) {
    add(
      'requests',
      'Мои заявления',
      '/requests',
      requests.slice(0, 6).map((r) => ({
        number: r.number,
        type: requestKinds[r.kind],
        status: statusNames[r.status],
        comment: r.staff_note.slice(0, 180)
      }))
    );
  }
  if (selected.has('announcements'))
    add(
      'announcements',
      'Объявления',
      '/announcements',
      news.slice(0, 3).map((n) => ({ title: n.title, text: n.body.slice(0, 240) }))
    );
  if (personal && selected.has('attendance')) {
    const counts = countAttendance(attendance);
    context.attendanceSummary = {
      пропуски: counts.absent,
      уважительнаяПричина: counts.excused,
      присутствовал: counts.present,
      безОтметки: counts.unmarked
    };
    add(
      'attendance',
      'Посещаемость',
      '/schedule/attendance',
      attendance.slice(0, 8).map((a) => ({
        subject: a.subject,
        date: fullDate(a.starts_at),
        status: attendanceLabels[a.status ?? 'unmarked']
      }))
    );
  }
  if (personal && selected.has('preparation'))
    add(
      'preparation',
      'План подготовки',
      '/assistant/study-plan',
      preparation.slice(0, 4).map((a) => ({
        subject: a.subject,
        kind: a.kind,
        date: fullDate(a.starts_at),
        markedReady: a.marked_ready
      }))
    );
  const references = learningReferences(question);
  if (references.length) {
    context.references = references.map(({ title, text }) => ({ title, text }));
    sources.push(...references.map(({ id, title, href }) => ({ id, title, href })));
  }
  return { text: JSON.stringify(context), sources };
}
