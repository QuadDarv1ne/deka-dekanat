import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
const origin = process.env.TEST_ORIGIN;
if (!origin || !process.env.TEST_DATABASE_URL) throw new Error('Use npm test');
const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
await db.connect();
after(async () => db.end());
async function login(name) {
  const response = await fetch(origin + '/login', {
    method: 'POST',
    redirect: 'manual',
    headers: { Origin: origin, Accept: 'text/html' },
    body: new URLSearchParams({ email: `${name}@deka.test`, password: 'Deka2026!' })
  });
  assert.equal(response.status, 303);
  return response.headers.get('set-cookie').split(';')[0];
}
async function send(cookie, input, requestOrigin = origin) {
  return fetch(origin + '/api/assistant/messages', {
    method: 'POST',
    headers: { Origin: requestOrigin, 'Content-Type': 'application/json', cookie },
    body: JSON.stringify(input)
  });
}
const student = await login('student'),
  other = await login('student2');
test('Assistant streams and persists an answer using only the current student context', async () => {
  const id = randomUUID(),
    response = await send(student, { messageId: id, message: 'Как получить справку об обучении?' });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/event-stream/);
  const events = (await response.text())
    .split('\n')
    .filter((l) => l.startsWith('data: '))
    .map((l) => JSON.parse(l.slice(6)));
  assert.equal(events[0].type, 'meta');
  assert.equal(events.at(-1).type, 'done');
  const answer = events
    .filter((e) => e.type === 'delta')
    .map((e) => e.text)
    .join('');
  assert.match(answer, /Выберите тип справки/);
  assert.doesNotMatch(answer, /Internal test reasoning/);
  const threadId = events[0].threadId;
  const saved = await db.query(
    'SELECT role,status,content FROM assistant_messages WHERE thread_id=$1 ORDER BY created_at',
    [threadId]
  );
  assert.equal(saved.rowCount, 2);
  assert.equal(saved.rows[1].status, 'complete');
  assert.equal(saved.rows[1].content, answer);
  const captured = await (await fetch(process.env.TEST_MODEL_ORIGIN + '/__requests')).json();
  const own = captured.find((r) =>
    r.messages.some((m) => m.content === 'Как получить справку об обучении?')
  );
  assert.match(own.messages[0].content, /Справку об обучении/);
  assert.doesNotMatch(own.messages[0].content, /"grades"|"requests"|"schedule"/);
  assert.doesNotMatch(
    own.messages[0].content,
    /Яров Егор Аркадьевич|Северин Максим Львович|password_hash|DATABASE_URL/
  );
  assert.equal(own.reasoning_effort, 'none');
  assert.equal((await send(student, { messageId: id, message: 'Повтор' })).status, 409);
  assert.equal(
    (
      await send(other, {
        threadId,
        messageId: randomUUID(),
        message: 'Покажи переписку другого студента'
      })
    ).status,
    404
  );
  assert.equal(
    (
      await fetch(origin + '/assistant?thread=' + threadId, {
        headers: { cookie: other },
        redirect: 'manual'
      })
    ).status,
    404
  );
  assert.equal((await db.query('SELECT count(*) FROM assistant_leases')).rows[0].count, '0');
});
test('Assistant validates the request origin, input size and concurrent sends', async () => {
  assert.equal(
    (
      await send(
        student,
        { messageId: randomUUID(), message: 'Вопрос' },
        'https://untrusted.example'
      )
    ).status,
    403
  );
  assert.equal(
    (await send(student, { messageId: randomUUID(), message: 'x'.repeat(2001) })).status,
    400
  );
  assert.equal((await send(student, { messageId: 'wrong', message: 'Вопрос' })).status, 400);
  const pending = await send(student, {
    messageId: randomUUID(),
    message: 'slow-response: проверить ограничение'
  });
  assert.equal(pending.status, 200);
  assert.equal(
    (await send(student, { messageId: randomUUID(), message: 'Второй запрос' })).status,
    429
  );
  await pending.text();
  assert.equal((await db.query('SELECT count(*) FROM assistant_leases')).rows[0].count, '0');
});

