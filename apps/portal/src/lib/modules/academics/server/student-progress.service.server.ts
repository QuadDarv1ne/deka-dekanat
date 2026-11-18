import type { User } from '#modules/auth/auth.types.ts';
import {
  studyGrades,
  studyAssessments
} from '#modules/study-plan/server/study-plan.repository.server.ts';
import { courseProgress } from '../student-progress.policy.ts';
import { studentAttendance } from './attendance.repository.server.ts';

export async function studentProgress(user: User) {
  const [grades, assessments, attendance] = await Promise.all([
    studyGrades(user),
    studyAssessments(user),
    studentAttendance(user)
  ]);
  return courseProgress(grades, assessments, attendance);
}
