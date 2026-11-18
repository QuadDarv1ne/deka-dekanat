import type { Assessment, FocusItem, StudyAdvice, StudyGrade } from './study-plan.types.ts';

export const DAY_MS = 86_400_000;
export const MINUTE_MS = 60_000;
export const PASSING_SCORE = 55;
const MAX_FOCUS_ITEMS = 4;

export function studyFocus(
  grades: StudyGrade[],
  assessments: Assessment[],
  now: number
): FocusItem[] {
  const open = assessments
    .filter((item) => !item.marked_ready && Date.parse(item.starts_at) > now)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const bySubject = new Map<string, Omit<FocusItem, 'key'>>();
  for (const item of open) {
    if (!bySubject.has(item.subject_id)) {
      bySubject.set(item.subject_id, {
        subject: item.subject,
        points: item.points,
        assessment: { id: item.id, kind: item.kind, starts_at: item.starts_at }
      });
    }
  }
  for (const grade of grades) {
    if (grade.points < PASSING_SCORE && !bySubject.has(grade.subject_id)) {
      bySubject.set(grade.subject_id, {
        subject: grade.subject,
        points: grade.points,
        assessment: null
      });
    }
  }

  function priority(item: Omit<FocusItem, 'key'>) {
    if (item.assessment && Date.parse(item.assessment.starts_at) - now <= 7 * DAY_MS) return 0;
    if (item.points !== null && item.points < PASSING_SCORE) return 1;
    return 2;
  }

  // The source orders assessments by start and grades by score.
  const focus = [...bySubject.values()].sort((a, b) => priority(a) - priority(b));
  if (focus.length === 0) {
    focus.push(
      ...grades.slice(0, MAX_FOCUS_ITEMS).map((grade) => ({
        subject: grade.subject,
        points: grade.points,
        assessment: null
      }))
    );
  }
  return focus.slice(0, MAX_FOCUS_ITEMS).map((item, index) => ({ ...item, key: index + 1 }));
}

export function fallbackAdvice(item: FocusItem): string {
  if (item.points !== null && item.points < PASSING_SCORE) {
    return 'Сверьте пропущенные работы и попросите преподавателя уточнить, за что можно добрать баллы.';
  }
  if (item.assessment) {
    return 'Уточните список тем. Выпишите три сложных вопроса и попробуйте ответить на них без конспекта.';
  }
  return 'Решите одну задачу по последней теме без подсказок и разберите ошибки.';
}

export function parseStudyAdvice(raw: string, focus: FocusItem[]): StudyAdvice | null {
  const json = raw.trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i, '$1');
  let input: unknown;
  try {
    input = JSON.parse(json);
  } catch {
    return null;
  }
  if (!Array.isArray(input) || input.length !== focus.length) return null;
  const expected = new Set(focus.map((item) => item.key));
  const advice: StudyAdvice = {};
  for (const row of input) {
    if (
      !row ||
      !Number.isInteger(row.id) ||
      !expected.delete(row.id) ||
      typeof row.step !== 'string'
    ) {
      return null;
    }
    const text = row.step.trim();
    if (
      text.length < 12 ||
      text.length > 240 ||
      /[\u0000-\u001f\u007f<>]|https?:\/\//i.test(text)
    ) {
      return null;
    }
    advice[row.id] = text;
  }
  return advice;
}
