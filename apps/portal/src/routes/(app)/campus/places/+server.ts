import { json } from '@sveltejs/kit';
import { requireUser } from '#modules/auth/server/auth.service.server.ts';
import { suggestPlaces } from '#modules/campus/campus-data.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, url }) => {
  requireUser(locals.user);
  return json(suggestPlaces(url.searchParams.get('q') ?? ''));
};
