import { previewAccounts } from '#modules/auth/preview-accounts.ts';
import { isLocalDemo } from '#modules/auth/server/auth.service.server.ts';

// The root route renders the login form in place instead of answering with a
// 303 to /login. Some platforms' health probes treat any 3xx response as
// "not ready" and fail the deployment, so / must return 200. Signed-in
// visitors are still taken to /overview, but client-side (see +page.svelte),
// which keeps the HTTP status at 200 for the probe.
export const load = ({ locals, url }: import('./$types').PageServerLoadEvent) => {
  const demo = isLocalDemo(url);
  return {
    redirect: locals.user ? '/overview' : null,
    demo,
    accounts: demo ? previewAccounts : []
  };
};
