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
  if (/распис|заняти|аудитор|пар[аыуе](?:\s|\?|$)|экзам|зач[её]т|аттестаци/u.test(text))
    sections.add('schedule');
  if (/балл|оценк|успеваем|результат|задолж|пересдач/u.test(text)) sections.add('grades');
  if (/справк|заявлен|стипенд|обращени|документ|налог/u.test(text)) {
    sections.add('help');
    if (/мо[ийяеё]|статус|готов|номер|№|когда|отправ|подал/u.test(text)) sections.add('requests');
  }
  if (/объявлен|новост|деканат.*(?:работ|час|контакт)|(?:час|контакт).*деканат/u.test(text))
    sections.add('announcements');
  if (/посещаем|пропуск|отсутств/u.test(text)) sections.add('attendance');
  if (/подготов|повтор|выуч|готовност|план.*уч[её]|(?:отмет|аттестаци).*готов/u.test(text))
    sections.add('preparation');
  if (/что.*(?:срочн|важн|делать сегодня)|сводк|мой.*день|обзор.*кабинет/u.test(text))
    for (const section of ['schedule', 'grades', 'requests', 'attendance', 'preparation'] as const)
      sections.add(section);
  return sections;
}
