const BASE = "http://127.0.0.1:3000";

let passed = 0;
const failures = [];
function check(name, cond, extra = "") {
  if (cond) { passed++; console.log(`  OK  ${name}`); }
  else { failures.push(name); console.log(`  FAIL ${name}${extra ? " -- " + extra : ""}`); }
}

async function login(user) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: user, password: "demo1234" }),
  });
  const setc = res.headers.get("set-cookie") || "";
  const m = setc.match(/deka_session=[^;]+/);
  return { res, cookie: m ? m[0] : "" };
}

async function get(path, cookie) {
  const res = await fetch(`${BASE}${path}`, { headers: { cookie } });
  let body = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("json")) body = await res.json().catch(() => null);
  else body = (await res.text().catch(() => "")).slice(0, 200);
  return { status: res.status, body };
}

const stu = await login("student1");
const staff = await login("dekanat");
check("login student1", stu.res.ok && stu.cookie, `HTTP ${stu.res.status}`);
check("login dekanat", staff.res.ok && staff.cookie, `HTTP ${staff.res.status}`);

const studentPaths = [
  "/api/home", "/api/schedule", "/api/grades", "/api/requests",
  "/api/notifications", "/api/export",
];
for (const p of studentPaths) {
  const r = await get(p, stu.cookie);
  check(`GET ${p} (student)`, r.status === 200, `HTTP ${r.status}`);
}

const staffPaths = [
  "/api/staff/requests", "/api/staff/students",
  "/api/staff/schedule", "/api/staff/announcements",
];
for (const p of staffPaths) {
  const r = await get(p, staff.cookie);
  check(`GET ${p} (staff)`, r.status === 200, `HTTP ${r.status}`);
}

const forbidden = ["/api/staff/requests", "/api/staff/students", "/api/backup"];
for (const p of forbidden) {
  const r = await get(p, stu.cookie);
  check(`GET ${p} student -> 403`, r.status === 403, `HTTP ${r.status}`);
}

const anon = await get("/api/home", "");
check("GET /api/home anonymous -> 401", anon.status === 401, `HTTP ${anon.status}`);

const pages = ["/", "/verify", "/download", "/manifest.webmanifest", "/sw.js", "/offline"];
for (const p of pages) {
  const res = await fetch(`${BASE}${p}`);
  check(`GET ${p} page`, res.ok, `HTTP ${res.status}`);
}

const badLogin = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ login: "student1", password: "wrong-password" }),
});
check("wrong password rejected", badLogin.status >= 400 && badLogin.status < 500, `HTTP ${badLogin.status}`);

console.log(`\nItog: ${passed} OK, ${failures.length} FAIL`);
if (failures.length) { failures.forEach(f => console.log(" - " + f)); process.exit(1); }
