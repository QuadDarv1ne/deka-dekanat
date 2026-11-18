import { json } from '@sveltejs/kit';
import { databaseReady } from '#server/database/readiness.ts';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async () => {
  try {
    await databaseReady();
    return json({ service: 'deka', status: 'ok' });
  } catch {
    return json({ service: 'deka', status: 'unavailable' }, { status: 503 });
  }
};
