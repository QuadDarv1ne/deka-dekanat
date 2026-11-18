import type { User } from '#modules/auth/auth.types.ts';
import { studyAssessments } from '#modules/study-plan/server/study-plan.repository.server.ts';
import { unreadPreview } from '#modules/notifications/server/unread-preview.repository.server.ts';
import { readyStudentRequests } from '#modules/requests/server/ready-requests.repository.server.ts';
import { studentAttendance } from '#modules/academics/server/attendance.repository.server.ts';
import { countAttendance } from '#modules/academics/student-progress.policy.ts';

export async function studentHome(user: User) {
  const [assessments, alerts, ready, attendance] = await Promise.all([
    studyAssessments(user),
    unreadPreview(user.id),
    readyStudentRequests(user),
    studentAttendance(user)
  ]);
  return {
    assessments: assessments.slice(0, 4),
    alerts,
    ready,
    attendance: countAttendance(attendance),
    now: Date.now()
  };
}
