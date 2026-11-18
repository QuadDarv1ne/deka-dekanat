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
const plan = '/assistant/study-plan';
const triage = '/requests/triage';
const fakeFaculty = randomUUID();
const fakeGroup = randomUUID();
const personalExam = randomUUID();
const foreignExam = randomUUID();
const soonExam = randomUUID();
const ownRequest = randomUUID();
const foreignRequest = randomUUID();
const ownerId = randomUUID();
const otherId = randomUUID();
const outsiders = randomUUID();

function get(path, cookie) {
  return fetch(origin + path, {
    redirect: 'manual',
    headers: { Accept: 'text/html', ...(cookie ? { cookie } : {}) }
  });
}

function post(path, values, cookie, site = origin) {
  return fetch(origin + path, {
    method: 'POST',
    redirect: 'manual',
    headers: { Origin: site, Accept: 'text/html', ...(cookie ? { cookie } : {}) },
    body: new URLSearchParams(values)
  });
}

await db.query('INSERT INTO faculties VALUES($1,$2)', [fakeFaculty, 'Факультет проверки']);
await db.query('INSERT INTO study_groups VALUES($1,$2,$3,2,$4)', [
  fakeGroup,
  fakeFaculty,
  'Тест-ПЛ',
  'Проверка плана'
]);
for (const [studentId, fullName, faculty, group] of [
  [ownerId, 'Студент Проверка Плана', id(1), id(2)],
  [otherId, 'Студент Без Баллов', id(1), id(2)],
  [outsiders, 'Закрытое Имя Факультета', fakeFaculty, fakeGroup]
]) {
  await db.query(
    `INSERT INTO users (id,email,password_hash,full_name,role,faculty_id,group_id)
     SELECT $1,$2,password_hash,$3,'student',$4,$5 FROM users WHERE id=$6`,
    [studentId, `${studentId}@deka.test`, fullName, faculty, group, id(10)]
  );
}
await db.query('INSERT INTO teaching_assignments VALUES($1,$2,$3)', [id(12), id(20), fakeGroup]);
for (const [lesson, group, delay, room] of [
  [personalExam, id(2), 52, 'Аудитория проверки плана'],
  [foreignExam, fakeGroup, 54, 'Закрытая аудитория'],
  [soonExam, id(2), 7, 'Экзамен переноса']
]) {
  await db.query(
    `INSERT INTO lessons (id,subject_id,group_id,teacher_id,starts_at,ends_at,room,kind)
     VALUES ($1,$2,$3,$4,now()+$5*interval '1 hour',now()+($5+1)*interval '1 hour',$6,'exam')`,
    [lesson, id(20), group, id(12), delay, room]
  );
}
await db.query(
  'INSERT INTO grades(student_id,subject_id,teacher_id,points,updated_by) VALUES ($1,$2,$3,47,$4)',
  [ownerId, id(20), id(12), id(11)]
);

async function login(values) {
  const response = await post('/login', values);
  assert.equal(response.status, 303);
  return response.headers.get('set-cookie').split(';')[0];
}
const student = await login({ email: `${ownerId}@deka.test`, password: 'Deka2026!' });
const otherStudent = await login({ email: `${otherId}@deka.test`, password: 'Deka2026!' });
const dean = await login({ account: 'dean' });

test('Study plan routes and personal scores follow roles, group and account scope', async () => {
  assert.equal((await get(plan)).status, 303);
  assert.equal((await get(plan, dean)).status, 403);
  const own = await get(plan, student);
  assert.equal(own.status, 200);
  assert.match(own.headers.get('cache-control'), /no-store/);
  assert.match(await own.text(), /47 из 100/);
  const otherPage = await (await get(plan, otherStudent)).text();
  assert.match(otherPage, /Аудитория проверки плана/);
  assert.doesNotMatch(otherPage, /47 из 100|Закрытая аудитория/);
  assert.match(await (await get('/assistant', student)).text(), /href="\/assistant\/study-plan"/);
  assert.match(await (await get('/grades', student)).text(), /href="\/assistant\/study-plan"/);
  assert.equal((await post(plan + '?/advice', {}, dean)).status, 403);
  assert.equal((await post(plan + '?/advice', {}, student, 'https://outside.invalid')).status, 403);
});

