import { verifyDocument } from '#modules/requests/server/request.repository.server.ts';
import type { PageServerLoad } from './$types';
export const load = (async ({ params }) => ({
  document: await verifyDocument(params.code)
})) satisfies PageServerLoad;
