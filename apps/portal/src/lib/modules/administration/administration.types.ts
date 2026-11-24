import type { Role } from '#modules/auth/auth.types.ts';
export interface AccountSummary {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  group_name: string | null;
  active: boolean;
}
export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  entity_id: string;
  created_at: string;
  metadata: Record<string, unknown>;
}
