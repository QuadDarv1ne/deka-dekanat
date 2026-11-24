export type ContextSection =
  'help' | 'schedule' | 'grades' | 'requests' | 'announcements' | 'attendance' | 'preparation';

function isFollowUp(question: string) {
  const normalized = question.toLocaleLowerCase('ru-RU');
  return /^(?:а\s|и\s|тогда\s|and\s|then\s|what about\b|that\b|those\b)|(?:^|[^\p{L}])(?:это|эти|этого|ещё|еще)(?:$|[^\p{L}])/u.test(
    normalized
  );
}

export function contextSections(
  question: string,
  previousQuestions: string[] = []
): Set<ContextSection> {
  const normalized = question.toLocaleLowerCase('ru-RU');
  const text = isFollowUp(question)
    ? previousQuestions.slice(-2).join(' ') + ' ' + normalized
    : normalized;
  const sections = new Set<ContextSection>();
  // The portal is Russian, but a student may still ask in English. Without the
  // English keywords the answer is generated with an empty cabinet context and
  // the model claims it has no access to the schedule.
  if (
    /распис|заняти|аудитор|пар[аыуе](?:\s|\?|$)|экзам|зач[её]т|аттестаци|(?:^|[^\p{L}\p{N}_])(?:schedule|timetable|class(?:es)?|lectures?|lessons?|exam(?:ination)?s?|deadlines?)(?:$|[^\p{L}\p{N}_])/u.test(
      text
    )
  )
    sections.add('schedule');
  if (
    /балл|оценк|успеваем|результат|задолж|пересдач|(?:^|[^\p{L}\p{N}_])(?:grades?|scores?|marks?|gpa)(?:$|[^\p{L}\p{N}_])/u.test(
      text
    )
  )
    sections.add('grades');
  if (
    /справк|заявлен|стипенд|обращени|документ|налог|(?:^|[^\p{L}\p{N}_])(?:certificates?|scholarships?|documents?|applications?(?!\s+of\b))(?:$|[^\p{L}\p{N}_])/u.test(
      text
    )
  ) {
    sections.add('help');
    if (
      /мо[ийяеё]|статус|готов|номер|№|когда|отправ|подал|status|ready|my|submitted|number/u.test(
        text
      )
    )
      sections.add('requests');
  }
  if (
    /объявлен|новост|деканат.*(?:работ|час|контакт)|(?:час|контакт).*деканат|announcement|news/u.test(
      text
    )
  )
    sections.add('announcements');
  if (/посещаем|пропуск|отсутств|attendance|absent|absence|missed/u.test(text))
    sections.add('attendance');
  if (
    /подготов|повтор|выуч|готовност|план.*уч[её]|(?:отмет|аттестаци).*готов|prepar|revise|revis|study plan/u.test(
      text
    )
  )
    sections.add('preparation');
  if (
    /что.*(?:срочн|важн|делать сегодня)|сводк|мой.*день|обзор.*кабинет|what.*(?:urgent|important)|summary|my day|overview/u.test(
      text
    )
  )
    for (const section of ['schedule', 'grades', 'requests', 'attendance', 'preparation'] as const)
      sections.add(section);
  return sections;
}

// Undefined: the text does not say which kind of lesson it means.
// Null: ordinary classes, so every upcoming kind stays relevant.
function mentionedLessonKinds(text: string): Array<'exam' | 'credit'> | null | undefined {
  const assessment = /аттестаци|assessment/iu.test(text);
  const exam =
    assessment ||
    /(?:^|[^\p{L}])(?:экзам\p{L}*|exam(?:ination)?s?|midterms?)(?:$|[^\p{L}])/iu.test(text);
  const credit =
    assessment || /(?:^|[^\p{L}])(?:зач[её]т\p{L}*|credits?)(?:$|[^\p{L}])/iu.test(text);
  if (exam || credit)
    return [...(exam ? (['exam'] as const) : []), ...(credit ? (['credit'] as const) : [])];
  if (/заняти|пар[аыуе](?:\s|\?|$)|class(?:es)?|lectures?|lessons?|распис/iu.test(text)) return null;
  return undefined;
}

// A question about an exam should not hand the model ordinary lectures.
// A short follow-up keeps the kind from the previous question unless it names another one.
export function lessonKindsForQuestion(
  question: string,
  previousQuestions: string[] = []
): Array<'exam' | 'credit'> | null {
  const own = mentionedLessonKinds(question);
  if (own !== undefined) return own;
  if (!isFollowUp(question)) return null;
  const inherited = mentionedLessonKinds(previousQuestions.slice(-2).join(' '));
  return inherited === undefined ? null : inherited;
}