test('Preference updates commute and calendar export enforces ownership, lead time and live status', async () => {
  const edit = plan + '?/preference';
  const calendar = plan + '/calendar/' + personalExam;
  assert.equal((await post(edit, { lesson: foreignExam, reminder: '1440' }, student)).status, 409);
  assert.equal((await post(edit, { lesson: soonExam, reminder: '1440' }, student)).status, 409);
  assert.equal(
    (await post(edit, { lesson: personalExam, reminder: 'not-a-choice' }, student)).status,
    400
  );
  assert.equal(
    (await post(edit, { lesson: personalExam, ready: 'yes' }, student, 'https://outside.invalid'))
      .status,
    403
  );

  const changes = await Promise.all([
    post(edit, { lesson: personalExam, reminder: '1440' }, student),
    post(edit, { lesson: personalExam, ready: 'yes' }, student)
  ]);
  assert.deepEqual(
    changes.map((response) => response.status),
    [200, 200]
  );
  assert.deepEqual(
    (
      await db.query(
        'SELECT marked_ready,reminder_minutes FROM study_plan_preferences WHERE student_id=$1 AND lesson_id=$2',
        [ownerId, personalExam]
      )
    ).rows,
    [{ marked_ready: true, reminder_minutes: 1440 }]
  );
  assert.equal((await get(calendar, otherStudent)).status, 404);
  assert.equal((await get(calendar, dean)).status, 403);
  const exportResponse = await get(calendar, student);
  assert.equal(exportResponse.status, 200);
  assert.match(exportResponse.headers.get('content-type'), /text\/calendar/);
  assert.match(exportResponse.headers.get('cache-control'), /no-store/);
  const ics = await exportResponse.text();
  assert.match(ics, /BEGIN:VALARM\r\nTRIGGER:-PT24H\r\nACTION:DISPLAY/);
  assert.match(ics, /LOCATION:Аудитория проверки плана/);
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);

  assert.equal((await post(edit, { lesson: personalExam, ready: 'no' }, student)).status, 200);
  await db.query(
    "UPDATE lessons SET starts_at=now()+interval '13 hours', ends_at=now()+interval '14 hours' WHERE id=$1",
    [personalExam]
  );
  assert.equal((await get(calendar, student)).status, 404);
  assert.match(await (await get(plan, student)).text(), /Пора повторить/);
  assert.equal((await post(edit, { lesson: personalExam, reminder: '60' }, student)).status, 200);
  assert.match(await (await get(calendar, student)).text(), /TRIGGER:-PT1H/);
  assert.equal((await post(edit, { lesson: personalExam, reminder: '0' }, student)).status, 200);
  assert.equal((await get(calendar, student)).status, 404);
  await db.query('UPDATE lessons SET cancelled_at=now() WHERE id=$1', [personalExam]);
  assert.equal((await post(edit, { lesson: personalExam, ready: 'yes' }, student)).status, 409);
  assert.doesNotMatch(await (await get(plan, student)).text(), /Аудитория проверки плана/);
});

test('Deanery triage ranks active requests by age within its faculty and hides terminal requests', async () => {
  const terminal = randomUUID();
  for (const [requestId, user, faculty, status, days] of [
    [ownRequest, ownerId, id(1), 'new', 11],
    [foreignRequest, outsiders, fakeFaculty, 'new', 21],
    [terminal, ownerId, id(1), 'done', 30]
  ]) {
    await db.query(
      `INSERT INTO requests (id,student_id,faculty_id,kind,details,status,created_at)
       VALUES ($1,$2,$3,'study','Тест очереди заявлений',$4,now()-$5*interval '1 day')`,
      [requestId, user, faculty, status, days]
    );
  }
  assert.equal((await get(triage, student)).status, 403);
  const response = await get(triage, dean);
  assert.equal(response.status, 200);
  const queue = await response.text();
  assert.match(queue, /11 сут\./);
  assert.match(queue, /Студент Проверка Плана/);
  assert.ok(queue.indexOf('/requests/' + ownRequest) < queue.indexOf('/requests/' + id(30)));
  assert.ok(!queue.includes(foreignRequest) && !queue.includes(terminal));
  assert.doesNotMatch(queue, /Закрытое Имя Факультета|Тест очереди заявлений/);
  assert.match(await (await get('/requests', dean)).text(), /href="\/requests\/triage"/);
  assert.doesNotMatch(await (await get('/requests', student)).text(), /href="\/requests\/triage"/);
});
