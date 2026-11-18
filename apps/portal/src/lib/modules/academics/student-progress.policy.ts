import { PASSING_SCORE } from '#modules/study-plan/study-plan.policy.ts';
import type { Assessment, StudyGrade } from '#modules/study-plan/study-plan.types.ts';
import type { AttendanceEntry, AttendanceStatus } from './attendance.types.ts';
import type { AttendanceCounts, CourseProgress } from './student-progress.types.ts';

const emptyCounts = (): AttendanceCounts => ({ present: 0, absent: 0, excused: 0, unmarked: 0 });

export function countAttendance(entries: { status: AttendanceStatus | null }[]) {
  const counts = emptyCounts();
  for (const entry of entries) counts[entry.status ?? 'unmarked']++;
  return counts;
}

export function courseProgress(
  grades: StudyGrade[],
  assessments: Assessment[],
  attendance: AttendanceEntry[]
) {
  const courses = new Map<string, CourseProgress>();
  function course(id: string, subject: string) {
    const existing = courses.get(id);
    if (existing) return existing;
    const entry: CourseProgress = {
      id,
      subject,
      points: null,
      gap: null,
      assessment: null,
      attendance: emptyCounts()
    };
    courses.set(id, entry);
    return entry;
  }
  for (const grade of grades) {
    const entry = course(grade.subject_id, grade.subject);
    entry.points = grade.points;
    entry.gap = Math.max(0, PASSING_SCORE - grade.points);
  }
  for (const exam of assessments) {
    const entry = course(exam.subject_id, exam.subject);
    if (!entry.assessment || exam.starts_at < entry.assessment.starts_at) {
      entry.assessment = {
        id: exam.id,
        kind: exam.kind,
        starts_at: exam.starts_at,
        marked_ready: exam.marked_ready
      };
    }
  }
  for (const item of attendance) {
    course(item.subject_id, item.subject).attendance[item.status ?? 'unmarked']++;
  }
  return [...courses.values()].sort((a, b) => {
    const gap = (b.gap ?? 0) - (a.gap ?? 0);
    if (gap) return gap;
    const aStart = a.assessment ? Date.parse(a.assessment.starts_at) : Infinity;
    const bStart = b.assessment ? Date.parse(b.assessment.starts_at) : Infinity;
    if (aStart !== bStart) return aStart - bStart;
    return a.subject.localeCompare(b.subject, 'ru');
  });
}
