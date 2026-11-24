import { folded } from '#shared/text-fold.ts';

export function safetyAnswer(question: string, ownName: string): string | null {
  const text = question.toLocaleLowerCase('ru-RU');
  const named = question.match(
    /(?:оценки|баллы|результаты|посещаемость|заявления)\s+(?:студента\s+)?([А-ЯЁ][а-яё-]+)\s+[А-ЯЁ][а-яё-]+\s+[А-ЯЁ][а-яё-]+/u
  );
  const ownSurname = folded(ownName.split(/\s+/)[0] ?? '');
  const isOtherName =
    named && !folded(named[1]).startsWith(ownSurname.slice(0, Math.max(3, ownSurname.length - 2)));
  if (
    isOtherName ||
    /(?:оценк|балл|посещаем|личн.*данн|заявлен|grades?|scores?|attendance|requests?).*(?:другого студента|других студент|одногруппник|чуж|another student|other students|classmate)/u.test(
      text
    ) ||
    /(?:another student|other students|classmate).*(?:оценк|балл|grades?|scores?|attendance|requests?)/u.test(
      text
    )
  )
    return 'Я могу показать только данные вашего кабинета. Оценки и личные сведения других студентов недоступны.';
  if (
    /(?:^|[^\p{L}])(?:выполни|удали|сотри|поставь|измени|сохрани|delete|drop|erase|update)(?:$|[^\p{L}])/u.test(
      text
    ) &&
    /оценк|балл|grades?|scores?|таблиц|баз[уеы]|кабинет|database|tables?/u.test(text) &&
    !/объясн|пример|explain|example|what is|how does/u.test(text)
  )
    return 'Помощник не изменяет оценки и записи в базе. Доступные действия выполняются в разделах портала сотрудником с соответствующими правами.';
  return null;
}
