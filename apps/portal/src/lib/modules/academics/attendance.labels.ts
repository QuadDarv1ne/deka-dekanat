import type { AttendanceValue } from './attendance.types.ts';

export const attendanceLabels: Record<AttendanceValue, string> = {
  unmarked: 'Нет отметки',
  present: 'Был',
  absent: 'Пропуск',
  excused: 'Уважительная причина'
};
