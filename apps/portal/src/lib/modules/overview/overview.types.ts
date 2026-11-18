import type { getOverview } from './server/overview.service.server';
export type OverviewData = Awaited<ReturnType<typeof getOverview>>;
