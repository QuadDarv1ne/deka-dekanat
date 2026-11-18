import type { User } from '#modules/auth/auth.types.ts';
import { unreadPreview } from '#modules/notifications/server/unread-preview.repository.server.ts';
import {
  studyGrades,
  studyAssessments
} from '#modules/study-plan/server/study-plan.repository.server.ts';
import { PASSING_SCORE } from '#modules/study-plan/study-plan.policy.ts';

export async function cabinetProfile(user: User) {
  const [alerts, grades, assessments] = await Promise.all([
    unreadPreview(user.id),
    studyGrades(user),
    studyAssessments(user)
  ]);
  return {
    alerts,
    scored: grades.length,
    below: grades.filter((grade) => grade.points < PASSING_SCORE).length,
    next: assessments[0] ?? null
  };
}
