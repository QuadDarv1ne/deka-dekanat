import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const origin = process.env.TEST_ORIGIN;
if (!origin || !process.env.TEST_DATABASE_URL) throw new Error('Use npm test.');
const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
const fixed = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const studentId = randomUUID();
const ownLesson = randomUUID();
const otherLesson = randomUUID();
const exam = randomUUID();
const notification = randomUUID();
const schedule = '/schedule/attendance';
const progress = '/grades/progress';
const templates = '/requests/templates';
const sessions = {};

function get(path, cookie) {
  return fetch(origin + path, {
    headers: { Accept: 'text/html', ...(cookie ? { cookie } : {}) },
    redirect: 'manual'
  });
}

function post(path, values, cookie, site = origin) {
  return fetch(origin + path, {
    method: 'POST',
    headers: { Origin: site, Accept: 'text/html', ...(cookie ? { cookie } : {}) },
    redirect: 'manual',
    body: new URLSearchParams(values)
  });
}

async function login(values) {
  const response = await post('/login', values);
  assert.equal(response.status, 303);
  return response.headers.get('set-cookie').split(';')[0];
}

before(async () => {
  await db.connect();
  await db.query(
    `INSERT INTO users(id,email,password_hash,full_name,role,faculty_id,group_id)
     SELECT $1,$2,password_hash,'Савельева Лина Тестовна','student',faculty_id,group_id
     FROM users WHERE id=$3`,
    [studentId, `${studentId}@deka.test`, fixed(10)]
  );
  await db.query(
    'INSERT INTO grades(student_id,subject_id,teacher_id,points,updated_by) VALUES ($1,$2,$3,41,$4)',
    [studentId, fixed(20), fixed(12), fixed(11)]
  );
  for (const [id, subject, teacher, hours, kind] of [
    [ownLesson, fixed(20), fixed(12), -42, 'lecture'],
    [otherLesson, fixed(22), fixed(16), -41, 'practice'],
    [exam, fixed(20), fixed(12), 2, 'exam']
  ]) {
    await db.query(
      `INSERT INTO lessons (id,subject_id,group_id,teacher_id,starts_at,ends_at,room,kind)
       VALUES ($1,$2,$3,$4,now()+$5*interval '1 hour',now()+($5+1)*interval '1 hour','Ауд. журнала',$6)`,
      [id, subject, fixed(2), teacher, hours, kind]
    );
  }
  await db.query(
    `INSERT INTO notifications(id,user_id,title,body,href)
     VALUES($1,$2,'Личное уведомление кабинета','Учебное сообщение','/announcements')`,
    [notification, studentId]
  );
  sessions.own = await login({ email: `${studentId}@deka.test`, password: 'Deka2026!' });
  for (const account of ['student2', 'teacher', 'teacher2', 'dean']) {
    sessions[account] = await login({ email: account + '@deka.test', password: 'Deka2026!' });
  }
});

after(() => db.end());

test('Student overview renders private alerts, next assessment and primary shortcuts', async () => {
  const response = await get('/overview', sessions.own);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const html = await response.text();
  assert.match(html, /Савельева Лина Тестовна/);
  assert.match(html, /Личное уведомление кабинета/);
  assert.match(html, /Шаги подготовки с ИИ/);
  for (const path of [schedule, progress, templates, '/assistant/study-plan#assessment-' + exam]) {
    assert.ok(html.includes(path), path);
  }
  assert.doesNotMatch(
    await (await get('/overview', sessions.student2)).text(),
    /Личное уведомление кабинета/
  );
  const dean = await (await get('/overview', sessions.dean)).text();
  assert.match(dean, /Обращения студентов/);
  assert.doesNotMatch(dean, /Состояние кабинета/);

  const read = await post('/notifications/' + notification, {}, sessions.own);
  assert.equal(read.status, 303);
  assert.equal(read.headers.get('location'), '/announcements');
  assert.doesNotMatch(
    await (await get('/overview', sessions.own)).text(),
    /Личное уведомление кабинета/
  );
});

