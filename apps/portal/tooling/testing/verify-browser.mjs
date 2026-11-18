import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const origin = process.env.TEST_ORIGIN;
const chrome = process.env.DEKA_CHROME_PATH;
if (origin !== 'http://127.0.0.1:5182' || !chrome) {
  throw new Error('Run browser verification via the isolated test runner with DEKA_CHROME_PATH.');
}
const output = fileURLToPath(new URL('../../../../var/reports/browser/', import.meta.url));
await mkdir(output, { recursive: true });
const profile = await mkdtemp(path.join(output, 'chrome-'));
const browser = spawn(
  chrome,
  [
    '--headless=new',
    '--disable-background-networking',
    '--disable-extensions',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=0',
    '--user-data-dir=' + profile,
    'about:blank'
  ],
  { windowsHide: true, stdio: 'ignore' }
);
let browserError;
browser.on('error', (caught) => {
  browserError = caught;
});
let socket;
const pending = new Map();
let requestId = 0;
const results = [];
const errors = [];

async function until(check, description) {
  for (let tries = 0; tries < 100; tries++) {
    try {
      const value = await check();
      if (value) return value;
    } catch (error) {
      if (!/execution context|context with specified id/i.test(error.message)) throw error;
    }
    await delay(100);
  }
  throw new Error('Timed out: ' + description);
}
function send(method, params = {}) {
  const id = ++requestId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('DevTools timed out: ' + method));
    }, 10000);
    pending.set(id, (reply) => {
      clearTimeout(timer);
      if (reply.error) reject(new Error(method + ': ' + reply.error.message));
      else resolve(reply.result);
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const reply = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.text + ': ' + expression);
  return reply.result.value;
}
const exists = (selector) => evaluate('!!document.querySelector(' + JSON.stringify(selector) + ')');
const pathname = () => evaluate('location.pathname');
async function visit(route, selector) {
  const destination = new URL(route, origin);
  await send('Page.navigate', { url: destination.href });
  await until(
    async () =>
      (await evaluate('location.href')) === destination.href &&
      (await evaluate('document.readyState === "complete"')) &&
      (await exists(selector)),
    route
  );
  await evaluate('document.fonts.ready.then(() => true)');
}
async function tap(selector) {
  const point = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`);
  assert.ok(point, selector);
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
async function layout(name, width, screenshot = false) {
  await evaluate('document.fonts.ready.then(() => true)');
  const metrics = await evaluate(`({
    width: window.innerWidth,
    layoutWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    landmarks: document.querySelectorAll('main').length,
    quickNav: document.querySelector('.mobile-student-nav') ? getComputedStyle(document.querySelector('.mobile-student-nav')).display : null,
    heading: document.querySelector('h1')?.textContent
  })`);
  assert.equal(metrics.width, width, name);
  assert.ok(
    metrics.scrollWidth <= metrics.layoutWidth + 1,
    name + ' overflows horizontally: ' + JSON.stringify(metrics)
  );
  assert.equal(metrics.landmarks, 1, name);
  assert.equal(
    metrics.quickNav,
    name.endsWith('-login') ? null : width <= 800 ? 'grid' : 'none',
    name
  );
  results.push({ name, ...metrics });
  if (screenshot) {
    const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    await writeFile(path.join(output, name + '.png'), Buffer.from(data, 'base64'));
  }
}

try {
  const port = await until(async () => {
    if (browserError) throw browserError;
    if (browser.exitCode !== null) throw new Error('Chrome exited with code ' + browser.exitCode);
    try {
      return (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split(/\r?\n/)[0];
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }, 'Chrome debugging port');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', ({ data }) => {
    const reply = JSON.parse(data);
    if (reply.id) {
      pending.get(reply.id)?.(reply);
      pending.delete(reply.id);
    } else if (reply.method === 'Runtime.exceptionThrown') {
      errors.push(
        reply.params.exceptionDetails.exception?.description ?? reply.params.exceptionDetails.text
      );
    }
  });
  await send('Page.enable');
  await send('Network.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 940,
    deviceScaleFactor: 1,
    mobile: false
  });
  await visit('/login', 'form:has(input[value="student"]) button');
  await layout('desktop-login', 1440, true);
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await layout('mobile-login', 390, true);
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 940,
    deviceScaleFactor: 1,
    mobile: false
  });
  assert.equal(
    await evaluate('document.querySelector("input[name=email]").placeholder'),
    'name@mgimo.ru'
  );
  assert.equal(await exists('.copyright, .update'), false);
  await evaluate('document.querySelector(\'form:has(input[value="student"]) button\').click()');
  await until(
    async () => (await pathname()) === '/overview' && (await exists('.hero')),
    'student quick login'
  );
  assert.equal(await exists('.page-footer, .version, .update'), false);
  await layout('desktop-overview', 1440, true);
  for (const route of ['/grades', '/schedule', '/profile']) {
    await visit(route, 'h1');
    await layout('desktop-' + route.slice(1), 1440, true);
  }
  await visit('/campus?from=308&to=402', '#steps-heading');
  await layout('desktop-campus', 1440, true);

  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await visit('/overview', '.hero');
  await layout('mobile-overview', 390, true);
  await tap('.mobile-student-nav a[href="/schedule"]');
  await until(
    async () => (await pathname()) === '/schedule' && (await exists('.days button')),
    'mobile schedule'
  );
  if (await exists('.days button:not([aria-pressed="true"])')) {
    const next = await evaluate(
      `document.querySelector('.days button:not([aria-pressed="true"])').getAttribute('aria-label')`
    );
    await tap('.days button[aria-label=' + JSON.stringify(next) + ']');
    await until(
      () => exists('.days button[aria-label=' + JSON.stringify(next) + '][aria-pressed="true"]'),
      'switch schedule day'
    );
  }
  // The upcoming classes have numbered rooms. A past lab may have a free-text location.
  await visit('/schedule', '.room-link');
  await layout('mobile-schedule', 390, true);
  await tap('.room-link');
  await until(
    async () => (await pathname()) === '/campus' && (await exists('.drawing img')),
    'route from a class'
  );
  await visit('/campus', '.planner');
  await tap('input[name="from"]');
  await send('Input.insertText', { text: '308' });
  await until(() => exists('#places-from option'), 'room autocomplete');
  await tap('input[name="to"]');
  await send('Input.insertText', { text: '402' });
  await tap('.planner button[type="submit"]');
  await until(() => exists('#steps-heading'), 'build route from room numbers');
  assert.ok(await exists('.route-line'));
  await tap('.editor summary');
  await tap('input[name="mode"]');
  await tap('.planner button[type="submit"]');
  await until(
    () =>
      evaluate(
        'location.search.includes("mode=lift") && document.querySelector(".directions")?.textContent.includes("Лифт")'
      ),
    'campus lift route'
  );
  await tap('.floors a[aria-label="4 этаж"]');
  await until(
    () => exists('.floors a[aria-label="4 этаж"][aria-current="page"]'),
    'show destination floor'
  );
  assert.ok(
    await evaluate('document.querySelector(".drawing img").getAttribute("src").endsWith("n-4.svg")')
  );
  await tap('button[aria-label="Увеличить масштаб"]');
  await until(
    () =>
      evaluate(
        'document.querySelector(".viewport").scrollWidth > document.querySelector(".viewport").clientWidth'
      ),
    'zoom the floor plan'
  );
  await tap('button[aria-label="Уменьшить масштаб"]');
  await evaluate('window.scrollTo(0, document.querySelector(".plan-card").offsetTop - 10)');
  await layout('mobile-campus', 390, true);
  await tap('.account[href="/profile"]');
  await until(
    async () => (await pathname()) === '/profile' && (await exists('#profile-services')),
    'profile from the header'
  );
  await layout('mobile-profile', 390, true);
  await tap('.services-jump');
  await until(() => evaluate('location.hash === "#profile-services"'), 'profile services shortcut');
  await layout('mobile-services', 390, true);
  await tap('main a[href="/student-card"]');
  await until(
    async () => (await pathname()) === '/student-card' && (await exists('main img')),
    'student QR'
  );
  await layout('mobile-student-card', 390);
  await visit('/requests/00000000-0000-4000-8000-000000000030', '#request-conversation textarea');
  await tap('#request-message');
  const message = 'Проверка с телефона: когда можно забрать документ?';
  await send('Input.insertText', { text: message });
  await tap('#request-conversation button');
  await until(
    () =>
      evaluate(
        `document.querySelector('#request-conversation ol')?.textContent.includes(${JSON.stringify(message)})`
      ),
    'send a request message'
  );
  await evaluate('document.querySelector("#request-conversation").scrollIntoView()');
  await layout('mobile-conversation', 390, true);
  await visit('/grades', '.grade-search');
  await tap('.grade-search');
  await send('Input.insertText', { text: 'Базы данных' });
  await until(
    () =>
      evaluate(
        'document.querySelectorAll(".data-table tbody tr").length === 1 && document.querySelector(".data-table tbody").textContent.includes("Базы данных")'
      ),
    'filter grades'
  );
  await layout('mobile-grades', 390, true);

  await send('Emulation.setDeviceMetricsOverride', {
    width: 320,
    height: 740,
    deviceScaleFactor: 1,
    mobile: true
  });
  for (const route of [
    '/overview',
    '/schedule',
    '/grades',
    '/requests',
    '/profile',
    '/assistant',
    '/campus'
  ]) {
    await visit(route, 'h1');
    await layout('narrow-' + route.slice(1), 320);
  }
  assert.deepEqual(errors, [], 'Unhandled browser errors');
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  await writeFile(
    path.join(output, 'verification.json'),
    JSON.stringify({ browser: version.Browser, results, errors }, null, 2)
  );
  console.log(
    'Browser verification passed at 1440px, 390px and 320px, with student login, navigation, QR and message submission.'
  );
} catch (error) {
  if (socket?.readyState === WebSocket.OPEN) {
    try {
      const state = await evaluate(
        `({ path: location.pathname, heading: document.querySelector('h1')?.textContent, status: document.querySelector('[role="alert"]')?.textContent })`
      );
      console.error('Browser state:', JSON.stringify(state), 'Runtime errors:', errors);
      const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
      await writeFile(path.join(output, 'failure.png'), Buffer.from(data, 'base64'));
    } catch {}
  }
  throw error;
} finally {
  socket?.close();
  if (browser.pid && browser.exitCode === null && browser.signalCode === null) {
    const closed = new Promise((resolve) => browser.once('exit', resolve));
    browser.kill();
    await closed;
  }
  if (
    path.dirname(profile) === path.resolve(output) &&
    path.basename(profile).startsWith('chrome-')
  )
    await rm(profile, { recursive: true, force: true, maxRetries: 6, retryDelay: 150 });
}