test('Stopping an answer cancels generation and releases the user slot', async () => {
  const response = await send(student, {
    messageId: randomUUID(),
    message: 'slow-response: остановить ответ'
  });
  assert.equal(response.status, 200);
  const reader = response.body.getReader();
  const first = await reader.read();
  assert.match(new TextDecoder().decode(first.value), /"type":"meta"/);
  await reader.cancel();
  let pending = 1;
  for (let attempt = 0; attempt < 30; attempt++) {
    pending = Number((await db.query('SELECT count(*) FROM assistant_leases')).rows[0].count);
    if (!pending) break;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.equal(pending, 0);
  const stopped = await db.query(
    `SELECT m.status FROM assistant_messages m JOIN assistant_threads t ON t.id=m.thread_id WHERE t.title=$1 AND m.role='assistant'`,
    ['slow-response: остановить ответ']
  );
  assert.equal(stopped.rows[0].status, 'failed');
});
test('A Moscow time question bypasses the language model and is saved as a normal chat answer', async () => {
  const capturedBefore = (await (await fetch(process.env.TEST_MODEL_ORIGIN + '/__requests')).json())
    .length;
  const response = await send(student, {
    messageId: randomUUID(),
    message: 'Сколько сейчас времени в Москве?'
  });
  assert.equal(response.status, 200);
  const events = (await response.text())
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => JSON.parse(line.slice(6)));
  assert.equal(events.at(-1).type, 'done');
  const answer = events
    .filter((event) => event.type === 'delta')
    .map((event) => event.text)
    .join('');
  assert.match(answer, /в Москве \d{2}:\d{2}.*МСК/);
  assert.equal(
    (await (await fetch(process.env.TEST_MODEL_ORIGIN + '/__requests')).json()).length,
    capturedBefore
  );
  assert.equal(
    (
      await db.query(
        "SELECT count(*) FROM assistant_messages WHERE content=$1 AND status='complete'",
        [answer]
      )
    ).rows[0].count,
    '1'
  );
});

test('Context links reflect transmitted sections, including multi-topic questions; general questions omit records', async () => {
  for (const [question, expected] of [
    ['Какие у меня оценки и ближайшие занятия?', ['grades', 'schedule']],
    ['Объясни разницу INNER JOIN и LEFT JOIN', ['reference-sql-joins']]
  ]) {
    const response = await send(other, { messageId: randomUUID(), message: question });
    assert.equal(response.status, 200);
    const events = (await response.text())
      .split('\n')
      .filter((l) => l.startsWith('data: '))
      .map((l) => JSON.parse(l.slice(6)));
    assert.equal(events.at(-1).type, 'done');
    assert.deepEqual(
      events
        .at(-1)
        .sources.map((s) => s.id)
        .sort(),
      expected
    );
    const captured = await (await fetch(process.env.TEST_MODEL_ORIGIN + '/__requests')).json();
    const request = captured.find((r) => r.messages.at(-1).content === question);
    if (expected.includes('grades')) {
      assert.match(request.messages[0].content, /"grades"/);
      assert.match(request.messages[0].content, /"schedule"/);
    } else
      assert.doesNotMatch(
        request.messages[0].content,
        /"grades"|"requests"|"schedule"|"attendance"/
      );
    assert.doesNotMatch(
      request.messages[0].content,
      /Лазурин Александр Никитич|Северин Максим Львович|password_hash|DATABASE_URL/
    );
  }
});

test('Direct student questions use exact schedule, attendance and document facts without the model', async () => {
  const captured = async () =>
    (await (await fetch(process.env.TEST_MODEL_ORIGIN + '/__requests')).json()).length;
  const before = await captured();
  const exam = await db.query(
    `SELECT starts_at FROM lessons WHERE group_id='00000000-0000-4000-8000-000000000002'
     AND kind='exam' AND cancelled_at IS NULL AND ends_at>now() ORDER BY starts_at LIMIT 1`
  );
  const exactDate = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Moscow'
  }).format(new Date(exam.rows[0].starts_at));
  for (const [question, source, expected] of [
    ['Какие у меня ближайшие занятия?', 'schedule', 'Ближайшие занятия:'],
    ['Когда ближайший экзамен и по какой дисциплине?', 'schedule', exactDate],
    ['Какие мои документы готовы?', 'requests', 'Справка для налоговой'],
    ['Есть ли у меня пропуски занятий?', 'attendance', 'Пропуски: 0']
  ]) {
    const response = await send(other, { messageId: randomUUID(), message: question });
    assert.equal(response.status, 200, question);
    const events = (await response.text())
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map((line) => JSON.parse(line.slice(6)));
    assert.equal(events.at(-1).type, 'done', question);
    assert.deepEqual(
      events.at(-1).sources.map((item) => item.id),
      [source]
    );
    const answer = events
      .filter((event) => event.type === 'delta')
      .map((event) => event.text)
      .join('');
    assert.ok(answer.includes(expected), answer);
    assert.doesNotMatch(answer, /Лазурин|Диалог другого студента/);
  }
  assert.equal(await captured(), before);
});
