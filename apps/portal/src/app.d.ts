import type { User } from '#modules/auth/auth.types.ts';
declare global {
  namespace App {
    interface Locals {
      user: User | null;
      database: 'ok' | 'unavailable';
    }
  }
}
export {};
