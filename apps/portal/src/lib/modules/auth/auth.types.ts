export type Role = 'student' | 'dean' | 'teacher' | 'admin';
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  faculty_id: string | null;
  faculty_name: string | null;
  group_id: string | null;
  group_name: string | null;
  course: number | null;
  program: string | null;
}
