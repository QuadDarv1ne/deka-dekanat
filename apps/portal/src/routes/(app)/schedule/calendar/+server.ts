import { requireRole } from '#modules/auth/server/auth.service.server.ts';
import { lessons } from '#modules/academics/server/academic.repository.server.ts';
import { calendarExport } from '#modules/academics/server/calendar-export.server.ts';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async ({ locals }) =>
  new Response(
    calendarExport(await lessons(requireRole(locals.user, 'student', 'teacher', 'dean'))),
    {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="deka-schedule.ics"',
        'Cache-Control': 'private, no-store'
      }
    }
  );
