export function clockAnswer(question: string, now = new Date()): string | null {
  const normalized = question
    .toLocaleLowerCase('ru')
    .replaceAll('ё', 'е')
    .replace(/[\u2018\u2019\u02BC]/g, "'");
  if (
    normalized.length > 180 ||
    !/(сколько\s+(сейчас\s+)?времени|который\s+час|текущее\s+время|время\s+(сейчас|в\s+москве)|what(?:'s| is) the time|what time is it|current time)/.test(
      normalized
    )
  )
    return null;
  const zones = [
    {
      pattern: /москв|moscow|(?:^|\s)(?:мск|msk)(?:\s|[?!.]|$)/,
      zone: 'Europe/Moscow',
      place: 'в Москве',
      offset: 'МСК, UTC+3'
    },
    {
      pattern: /екатеринбург|yekaterinburg|ekaterinburg/,
      zone: 'Asia/Yekaterinburg',
      place: 'в Екатеринбурге',
      offset: 'UTC+5'
    },
    {
      pattern: /новосибирск|novosibirsk/,
      zone: 'Asia/Novosibirsk',
      place: 'в Новосибирске',
      offset: 'UTC+7'
    },
    {
      pattern: /владивосток|vladivostok/,
      zone: 'Asia/Vladivostok',
      place: 'во Владивостоке',
      offset: 'UTC+10'
    }
  ];
  const explicit = zones.find((item) => item.pattern.test(normalized));
  if (
    /потреб|займ|занима|нужно|надо|уйдет|на\s+(подготов|учеб|дорог)|how (?:much|long)|do i need|prepar|homework|class|exam|lecture|lesson/.test(
      normalized
    )
  )
    return null;
  if (
    !explicit &&
    !/сейчас|текущее|который\s+час|now|current|what time is it|what's the time/.test(normalized) &&
    !/^\s*(подскажите[,\s]+)?сколько\s+времени[?!.\s]*$/.test(normalized)
  )
    return null;
  const withoutKnown = normalized.replace(
    /времени|время|сейчас|time|now|moscow|msk|yekaterinburg|ekaterinburg|novosibirsk|vladivostok/g,
    ''
  );
  if (!explicit && /(?:(?:в|во)|\bin)\s+[а-яa-z]{3,}/.test(withoutKnown)) return null;
  const selected = explicit ?? zones[0];
  const time = new Intl.DateTimeFormat('ru-RU', {
    timeZone: selected.zone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).format(now);
  const date = new Intl.DateTimeFormat('ru-RU', {
    timeZone: selected.zone,
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(now);
  return `Сейчас ${selected.place} ${time} (${selected.offset}). ${date}`;
}
