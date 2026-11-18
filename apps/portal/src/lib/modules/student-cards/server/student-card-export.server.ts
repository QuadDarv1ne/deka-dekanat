import type { CardPresentation } from '../student-card.types.ts';
const xml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!
  );
export function studentCardSvg(p: CardPresentation) {
  const names = p.card.full_name.split(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1020" height="644" viewBox="0 0 1020 644"><defs><linearGradient id="bg"><stop stop-color="#f1ecfc"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs><rect x="1" y="1" width="1018" height="642" rx="34" fill="url(#bg)" stroke="#ddd5ed"/><g font-family="Arial,sans-serif" fill="#29233d"><text x="50" y="87" font-size="42" font-weight="700">Дека</text><text x="970" y="81" text-anchor="end" font-size="20" fill="#756a87">Студенческий билет</text><text x="50" y="166" font-size="18" fill="#756a87">${xml(p.number)}</text><text x="50" y="230" font-size="38" font-weight="700">${xml(names[0])}</text><text x="50" y="281" font-size="34" font-weight="700">${xml(names.slice(1).join(' '))}</text><text x="50" y="344" font-size="20" fill="#756a87">${xml(p.card.faculty_name)}</text><text x="50" y="413" font-size="24">${xml(p.card.group_name)} · ${p.card.course} курс</text><path d="M50 480H970" stroke="#ddd5ed"/><text x="50" y="526" font-size="18" fill="#756a87">${xml(p.card.program)}</text><text x="50" y="582" font-size="16" fill="#756a87">Проверка QR-кода в системе Дека</text><text x="970" y="582" text-anchor="end" font-size="18" fill="#3b7a62">Действует</text></g><image x="710" y="185" width="260" height="260" href="${p.qr}" xlink:href="${p.qr}"/></svg>`;
}
