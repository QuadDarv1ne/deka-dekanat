import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { workbook } from '../fixtures/spreadsheet.mjs';
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
async function get(path, cookie) {
  return fetch(origin + path, {
    redirect: 'manual',
    headers: { Accept: 'text/html', ...(cookie ? { cookie } : {}) }
  });
}
async function login(account) {
  const r = await post('/login', { account });
  assert.equal(r.status, 303);
  return r.headers.get('set-cookie').split(';')[0];
}
const student = await login('student'),
  other = await login('student2'),
  dean = await login('dean'),
  teacher = await login('teacher');

test('Named quick access is whitelisted; student cards are persistent, downloadable and staff-scoped', async () => {
  const loginPage = await (await get('/login')).text();
  for (const name of [
    'Лазурин Александр Никитич',
    'Яров Егор Аркадьевич',
    'Северин Максим Львович'
  ])
    assert.ok(loginPage.includes(name));
  assert.doesNotMatch(loginPage, /value="Deka2026!"/);
  assert.equal((await post('/login', { account: 'foreign' })).status, 403);
  const owner = crypto.randomUUID(),
    email = `card-${owner}@deka.test`;
  await db.query(
    "INSERT INTO users(id,email,password_hash,full_name,role,faculty_id,group_id) SELECT $1,$2,password_hash,'Проверка студенческого','student',faculty_id,group_id FROM users WHERE id=$3",
    [owner, email, id(10)]
  );
  const signed = await post('/login', { email, password: 'Deka2026!' }),
    cardCookie = signed.headers.get('set-cookie').split(';')[0];
  const page = await get('/student-card', cardCookie);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /data:image\/png;base64/);
  const first = (await db.query('SELECT * FROM student_cards WHERE student_id=$1', [owner]))
    .rows[0];
  await get('/student-card', cardCookie);
  assert.equal(
    (await db.query('SELECT verification_code FROM student_cards WHERE student_id=$1', [owner]))
      .rows[0].verification_code,
    first.verification_code
  );
  const download = await get('/student-card/download', cardCookie);
  assert.match(download.headers.get('content-type'), /image\/svg/);
  assert.match(await download.text(), /Проверка/);
  const path = '/student-card/verify/' + first.verification_code;
  const anonymous = await get(path);
  assert.equal(anonymous.status, 303);
  assert.match(anonymous.headers.get('location'), /next=/);
  assert.equal((await get(path, other)).status, 403);
  assert.equal((await get(path, dean)).status, 200);
  assert.equal((await get(path, teacher)).status, 200);
  await db.query('UPDATE users SET active=false WHERE id=$1', [owner]);
  assert.equal((await get(path, dean)).status, 404);
});
test('Calendar export uses the authorized schedule and folds UTF-8 lines to RFC 5545 size', async () => {
  const response = await get('/schedule/calendar', student);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/calendar/);
  const content = await response.text();
  assert.match(content, /BEGIN:VEVENT/);
  assert.match(content, /DTSTART:\d{8}T\d{6}Z/);
  for (const line of content.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
  assert.equal((await get('/schedule/calendar', await login('admin'))).status, 403);
});
test('Teaching permissions, conflict checks, stale edits, cancellation and notifications are atomic', async () => {
  const form = {
    assignment: [id(12), id(20), id(2)].join('.'),
    date: '2026-12-01',
    start: '09:00',
    end: '10:30',
    room: 'Проверка-101',
    kind: 'exam',
    note: 'Экзамен'
  };
  assert.equal((await post('/academics/manage?/lesson', form, teacher)).status, 403);
  assert.equal((await post('/academics/manage?/lesson', form, dean)).status, 303);
  const lesson = (await db.query('SELECT * FROM lessons WHERE room=$1', [form.room])).rows[0];
  assert.ok(lesson);
  assert.equal(
    (await post('/academics/manage?/lesson', { ...form, room: 'Проверка-102' }, dean)).status,
    409
  );
  assert.equal(
    (await post('/academics/manage?/cancel', { id: lesson.id, version: 999 }, dean)).status,
    409
  );
  assert.equal(
    (await post('/academics/manage?/cancel', { id: lesson.id, version: lesson.version }, dean))
      .status,
    303
  );
  assert.ok(
    (await db.query('SELECT cancelled_at FROM lessons WHERE id=$1', [lesson.id])).rows[0]
      .cancelled_at
  );
  assert.ok(
    Number(
      (await db.query("SELECT count(*) FROM notifications WHERE title='Расписание изменено'"))
        .rows[0].count
    ) >= 6
  );
  assert.equal(
    (
      await post(
        '/academics/manage?/grade',
        { assignment: [id(16), id(22), id(2)].join('.'), student: id(15), points: 100, version: 0 },
        teacher
      )
    ).status,
    403
  );
});
test('CSV and XLSX imports require preview and ownership, commit once and roll back conflicting batches', async () => {
  const headers = ['Почта', 'Дисциплина', 'Преподаватель', 'Баллы'];
  const values = ['student3@deka.test', 'Базы данных', 'teacher@deka.test', '76'];
  async function preview(name, content, cookie = dean, kind = 'grades') {
    const form = new FormData();
    form.set('kind', kind);
    form.set('file', new File([content], name));
    return post('/academics/manage?/preview', form, cookie);
  }
  const before = (
    await db.query('SELECT points FROM grades WHERE student_id=$1 AND subject_id=$2', [
      id(15),
      id(21)
    ])
  ).rows[0].points;
  const csv = await preview('grades.csv', '\uFEFF' + headers.join(';') + '\r\n' + values.join(';'));
  assert.equal(csv.status, 303);
  const draft = new URL(csv.headers.get('location'), origin).searchParams.get('draft');
  assert.ok(draft);
  assert.equal(
    (
      await db.query('SELECT points FROM grades WHERE student_id=$1 AND subject_id=$2', [
        id(15),
        id(21)
      ])
    ).rows[0].points,
    before
  );
  assert.equal((await post('/academics/manage?/confirm', { id: draft }, teacher)).status, 404);
  assert.equal((await post('/academics/manage?/confirm', { id: draft }, dean)).status, 303);
  assert.equal((await post('/academics/manage?/confirm', { id: draft }, dean)).status, 303);
  assert.equal(
    (
      await db.query('SELECT points FROM grades WHERE student_id=$1 AND subject_id=$2', [
        id(15),
        id(21)
      ])
    ).rows[0].points,
    76
  );
  assert.equal(
    (
      await db.query(
        "SELECT count(*) FROM audit_log WHERE action='academic_import.complete' AND entity_id=$1",
        [draft]
      )
    ).rows[0].count,
    '1'
  );
  const excel = await preview('grades.xlsx', workbook([headers, [...values.slice(0, 3), '77']]));
  assert.equal(excel.status, 303, await excel.text());
  const excelId = new URL(excel.headers.get('location'), origin).searchParams.get('draft');
  assert.equal((await post('/academics/manage?/confirm', { id: excelId }, dean)).status, 303);
  const schedule =
    'Группа;Дисциплина;Преподаватель;Дата;Начало;Окончание;Аудитория;Тип\nИС-23;Базы данных;teacher@deka.test;2026-12-02;09:00;10:30;Импорт-201;Практика\nИС-23;Базы данных;teacher@deka.test;2026-12-02;10:00;11:30;Импорт-202;Практика';
  const batch = await preview('schedule.csv', schedule, dean, 'schedule');
  assert.equal(batch.status, 303);
  const batchId = new URL(batch.headers.get('location'), origin).searchParams.get('draft');
  assert.equal((await post('/academics/manage?/confirm', { id: batchId }, dean)).status, 409);
  assert.equal(
    (await db.query("SELECT count(*) FROM lessons WHERE room LIKE 'Импорт-%'")).rows[0].count,
    '0'
  );
  assert.equal(
    (
      await preview(
        'grades.csv',
        headers.join(';') + '\n' + [...values.slice(0, 3), '101'].join(';')
      )
    ).status,
    400
  );
});
test('Faculty announcements notify students and protect publication from student accounts', async () => {
  const publication = crypto.randomUUID(),
    form = {
      id: publication,
      title: 'Изменение консультации',
      body: 'Консультация состоится в читальном зале.',
      tag: 'Учёба'
    };
  assert.equal((await post('/announcements?/publish', form, student)).status, 403);
  assert.equal((await post('/announcements?/publish', form, dean)).status, 303);
  assert.equal((await post('/announcements?/publish', form, dean)).status, 303);
  assert.equal(
    (await db.query('SELECT count(*) FROM announcements WHERE id=$1', [publication])).rows[0].count,
    '1'
  );
  assert.equal(
    (
      await db.query('SELECT count(*) FROM notifications WHERE user_id=$1 AND href=$2', [
        id(15),
        '/announcements#' + publication
      ])
    ).rows[0].count,
    '1'
  );
  assert.equal((await post('/announcements?/remove', { id: publication }, dean)).status, 303);
});
