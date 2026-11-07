#!/usr/bin/env node
/**
 * E2E-проверка "суверенитета данных" прототипа "Дека".
 *
 * Запуск: npm run e2e          (сервер должен работать; адрес: E2E_URL, по умолчанию http://127.0.0.1:3000)
 * Пример: E2E_URL=https://deka.example.ru npm run e2e
 *
 * Сценарий: health → вход студента и деканата → полный бэкап → студент подаёт заявку
 * → восстановление базы из бэкапа → сверка, что всё вернулось 1:1 (включая отказы 403/400).
 * Выход с кодом 1, если хотя бы одна проверка не прошла.
 */

const BASE = (process.env.E2E_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const PASSWORD = process.env.E2E_PASSWORD || "demo1234";

let passed = 0;
const failures = [];
function check(name, cond, extra = "") {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(name);
    console.log(`  ✗ ${name}${extra ? ` — ${extra}` : ""}`);
  }
}

function cookieFrom(res) {
  const m = (res.headers.get("set-cookie") || "").match(/deka_session=[^;]+/);
  return m ? m[0] : "";
}

async function login(loginName) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: loginName, password: PASSWORD }),
  });
  return { res, cookie: cookieFrom(res) };
}

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return await r.json();
    } catch {
      /* ещё не поднялся */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Сервер ${BASE} не отвечает (проверьте /api/health)`);
}

async function main() {
  console.log(`E2E "Дека": проверяем ${BASE}\n`);

  // 0) Сервер жив
  const health = await waitForServer();
  check("health: ok=true, база доступна", health.ok === true && health.db === "ok", JSON.stringify(health));

  // 1) Входы
  const student = await login("student1");
  check("вход студента student1", student.res.ok && student.cookie, `HTTP ${student.res.status}`);
  const staff = await login("dekanat");
  check("вход сотрудника dekanat", staff.res.ok && staff.cookie, `HTTP ${staff.res.status}`);

  // 2) Студенту нельзя в полный бэкап и восстановление
  const stuBackup = await fetch(`${BASE}/api/backup`, { headers: { cookie: student.cookie } });
  check("студент получает 403 на /api/backup", stuBackup.status === 403, `HTTP ${stuBackup.status}`);
  const stuRestore = await fetch(`${BASE}/api/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: student.cookie },
    body: JSON.stringify({ format: "deka-backup", confirm: "REPLACE", data: {} }),
  });
  check("студент получает 403 на /api/restore", stuRestore.status === 403, `HTTP ${stuRestore.status}`);

  // 3) Полный бэкап до мутации
  const b1 = await fetch(`${BASE}/api/backup`, { headers: { cookie: staff.cookie } });
  const backup1 = await b1.json();
  check("dekanat скачивает полный бэкап", b1.ok && backup1.format === "deka-backup" && backup1.data.users.length > 0, `HTTP ${b1.status}`);
  const counts1 = backup1.counts;

  // 4) Состояние заявок студента до эксперимента
  const rq0 = await (await fetch(`${BASE}/api/requests`, { headers: { cookie: student.cookie } })).json();
  const myCountBefore = rq0.requests.length;

  // 5) Мутация: студент подаёт новую заявку
  const type = rq0.types?.[0];
  const created = await fetch(`${BASE}/api/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: student.cookie },
    body: JSON.stringify({ typeCode: type?.code ?? "SPR-UCHED", comment: "E2E-проверка восстановления" }),
  });
  const createdBody = await created.json();
  check("студент подаёт новую заявку (мутация)", created.ok && createdBody.ok === true, createdBody.error || `HTTP ${created.status}`);

  const counts2 = (await (await fetch(`${BASE}/api/backup`, { headers: { cookie: staff.cookie } })).json()).counts;
  check("после мутации заявок стало на 1 больше", counts2.serviceRequests === counts1.serviceRequests + 1, `${counts1.serviceRequests} → ${counts2.serviceRequests}`);

  // 6) Некорректный файл отказаывается (формат не тот)
  const bad = await fetch(`${BASE}/api/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: staff.cookie },
    body: JSON.stringify({ format: "deka-personal-data", confirm: "REPLACE", data: {} }),
  });
  check("чужой формат файла отклонён (400)", bad.status === 400, `HTTP ${bad.status}`);

  // 7) Восстановление исходного бэкапа
  const restored = await fetch(`${BASE}/api/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: staff.cookie },
    body: JSON.stringify({ ...backup1, confirm: "REPLACE" }),
  });
  const restoredBody = await restored.json();
  check("восстановление из бэкапа проходит", restored.ok && restoredBody.ok === true, restoredBody.error || `HTTP ${restored.status}`);

  // 8) Сверка: база вернулась 1:1
  const counts3 = (await (await fetch(`${BASE}/api/backup`, { headers: { cookie: staff.cookie } })).json()).counts;
  const same = Object.keys(counts1).every((k) => counts1[k] === counts3[k]);
  check("счётчики всех таблиц совпадают с бэкапом", same, JSON.stringify({ до: counts1, после: counts3 }));

  const rq1 = await (await fetch(`${BASE}/api/requests`, { headers: { cookie: student.cookie } })).json();
  check("тестовая заявка исчезла после восстановления", rq1.requests.length === myCountBefore, `${myCountBefore} → ${rq1.requests.length}`);

  // 9) Личная выгрузка студента по-прежнему работает
  const exp = await fetch(`${BASE}/api/export`, { headers: { cookie: student.cookie } });
  const expBody = await exp.json();
  check("экспорт личных данных студента работает", exp.ok && expBody.format === "deka-personal-data", `HTTP ${exp.status}`);

  // Итог
  console.log(`\nИтог: ${passed} проверок пройдено${failures.length ? `, НЕ ПРОЙДЕНО: ${failures.length}` : " — всё в порядке."}`);
  if (failures.length) {
    console.log("Упавшие проверки:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`✗ E2E не выполнен: ${err.message}`);
  process.exit(1);
});
