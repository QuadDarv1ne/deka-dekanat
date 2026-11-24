export type CabinetQuestion = 'exam' | 'upcoming' | 'ready' | 'active' | 'attendance';

function normalize(question: string) {
  return question
    .toLocaleLowerCase('ru-RU')
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .trim()
    .replace(/[.!?]+$/u, '')
    .trim();
}

export function cabinetQuestion(question: string): CabinetQuestion | null {
  const text = normalize(question);
  if (
    /^(?:когда|во сколько) (?:у меня )?ближайший экзамен(?: и по какой дисциплине)?$/u.test(text) ||
    /^(?:when is my next exam|what is my next exam)$/u.test(text)
  )
    return 'exam';
  if (
    /^какие (?:у меня )?(?:ближайшие|следующие) (?:занятия|пары)(?: у меня)?$/u.test(text) ||
    /^(?:what(?:'s| is) my next class(?:es)?|what are my next classes|upcoming classes)$/u.test(
      text
    )
  )
    return 'upcoming';
  if (
    /^какие (?:мои )?(?:документы|справки) готовы(?: к выдаче)?$/u.test(text) ||
    /^(?:which (?:of my )?(?:documents|certificates) are ready|is my certificate ready)$/u.test(
      text
    )
  )
    return 'ready';
  if (
    /^сколько (?:у меня )?(?:сейчас )?(?:активных |открытых )?(?:заявлени|заявок|обращени)/u.test(
      text
    ) ||
    /^какие (?:у меня )?(?:заявлени|заявки|обращени) (?:сейчас )?в работе$/u.test(text) ||
    /^how many (?:active |open )?(?:requests|applications)(?: do i have)?$/u.test(text)
  )
    return 'active';
  if (
    /^есть ли у меня пропуски(?: занятий)?$/u.test(text) ||
    /^(?:do i have any absences|how many absences do i have|how many classes have i missed)$/u.test(
      text
    )
  )
    return 'attendance';
  return null;
}
