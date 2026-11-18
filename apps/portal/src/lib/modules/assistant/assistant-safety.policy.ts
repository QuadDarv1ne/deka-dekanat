export function safetyAnswer(question: string, ownName: string): string | null {
  const text = question.toLocaleLowerCase('ru-RU');
  const named = question.match(
    /(?:оценки|баллы|результаты|посещаемость|заявления)\s+(?:студента\s+)?([А-ЯЁ][а-яё-]+)\s+[А-ЯЁ][а-яё-]+\s+[А-ЯЁ][а-яё-]+/u
  );
  const ownSurname = ownName.split(/\s+/)[0].toLocaleLowerCase('ru-RU');
  const isOtherName =
    named &&
    !named[1]
      .toLocaleLowerCase('ru-RU')
      .startsWith(ownSurname.slice(0, Math.max(3, ownSurname.length - 2)));
  if (
    isOtherName ||
    /(?:оценк|балл|посещаем|личн.*данн|заявлен).*(?:другого студента|других студент|одногруппник|чуж)/u.test(
      text
    )
  )
    return 'Я могу показать только данные вашего кабинета. Оценки и личные сведения других студентов недоступны.';
  if (
    /(?:^|[^\p{L}])(?:выполни|удали|сотри|поставь|измени|сохрани)(?:$|[^\p{L}])/u.test(text) &&
    /оценк|балл|grades|таблиц|баз[уеы]|кабинет/u.test(text)
  )
    return 'Помощник не изменяет оценки и записи в базе. Доступные действия выполняются в разделах портала сотрудником с соответствующими правами.';
  return null;
}
