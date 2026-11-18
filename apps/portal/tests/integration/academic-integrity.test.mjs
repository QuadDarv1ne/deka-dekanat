import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
const origin = process.env.TEST_ORIGIN;
if (!origin || !process.env.TEST_DATABASE_URL) throw new Error('Use npm test.');
const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
await db.connect();
after(() => db.end());
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
async function post(path, values, cookie) {
  return fetch(origin + path, {
    method: 'POST',
    redirect: 'manual',
    headers: { Origin: origin, Accept: 'text/html', ...(cookie ? { cookie } : {}) },
    body: values instanceof FormData ? values : new URLSearchParams(values)
  });
}
async function login(account) {
  const r = await post('/login', { account });
  assert.equal(r.status, 303);
  return r.headers.get('set-cookie').split(';')[0];
}
async function get(path, cookie) {
  return fetch(origin + path, { redirect: 'manual', headers: { cookie, Accept: 'text/html' } });
}
async function student() {
  const student = randomUUID();
  await db.query(
    "INSERT INTO users(id,email,password_hash,full_name,role,faculty_id,group_id) SELECT $1,$2,password_hash,'Проверка сохранности результатов','student',faculty_id,group_id FROM users WHERE id=$3",
    [student, student + '@deka.test', id(10)]
  );
  return student;
}
const dean = await login('dean'),
  teacher = await login('teacher'),
  owner = await student();
const assignment = [id(12), id(20), id(2)].join('.');
const grade = (points, version, student = owner) => ({ assignment, student, points, version });

test('Cancelled lessons release their time slot; restoring into a replacement remains a conflict', async () => {
  const form = {
    assignment,
    date: '2032-02-16',
    start: '09:00',
    end: '10:30',
    room: 'Integrity-' + randomUUID(),
    kind: 'lecture'
  };
  assert.equal((await post('/academics/manage?/lesson', form, dean)).status, 303);
  const old = (await db.query('SELECT id,version FROM lessons WHERE room=$1', [form.room])).rows[0];
  assert.equal((await post('/academics/manage?/cancel', old, dean)).status, 303);
  assert.equal(
    (await post('/academics/manage?/lesson', { ...form, room: form.room + '-replacement' }, dean))
      .status,
    303
  );
  assert.equal(
    (
      await post(
        '/academics/manage?/lesson',
        { ...form, lessonId: old.id, version: old.version + 1 },
        dean
      )
    ).status,
    409
  );
  const rows = (
    await db.query('SELECT cancelled_at FROM lessons WHERE room LIKE $1', [form.room + '%'])
  ).rows;
  assert.equal(rows.length, 2);
  assert.equal(rows.filter((r) => r.cancelled_at === null).length, 1);
});

test('Grades reject missing and stale versions; concurrent editors preserve history and one winner', async () => {
  const missing = grade(64, 0);
  delete missing.version;
  assert.equal((await post('/academics/manage?/grade', missing, teacher)).status, 400);
  assert.equal((await post('/academics/manage?/grade', grade(64, 0), teacher)).status, 303);
  assert.equal((await post('/academics/manage?/grade', grade(17, 0), dean)).status, 409);
  const results = await Promise.all([
    post('/academics/manage?/grade', grade(71, 1), teacher),
    post('/academics/manage?/grade', grade(83, 1), dean)
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [303, 409]);
  const current = (
    await db.query('SELECT points,version FROM grades WHERE student_id=$1 AND subject_id=$2', [
      owner,
      id(20)
    ])
  ).rows[0];
  assert.equal(current.version, 2);
  assert.ok([71, 83].includes(current.points));
  const events = (
    await db.query(
      'SELECT previous_points,points,grade_version FROM grade_events WHERE student_id=$1 AND subject_id=$2 ORDER BY grade_version',
      [owner, id(20)]
    )
  ).rows;
  assert.deepEqual(events, [
    { previous_points: null, points: 64, grade_version: 1 },
    { previous_points: 64, points: current.points, grade_version: 2 }
  ]);
  const page = await get(
    '/academics/manage?tab=grades&assignment=' + assignment + '&student=' + owner,
    teacher
  );
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /История изменений/);
  assert.match(html, /name="version" value="2"/);
  assert.match(html, /method="GET"/);
  assert.doesNotMatch(html, /disabled[^>]*>Сохранить результат/);
});

