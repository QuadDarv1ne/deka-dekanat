import { error } from '@sveltejs/kit';
import { isCabinetSection } from '#application/cabinet-navigation.ts';
import { requireRole } from '#modules/auth/server/auth.service.server.ts';
import { cabinetSection } from '#modules/overview/server/cabinet-section.service.server.ts';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params }) => {
  const user = requireRole(locals.user, 'student');
  const section = params.section;
  if (!isCabinetSection(section)) error(404, 'Раздел не найден.');
  return { section, content: await cabinetSection(user, section) };
}) satisfies PageServerLoad;
