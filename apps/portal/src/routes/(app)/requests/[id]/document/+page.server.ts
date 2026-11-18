import { error } from '@sveltejs/kit';
import { requireRole } from '#modules/auth/server/auth.service.server.ts';
import { getRequest } from '#modules/requests/server/request.repository.server.ts';
import QRCode from 'qrcode';
import { canIssueDocument } from '#modules/requests/request.policy.ts';

import type { PageServerLoad } from './$types';
export const load = (async ({ locals, params, url }) => {
  const request = await getRequest(requireRole(locals.user, 'student', 'dean'), params.id);
  if (!canIssueDocument(request.kind))
    error(404, 'Для этого обращения отдельная справка не выпускается.');
  if (!['ready', 'done'].includes(request.status)) error(409, 'Документ ещё не подготовлен.');
  const verificationUrl = `${url.origin}/verify/${request.verification_code}`;
  return {
    request,
    verificationUrl,
    qr: await QRCode.toDataURL(verificationUrl, {
      width: 256,
      margin: 2,
      errorCorrectionLevel: 'M'
    })
  };
}) satisfies PageServerLoad;
