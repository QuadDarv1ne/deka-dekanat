#!/usr/bin/env node
// Postinstall patch for SvelteKit's CSRF check.
//
// The default is_csrf_forbidden() in @sveltejs/kit compares the Origin header
// to the app's self-origin. If the app is served behind a reverse proxy that
// terminates SSL but forwards x-forwarded-proto: http (which happens with some
// proxy chains), the self-origin becomes "http://..." while the browser sends
// "https://..." as Origin — they don't match and the CSRF check rejects every
// POST. This breaks login form submissions.
//
// This patch makes the comparison host+port only (protocol-tolerant). It runs
// automatically after `npm ci` / `npm install` via the "postinstall" package.json
// script, so the patch is reapplied every time node_modules is rebuilt.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

// Locate @sveltejs/kit's csrf.js source file.
// The package's exports field blocks direct resolve of subpaths, so we resolve
// the package root and then walk into the source layout.
let csrfPath;
const kitRoot = dirname(require.resolve('@sveltejs/kit/package.json'));
const candidates = [
  join(kitRoot, 'src/runtime/server/csrf.js'),
  join(kitRoot, 'dist/runtime/server/csrf.js')
];
for (const candidate of candidates) {
  if (existsSync(candidate)) {
    csrfPath = candidate;
    break;
  }
}

if (!csrfPath) {
  console.log('[csrf-patch] Could not find @sveltejs/kit csrf.js — skipping patch.');
  process.exit(0);
}

const src = readFileSync(csrfPath, 'utf8');

// Skip if already patched.
if (src.includes('PATCH: tolerate protocol mismatch')) {
  console.log('[csrf-patch] Already patched, skipping.');
  process.exit(0);
}

// The original function (across SvelteKit 3.x versions) looks like:
//   export function is_csrf_forbidden({ request, request_origin, self_origin, trusted_origins }) {
//     return (
//       (!request.headers.get('content-type') || is_form_content_type(request)) &&
//       mutating_form_methods.has(request.method) &&
//       request_origin !== self_origin &&
//       (!request_origin || !trusted_origins.includes(request_origin))
//     );
//   }
//
// We replace `request_origin !== self_origin` with a host-only comparison.
const patched = src.replace(
  /request_origin !== self_origin/g,
  `(function(a,b){try{const x=new URL(a),y=new URL(b);return x.host!==y.host}catch{return a!==b}})(request_origin, self_origin) /* PATCH: tolerate protocol mismatch */`
);

if (patched === src) {
  console.log('[csrf-patch] Pattern not found in csrf.js — SvelteKit version may have changed. Skipping.');
  process.exit(0);
}

writeFileSync(csrfPath, patched, 'utf8');
console.log('[csrf-patch] Patched @sveltejs/kit csrf.js to tolerate protocol mismatch.');
