import type { RequestStatus, RequestKind } from '#modules/requests/request.types.ts';
import type { Role } from '#modules/auth/auth.types.ts';
const next: Partial<Record<RequestStatus, RequestStatus[]>> = {
  new: ['in_progress', 'rejected'],
  in_progress: ['ready', 'rejected'],
  ready: ['done']
};
export const canIssueDocument = (kind: RequestKind) =>
  ['study', 'scholarship', 'tax'].includes(kind);
export const conversationOpen = (status: RequestStatus) =>
  status === 'new' || status === 'in_progress' || status === 'ready';
export function canTransition(role: Role, from: RequestStatus, to: RequestStatus): boolean {
  if (role === 'student') return from === 'new' && to === 'cancelled';
  return role === 'dean' && (next[from]?.includes(to) ?? false);
}
