import { randomUUID } from 'node:crypto';
import { newToken } from '#server/security/credentials.mjs';

// Called only while creating a new, explicitly empty sample database.
export async function sampleScenario(db, id) {
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(new Date());
  const [year, month, day] = date.split('-').map(Number);
  const at = (offset, hour = 9, minute = 0) =>
    new Date(Date.UTC(year, month - 1, day + offset, hour - 3, minute));
  const lessons = [];
  for (const [offset, subject, kind, hour, minute, room] of [
    [-6, 20, 'lecture', 9, 0, '402'],
    [-4, 21, 'practice', 10, 45, '310'],
    [-2, 22, 'lab', 12, 30, 'Медиалаборатория'],
    [1, 20, 'lecture', 9, 0, '402'],
    [1, 21, 'practice', 10, 45, '310'],
    [1, 22, 'lab', 12, 30, 'Медиалаборатория'],
    [2, 23, 'lecture', 9, 0, '215'],
    [4, 20, 'practice', 9, 0, '402'],
    [5, 21, 'lab', 10, 45, '308'],
    [3, 20, 'exam', 11, 0, '402'],
    [9, 23, 'credit', 11, 0, '215']
  ]) {
    const lesson = randomUUID(),
      teacher = id(subject < 22 ? 12 : 16),
      start = at(offset, hour, minute);
    await db.query(
      'INSERT INTO lessons(id,subject_id,group_id,teacher_id,starts_at,ends_at,room,kind,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [
        lesson,
        id(subject),
        id(2),
        teacher,
        start,
        new Date(+start + 90 * 60000),
        room,
        kind,
        kind === 'exam' ? 'Повторите основные понятия и подготовьте вопросы к консультации.' : ''
      ]
    );
    lessons.push({ id: lesson, offset, teacher, kind });
  }
  for (const lesson of lessons.filter((l) => l.offset < 0)) {
    for (const student of [10, 14, 15]) {
      const status = student === 10 ? (lesson.offset === -2 ? 'excused' : 'absent') : 'present';
      await db.query(
        'INSERT INTO lesson_attendance(lesson_id,student_id,status,marked_by,updated_at) VALUES($1,$2,$3,$4,$5)',
        [lesson.id, id(student), status, lesson.teacher, at(lesson.offset, 14)]
      );
    }
  }
  for (const lesson of lessons.filter((l) => ['exam', 'credit'].includes(l.kind))) {
    await db.query(
      'INSERT INTO study_plan_preferences(student_id,lesson_id,marked_ready,reminder_minutes) VALUES($1,$2,true,NULL)',
      [id(15), lesson.id]
    );
    await db.query(
      'INSERT INTO study_plan_preferences(student_id,lesson_id,marked_ready,reminder_minutes) VALUES($1,$2,false,1440)',
      [id(10), lesson.id]
    );
  }
  for (const [n, student, kind, status, days, details] of [
    [32, 14, 'study', 'new', 1, 'Для подачи документов на учебную практику.'],
    [33, 14, 'tax', 'ready', 3, 'Для оформления налогового вычета.'],
    [34, 15, 'other', 'done', 7, 'Уточнение порядка участия в проектном интенсиве.'],
    [35, 15, 'study', 'in_progress', 4, 'Для предоставления организаторам стажировки.'],
    [36, 10, 'scholarship', 'new', 9, 'Прошу уточнить порядок получения справки о стипендии.'],
    [37, 14, 'other', 'rejected', 8, 'Вопрос о смене учебной группы.'],
    [38, 15, 'tax', 'new', 7, 'Для предоставления по месту требования.']
  ]) {
    const note =
      status === 'ready'
        ? 'Документ подготовлен.'
        : status === 'rejected'
          ? 'Уточните желаемую группу и подайте новое обращение.'
          : '';
    await db.query(
      `INSERT INTO requests(id,student_id,faculty_id,kind,details,status,assigned_to,verification_code,staff_note,created_at,updated_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,now()-$10::int*interval '1 day',now()-interval '2 hours')`,
      [
        id(n),
        id(student),
        id(1),
        kind,
        details,
        status,
        status === 'new' ? null : id(11),
        status === 'ready' ? newToken() : null,
        note,
        days
      ]
    );
    await db.query(
      "INSERT INTO request_events(request_id,actor_id,status,note,created_at) VALUES($1,$2,$3,$4,now()-interval '2 hours')",
      [id(n), id(11), status, note]
    );
    if (status === 'ready')
      await db.query(
        'INSERT INTO notifications(id,user_id,title,body,href) VALUES($1,$2,$3,$4,$5)',
        [
          randomUUID(),
          id(student),
          'Документ готов',
          'Откройте документ в разделе заявлений.',
          '/requests/' + id(n)
        ]
      );
  }
  await db.query(`INSERT INTO grade_events(student_id,subject_id,teacher_id,actor_id,points,grade_version,source,created_at)
    SELECT student_id,subject_id,teacher_id,updated_by,points,version,'baseline',updated_at FROM grades`);
}
