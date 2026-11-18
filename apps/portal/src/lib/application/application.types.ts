import type { User } from '#modules/auth/auth.types.ts';
export interface ApplicationData {
  user: User;
  unread: number;
}
