import { query } from '#server/database/postgres.ts';
import type { AccountSummary, AuditEvent } from '../administration.types';
export async function accounts() {
  return (
    await query<AccountSummary>(
      `SELECT u.id,u.full_name,u.email,u.role,g.name group_name,u.active FROM users u LEFT JOIN study_groups g ON g.id=u.group_id ORDER BY u.role,u.full_name LIMIT 200`
    )
  ).rows;
}
export async function auditEvents() {
  return (
    await query<AuditEvent>(
      `SELECT a.*,u.full_name actor FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 100`
    )
  ).rows;
}
export async function systemStats() {
  return (
    await query<{ users: string; sessions: string; events: string }>(
      `SELECT (SELECT count(*) FROM users WHERE active) users,(SELECT count(*) FROM sessions WHERE expires_at>now()) sessions,(SELECT count(*) FROM audit_log) events`
    )
  ).rows[0];
}
