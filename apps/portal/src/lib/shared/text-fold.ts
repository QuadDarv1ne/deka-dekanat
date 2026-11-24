// PostgreSQL lower() follows the database collation. This project initializes
// the cluster with locale C, which only folds ASCII, so Russian names and
// room labels need an explicit alphabet.
export const ruFoldAlphabets = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',
  lower: 'abcdefghijklmnopqrstuvwxyzабвгдеежзийклмнопрстуфхцчшщъыьэюя'
};

export function folded(value: string) {
  const from = [...ruFoldAlphabets.upper];
  const to = [...ruFoldAlphabets.lower];
  return [...value]
    .map((char) => {
      const index = from.indexOf(char.toLocaleUpperCase('ru-RU'));
      return index === -1 ? char : to[index];
    })
    .join('');
}
export function foldText(expression: string) {
  if (ruFoldAlphabets.upper.length !== ruFoldAlphabets.lower.length)
    throw new Error('Russian fold alphabets are misaligned.');
  return `translate(${expression}, '${ruFoldAlphabets.upper}', '${ruFoldAlphabets.lower}')`;
}
