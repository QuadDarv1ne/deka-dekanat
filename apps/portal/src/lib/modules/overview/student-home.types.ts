import type { studentHome } from './server/student-home.service.server.ts';

export type StudentHome = Awaited<ReturnType<typeof studentHome>>;
