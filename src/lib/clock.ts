/**
 * Серверные часы ассистента "Дека".
 *
 * Вопросы о текущем времени и дате обрабатываются детерминированно ДО обращения
 * к модели: языковые модели не знают настоящего времени и легко его выдумывают.
 * Здесь мы отвечаем по системным часам сервера с явной таймзоной.
 *
 * Функция возвращает готовый ответ или null, если вопрос не про время, —
 * тогда его обрабатывает обычный конвейер ассистента.
 */

type ClockZone = { pattern: RegExp; zone: string; place: string; offset: string };

const ZONES: ClockZone[] = [
  { pattern: /москв|(?:^|\s)мск(?:\s|[?!.,]|$)/, zone: "Europe/Moscow", place: "в Москве", offset: "МСК, UTC+3" },
  { pattern: /екатеринбург/, zone: "Asia/Yekaterinburg", place: "в Екатеринбурге", offset: "UTC+5" },
  { pattern: /новосибирск/, zone: "Asia/Novosibirsk", place: "в Новосибирске", offset: "UTC+7" },
  { pattern: /красноярск/, zone: "Asia/Krasnoyarsk", place: "в Красноярске", offset: "UTC+7" },
  { pattern: /иркутск/, zone: "Asia/Irkutsk", place: "в Иркутске", offset: "UTC+8" },
  { pattern: /владивосток/, zone: "Asia/Vladivostok", place: "во Владивостоке", offset: "UTC+10" },
  { pattern: /калининград/, zone: "Europe/Kaliningrad", place: "в Калининграде", offset: "UTC+2" },
  { pattern: /самар/, zone: "Europe/Samara", place: "в Самаре", offset: "UTC+4" },
];

/**
 * Ответ о времени, если вопрос именно об этом. Иначе — null.
 * Намеренно строгие фильтры: «сколько времени займёт пересдача» — не про часы.
 */
export function clockAnswer(question: string, now: Date = new Date()): string | null {
  const normalized = question.toLocaleLowerCase("ru").replaceAll("ё", "е");

  // слишком длинный текст — это не короткий вопрос о времени
  if (normalized.length > 180) return null;

  const asksTime = /(сколько\s+(сейчас\s+)?времени|который\s+час|текущее\s+время|время\s+(сейчас|в\s+москве))/.test(
    normalized
  );
  if (!asksTime) return null;

  // «сколько времени займёт / нужно / потребуется / уйдёт на …» — это не про часы
  if (/потреб|займ|занима|нужно|надо|уйдет|уйдёт|на\s+(подготов|учеб|дорог)/.test(normalized)) return null;

  const explicit = ZONES.find((item) => item.pattern.test(normalized));

  // без явной зоны отвечаем только на прямой вопрос о времени «сейчас»
  if (!explicit && !/сейчас|текущее|который\s+час/.test(normalized)) return null;
  // «во сколько … в <городе>» без известной нам зоны — не берёмся
  if (!explicit && /(?:^|\s)(?:в|во)\s+[а-яa-z]{3,}/.test(normalized.replace(/времени|время|сейчас|часов/g, "")))
    return null;

  const selected = explicit ?? ZONES[0];
  const time = new Intl.DateTimeFormat("ru-RU", {
    timeZone: selected.zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const date = new Intl.DateTimeFormat("ru-RU", {
    timeZone: selected.zone,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  return `Сейчас ${selected.place} ${time} (${selected.offset}). ${date}`;
}
