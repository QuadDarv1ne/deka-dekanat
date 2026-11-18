import { error } from '@sveltejs/kit';
import { requireRole } from '#modules/auth/server/auth.service.server.ts';
import { importHeaders } from '#modules/academics/server/academic-import.service.server.ts';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = ({ locals, url }) => {
  const user = requireRole(locals.user, 'dean', 'teacher'),
    kind = url.searchParams.get('kind');
  if (kind !== 'schedule' && kind !== 'grades') error(400, 'Выберите тип файла.');
  if (kind === 'schedule' && user.role !== 'dean') error(403, 'Расписание изменяет деканат.');
  return new Response('\uFEFF' + importHeaders[kind].join(';') + '\r\n', {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="deka-${kind}.csv"`
    }
  });
};
