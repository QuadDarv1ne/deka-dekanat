import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cabinetGroups, cabinetPath, cabinetSections } from '#application/cabinet-navigation.ts';

const origin = process.env.TEST_ORIGIN;
if (!origin) throw new Error('Use npm test.');

const get = (path, cookie) =>
  fetch(origin + path, {
    headers: { Accept: 'text/html', ...(cookie ? { cookie } : {}) },
    redirect: 'manual'
  });
async function signIn(account, loginPath = '/login') {
  const response = await fetch(origin + loginPath, {
    method: 'POST',
    headers: { Accept: 'text/html', Origin: origin },
    body: new URLSearchParams({ account }),
    redirect: 'manual'
  });
  assert.equal(response.status, 303);
  return response;
}
const login = async (account) => (await signIn(account)).headers.get('set-cookie').split(';')[0];

test('Student profile opens the grouped cabinet and every menu section has a private route', async () => {
  const student = await login('student2');
  for (const [path, heading] of [
    ['/overview', 'Здравствуйте, Егор'],
    ['/schedule', 'Расписание'],
    ['/grades', 'Успеваемость']
  ]) {
    const response = await get(path, student);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, new RegExp(`<h1[^>]*>${heading}</h1>`));
    assert.match(
      html,
      /<a href="\/profile" class="account[^"]*" aria-label="Личный кабинет студента:/
    );
    assert.match(html, /aria-label="Главная навигация"/);
    assert.doesNotMatch(
      html,
      /aria-label="Разделы кабинета"|id="deka-cabinet"|id="profile-services"/
    );
    assert.equal([...html.matchAll(/<main\b/g)].length, 1, path);
  }
  const response = await get('/profile', student);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const profile = await response.text();
  assert.match(profile, /id="deka-cabinet"/);
  assert.match(profile, /Информация об обучении/);
  assert.match(profile, /id="profile-services"[^>]*>Сервисы<\/h2>/);
  assert.match(profile, /href="\/student-card"/);
  assert.match(profile, /href="\/campus"/);
  assert.equal([...profile.matchAll(/<main\b/g)].length, 1);
  assert.match(profile, /Яров Егор Аркадьевич/);
  assert.doesNotMatch(profile, /Северин Максим Львович|Нет академических задолженностей/);
  for (const group of cabinetGroups) assert.ok(profile.includes(group.label));
  for (const [id, label] of Object.entries(cabinetSections)) {
    const path = cabinetPath(id);
    if (cabinetGroups.some((group) => group.sections.includes(id)) || id === 'news')
      assert.ok(profile.includes(path), path);
    const section = await get(path, student);
    assert.equal(section.status, 200, path);
    assert.match(section.headers.get('cache-control'), /no-store/);
    const body = await section.text();
    assert.match(body, new RegExp(`<h1[^>]*>${label}</h1>`), label);
    if (cabinetGroups.some((group) => group.sections.includes(id))) {
      assert.match(body, /<details[^>]*open[^>]*>/, label);
      assert.ok(body.includes(`href="${path}" aria-current="page"`), path);
    }
  }
  assert.equal((await get('/profile/unknown-cabinet-page', student)).status, 404);
});

test('The campus map builds a signed-in student route and handles invalid links', async () => {
  const route = '/campus?from=entrance&to=room-402&mode=step-free';
  const anonymous = await get(route);
  assert.equal(anonymous.status, 303);
  const signedIn = await signIn('student', anonymous.headers.get('location'));
  assert.equal(signedIn.headers.get('location'), route);
  const external = await signIn(
    'student',
    '/login?next=' + encodeURIComponent('//outside.example/campus')
  );
  assert.equal(external.headers.get('location'), '/overview');
  const student = signedIn.headers.get('set-cookie').split(';')[0];
  const response = await get(route, student);
  assert.equal(response.status, 200);
  const plan = await response.text();
  assert.match(plan, /Как пройти/);
  assert.match(plan, /Карта МГИМО/);
  assert.match(plan, /class="drawing/);
  assert.match(plan, /Главный вход/);
  assert.match(plan, /Аудитория 402/);
  assert.match(plan, /Лифт/);
  assert.doesNotMatch(plan, /Учебная схема|Доступна новая версия Деки|footer-dot/);
  const actual = await get('/campus/mgimo/n-4.svg', student);
  assert.equal(actual.status, 200);
  assert.match(actual.headers.get('content-type'), /image\/svg/);
  assert.match(await actual.text(), /id="n402"/);
  const matches = await get('/campus/places?q=402', student);
  assert.match((await matches.json())[0], /Аудитория 402 · Новый корпус/);
  const badLink = await (await get('/campus?from=entrance&to=unknown', student)).text();
  assert.match(badLink, /Место не найдено однозначно/);
  assert.doesNotMatch(badLink, /<h2[^>]*>Как пройти<\/h2>/);
});

test('Cabinet sections respect role, reuse real records and label unavailable integrations', async () => {
  const student = await login('student');
  const teacher = await login('teacher');
  assert.equal((await get('/profile/gradebook')).status, 303);
  assert.equal((await get('/profile/gradebook', teacher)).status, 403);
  assert.doesNotMatch(await (await get('/profile', teacher)).text(), /id="deka-cabinet"/);
  const book = await (await get('/profile/gradebook', student)).text();
  assert.match(book, /Архитектура информационных систем/);
  assert.doesNotMatch(book, /Яров Егор Аркадьевич/);
  const teachers = await (await get('/profile/teachers', student)).text();
  assert.match(teachers, /Михаил Соколов/);
  const privateRequests = await (await get('/profile/applications', student)).text();
  assert.match(privateRequests, /Справка о стипендии/);
  assert.doesNotMatch(privateRequests, /verification_code/);
  const payments = await (await get('/profile/payments', student)).text();
  assert.match(payments, /оплата онлайн пока недоступны/);
  assert.match(payments, /href="\/requests\/new"/);
});
