export type ContextSection =
  'help' | 'schedule' | 'grades' | 'requests' | 'announcements' | 'attendance' | 'preparation';

export function contextSections(
  question: string,
  previousQuestions: string[] = []
): Set<ContextSection> {
  const normalized = question.toLocaleLowerCase('ru-RU');
  const followUp =
    /^(?:а\s|и\s|тогда\s)|(?:^|[^\p{L}])(?:это|эти|этого|ещё|еще)(?:$|[^\p{L}])/u.test(normalized);
  const text = followUp ? previousQuestions.slice(-2).join(' ') + ' ' + normalized : normalized;
  const sections = new Set<ContextSection>();
  // The portal is Russian, but a student may still ask in English. Without the
  // English keywords the answer is generated with an empty cabinet context and
  // the model claims it has no access to the schedule.
  if (
    /распис|заняти|аудитор|пар[аыуе](?:\s|\?|$)|экзам|зач[её]т|аттестаци|schedule|timetable|class(?:es)?|lecture|lesson|exam|deadline/u.test(
      text
    )
  )
    sections.add('schedule');
  if (/балл|оценк|успеваем|результат|задолж|пересдач|grade|grades|score|mark|gpa/u.test(text))
    sections.add('grades');
  if (
    /справк|заявлен|стипенд|обращени|документ|налог|certificate|statement|application|scholarship|document/u.test(
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
