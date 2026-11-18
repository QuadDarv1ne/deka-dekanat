import type { Role } from './auth.types';
export const roleNames: Record<Role, string> = {
  student: 'Студент',
  dean: 'Сотрудник деканата',
  teacher: 'Преподаватель',
  admin: 'Администратор'
};