test('Import checks the preview versions and atomically rolls back earlier rows when any grade changed', async () => {
  const second = await student();
  const file = new FormData();
  file.set('kind', 'grades');
  file.set(
    'file',
    new File(
      [
        'Почта;Дисциплина;Преподаватель;Баллы\n' +
          second +
          '@deka.test;Архитектура ИС;teacher@deka.test;69\n' +
          owner +
          '@deka.test;Архитектура ИС;teacher@deka.test;72'
      ],
      'grades.csv'
    )
  );
  const preview = await post('/academics/manage?/preview', file, dean);
  assert.equal(preview.status, 303);
  const draft = new URL(preview.headers.get('location'), origin).searchParams.get('draft');
  const before = (
    await db.query('SELECT version FROM grades WHERE student_id=$1 AND subject_id=$2', [
      owner,
      id(20)
    ])
  ).rows[0].version;
  assert.equal((await post('/academics/manage?/grade', grade(88, before), teacher)).status, 303);
  const notifications = (
    await db.query('SELECT count(*) FROM notifications WHERE user_id=$1', [second])
  ).rows[0].count;
  assert.equal((await post('/academics/manage?/confirm', { id: draft }, dean)).status, 409);
  assert.equal((await db.query('SELECT 1 FROM grades WHERE student_id=$1', [second])).rowCount, 0);
  assert.equal(
    (await db.query('SELECT count(*) FROM notifications WHERE user_id=$1', [second])).rows[0].count,
    notifications
  );
  assert.equal(
    (await db.query('SELECT completed_at FROM academic_imports WHERE id=$1', [draft])).rows[0]
      .completed_at,
    null
  );
  assert.equal(
    (
      await db.query('SELECT points FROM grades WHERE student_id=$1 AND subject_id=$2', [
        owner,
        id(20)
      ])
    ).rows[0].points,
    88
  );
});

test('Revoking a teaching assignment removes grade and history access while preserving the records', async () => {
  const subject = randomUUID(),
    name = 'INTEGRITY_REVOKED_' + subject;
  await db.query("INSERT INTO subjects(id,name,short_name,color) VALUES($1,$2,'Отзыв','blue')", [
    subject,
    name
  ]);
  await db.query('INSERT INTO teaching_assignments VALUES($1,$2,$3)', [id(12), subject, id(2)]);
  const values = {
    assignment: [id(12), subject, id(2)].join('.'),
    student: owner,
    points: 67,
    version: 0
  };
  assert.equal((await post('/academics/manage?/grade', values, teacher)).status, 303);
  assert.match(await (await get('/grades', teacher)).text(), new RegExp(name));
  await db.query(
    'DELETE FROM teaching_assignments WHERE teacher_id=$1 AND subject_id=$2 AND group_id=$3',
    [id(12), subject, id(2)]
  );
  assert.doesNotMatch(await (await get('/grades', teacher)).text(), new RegExp(name));
  assert.doesNotMatch(
    await (
      await get(
        '/academics/manage?tab=grades&assignment=' + values.assignment + '&student=' + owner,
        teacher
      )
    ).text(),
    new RegExp(name)
  );
  assert.equal(
    (await post('/academics/manage?/grade', { ...values, points: 68, version: 1 }, teacher)).status,
    403
  );
  assert.equal(
    (
      await db.query('SELECT points FROM grades WHERE student_id=$1 AND subject_id=$2', [
        owner,
        subject
      ])
    ).rows[0].points,
    67
  );
  assert.equal(
    (
      await db.query('SELECT 1 FROM grade_events WHERE student_id=$1 AND subject_id=$2', [
        owner,
        subject
      ])
    ).rowCount,
    1
  );
});
