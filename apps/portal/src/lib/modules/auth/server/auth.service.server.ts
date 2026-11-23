import { error, redirect, type Cookies } from '@sveltejs/kit';
import { query, transaction } from '#server/database/postgres.ts';
import { hashToken, newToken, verifyPassword } from '#server/security/credentials.mjs';
import type { Role, User } from '#modules/auth/auth.types.ts';
import { previewAccounts } from '../preview-accounts.ts';

const userSelect = `SELECT u.id,u.email,u.full_name,u.role,u.faculty_id,f.name faculty_name,u.group_id,g.name group_name,g.course,g.program
 FROM users u LEFT JOIN faculties f ON f.id=u.faculty_id LEFT JOIN study_groups g ON g.id=u.group_id`;
const cookieName = 'deka_session';
const duration = 60 * 60 * 12;

export function isLocalDemo(url: URL) {
  // DEMO_MODE=true enables the demo seed accounts (@deka.test emails) and the
  // quick sign-in buttons. The original code restricted this to localhost only;
  // we extend it to also accept the public deployment hosts (Z.ai sandbox, Fly.io,
  // Railway, Render, any other PaaS) so the demo can be evaluated through the
  // public preview URL.
  // Setting DEMO_ALLOW_ANY_HOST=true removes the hostname check entirely.
  if (process.env.DEMO_MODE !== 'true') return false;
  if (process.env.DEMO_ALLOW_ANY_HOST === 'true') return true;
  const host = url.hostname;
  return (
    host === '127.0.0.1' ||
    host === 'localhost' ||
    host.endsWith('.space-z.ai') ||
    host.endsWith('.fly.dev') ||
    host.endsWith('.up.railway.app') ||
    host.endsWith('.onrender.com') ||
    host.endsWith('.localhost')
  );
}

export async function sessionUser(cookies: Cookies, url: URL): Promise<User | null> {
  const token = cookies.get(cookieName);
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const result = await query<User>(
    `${userSelect} JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active AND ($2 OR u.email NOT LIKE '%@deka.test')`,
    [hashToken(token), isLocalDemo(url)]
  );
  if (!result.rowCount) cookies.delete(cookieName, { path: '/' });
  return result.rows[0] ?? null;
}

export async function signIn(
  email: string,
  password: string,
  cookies: Cookies,
  url: URL
): Promise<boolean> {
  const key = hashToken(email);
  const account = await transaction(async (db) => {
    await db.query(
      `INSERT INTO login_limits(key_hash,failures,window_start) VALUES($1,0,now()) ON CONFLICT DO NOTHING`,
      [key]
    );
    const limit = await db.query(
      "SELECT *, window_start<now()-interval '15 minutes' expired FROM login_limits WHERE key_hash=$1 FOR UPDATE",
      [key]
    );
    if (limit.rows[0].expired)
      await db.query('UPDATE login_limits SET failures=0,window_start=now() WHERE key_hash=$1', [
        key
      ]);
    else if (limit.rows[0].failures >= 8) return null;
    const found = await db.query(
      "SELECT id,password_hash FROM users WHERE email=$1 AND active AND ($2 OR email NOT LIKE '%@deka.test')",
      [email, isLocalDemo(url)]
    );
    // Fixed dummy scrypt work also applies to unknown accounts.
    const encoded =
      found.rows[0]?.password_hash ?? 'scrypt$00000000000000000000000000000000$' + '00'.repeat(64);
    if (!(await verifyPassword(password, encoded)) || !found.rowCount) {
      await db.query('UPDATE login_limits SET failures=failures+1 WHERE key_hash=$1', [key]);
      return null;
    }
    await db.query('DELETE FROM login_limits WHERE key_hash=$1', [key]);
    return found.rows[0];
  });
  if (!account) return false;
  await createSession(account.id, cookies, url.protocol === 'https:');
  return true;
}

async function createSession(userId: string, cookies: Cookies, secure: boolean) {
  const token = newToken();
  await query(
    "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '12 hours')",
    [hashToken(token), userId]
  );
  cookies.set(cookieName, token, {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: duration
  });
}

export async function quickSignIn(code: string, cookies: Cookies, url: URL) {
  if (!isLocalDemo(url)) return false;
  const account = previewAccounts.find((item) => item.code === code);
  if (!account) return false;
  const result = await query('SELECT id FROM users WHERE email=$1 AND role=$2 AND active', [
    `${account.code}@deka.test`,
    account.role
  ]);
  if (!result.rowCount) return false;
  await createSession(result.rows[0].id, cookies, url.protocol === 'https:');
  return true;
}

export async function signOut(cookies: Cookies) {
  const token = cookies.get(cookieName);
  if (token) await query('DELETE FROM sessions WHERE token_hash=$1', [hashToken(token)]);
  cookies.delete(cookieName, { path: '/' });
}
export function requireUser(user: User | null): User {
  if (!user) redirect(303, '/login');
  return user as User;
}
export function requireRole(user: User | null, ...roles: Role[]): User {
  const current = requireUser(user);
  if (!roles.includes(current.role)) error(403, 'Для этого действия недостаточно прав.');
  return current;
}
