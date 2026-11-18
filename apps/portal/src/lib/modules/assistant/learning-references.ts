const references = [
  {
    id: 'reference-sql-joins',
    title: 'PostgreSQL: соединения таблиц',
    href: 'https://www.postgresql.org/docs/18/queries-table-expressions.html#QUERIES-JOIN',
    matches: (q: string) => /\bjoin\b/iu.test(q),
    text: 'INNER JOIN возвращает строки с совпадением условия в обеих таблицах. A LEFT JOIN B сохраняет ВСЕ строки ЛЕВОЙ таблицы A. Если соответствия справа нет, столбцы B равны NULL. Пример: students s LEFT JOIN grades g ON g.student_id=s.id возвращает всех студентов, в том числе без оценок. RIGHT JOIN сохраняет правую таблицу. Не путай левую и правую стороны.'
  },
  {
    id: 'reference-js-bindings',
    title: 'MDN: const',
    href: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const',
    matches: (q: string) => /\bconst\b|\blet\b/iu.test(q),
    text: 'const запрещает повторное присваивание переменной, но не делает объект неизменяемым: const user={name:"Анна"}; user.name="Ирина" допустимо. let допускает повторное присваивание. Обе декларации имеют блочную область видимости. Не называй const гарантией неизменности свойств объекта.'
  }
];
export function learningReferences(question: string) {
  return references
    .filter((reference) => reference.matches(question))
    .map(({ id, title, href, text }) => ({ id, title, href, text }));
}
