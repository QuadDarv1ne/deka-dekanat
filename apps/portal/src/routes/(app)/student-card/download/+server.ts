import { requireRole } from '#modules/auth/server/auth.service.server.ts';
import {
  studentCard,
  cardPresentation
} from '#modules/student-cards/server/student-card.service.server.ts';
import { studentCardSvg } from '#modules/student-cards/server/student-card-export.server.ts';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async ({ locals, url }) => {
  const p = await cardPresentation(
    await studentCard(requireRole(locals.user, 'student')),
    url.origin
  );
  return new Response(studentCardSvg(p), {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="deka-student-${p.card.number}.svg"`,
      'Cache-Control': 'private, no-store',
      'Content-Security-Policy':
        "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox"
    }
  });
};