test('Attendance write requires the teaching assignment; concurrent edits and audit are consistent', async () => {
  const path = schedule + '?lesson=' + ownLesson;
  const fields = { lesson: ownLesson, student: studentId, status: 'present', version: '0' };
  const roster = await get(path, sessions.teacher);
  assert.equal(roster.status, 200);
  assert.match(await roster.text(), /Савельева Лина Тестовна/);
  assert.equal((await get(path, sessions.teacher2)).status, 404);
  assert.equal((await get(path, sessions.dean)).status, 403);
  assert.equal((await post(path, fields, sessions.own)).status, 403);
  assert.equal((await post(path, fields, sessions.teacher, 'https://outside.invalid')).status, 403);
  assert.equal(
    (await post(path, { ...fields, lesson: otherLesson }, sessions.teacher)).status,
    404
  );
  assert.equal((await post(path, { ...fields, lesson: exam }, sessions.teacher)).status, 404);
  assert.equal((await post(path, { ...fields, student: fixed(11) }, sessions.teacher)).status, 404);
  assert.equal(
    (await post(path, { ...fields, status: 'untrusted' }, sessions.teacher)).status,
    400
  );

  const racing = await Promise.all([
    post(path, fields, sessions.teacher),
    post(path, { ...fields, status: 'absent' }, sessions.teacher)
  ]);
  assert.deepEqual(racing.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await post(path, { ...fields, version: '1' }, sessions.teacher)).status, 200);

  const found = await db.query(
    'SELECT status,marked_by,version FROM lesson_attendance WHERE lesson_id=$1 AND student_id=$2',
    [ownLesson, studentId]
  );
  assert.deepEqual(found.rows, [{ status: 'present', marked_by: fixed(12), version: 2 }]);
  const audits = await db.query(
    "SELECT count(*)::int n FROM audit_log WHERE entity_id=$1 AND action='attendance.mark'",
    [ownLesson]
  );
  assert.equal(audits.rows[0].n, 2);

  const own = await (await get(schedule, sessions.own)).text();
  assert.match(own, />Был</);
  assert.match(own, />Нет отметки</);
  const peer = await (await get(schedule, sessions.student2)).text();
  assert.doesNotMatch(peer, /Савельева Лина Тестовна/);
  assert.match(peer, />Нет отметки</);
  assert.equal(
    (
      await db.query('SELECT 1 FROM lesson_attendance WHERE lesson_id=$1 AND student_id=$2', [
        ownLesson,
        fixed(14)
      ])
    ).rowCount,
    0
  );
});

test('Course view ties the current score and recorded attendance to the correct assessment', async () => {
  const response = await get(progress, sessions.own);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Не хватает 14 б. до порога 55/);
  assert.match(html, /Был: 1/);
  assert.ok(html.includes('/assistant/study-plan#assessment-' + exam));
  assert.match(html, /Баллы пока не опубликованы/);
  assert.equal((await get(progress, sessions.teacher)).status, 403);
  await db.query('UPDATE lessons SET cancelled_at=now() WHERE id=$1', [ownLesson]);
  assert.doesNotMatch(await (await get(progress, sessions.own)).text(), /Был: 1/);
});

test('Request templates are editable and reuse the regular request history and ownership', async () => {
  const path = templates + '?type=scholarship';
  assert.equal((await get(path, sessions.dean)).status, 403);
  const page = await get(path, sessions.own);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Справка о назначенной стипендии для предоставления по месту требования/);
  assert.match(html, /Савельева Лина Тестовна/);
  const id = randomUUID();
  const fields = { id, template: 'scholarship', details: 'Нужна справка за октябрь.' };
  assert.equal((await post(path, { ...fields, template: 'tax' }, sessions.own)).status, 400);
  assert.equal((await post(path, fields, sessions.own, 'https://outside.invalid')).status, 403);
  for (let n = 0; n < 2; n++) {
    const response = await post(path, fields, sessions.own);
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), '/requests/' + id);
  }
  const rows = await db.query('SELECT kind,details,student_id FROM requests WHERE id=$1', [id]);
  assert.deepEqual(rows.rows, [
    { kind: 'scholarship', details: fields.details, student_id: studentId }
  ]);
  const detail = await (await get('/requests/' + id, sessions.own)).text();
  assert.match(detail, /aria-current="step"/);
  assert.match(detail, /История заявления/);
  assert.equal((await get('/requests/' + id, sessions.student2)).status, 404);
});
