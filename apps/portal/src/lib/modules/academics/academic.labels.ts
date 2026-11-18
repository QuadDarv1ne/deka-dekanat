export const lessonKinds = {
  lecture: 'Лекция',
  practice: 'Практика',
  lab: 'Лабораторная',
  exam: 'Экзамен',
  credit: 'Зачёт'
};
export const scoreName = (score: number) =>
  score >= 85
    ? 'Отлично'
    : score >= 70
      ? 'Хорошо'
      : score >= 55
        ? 'Удовлетворительно'
        : 'Нужна пересдача';
export const numericScore = (score: number) =>
  score >= 85 ? 5 : score >= 70 ? 4 : score >= 55 ? 3 : 2;
