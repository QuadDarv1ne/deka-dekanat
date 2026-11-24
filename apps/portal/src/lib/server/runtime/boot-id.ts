import { randomUUID } from 'node:crypto';

// A random id per Node.js process. Rows written with it (for example assistant
// leases) belong to this process only, so the next boot can tell stale rows
// from live ones instead of waiting for a timeout.
export const bootId = randomUUID();
