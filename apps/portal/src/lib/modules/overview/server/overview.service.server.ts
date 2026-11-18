import type { User } from '#modules/auth/auth.types.ts';
import { lessons, grades } from '#modules/academics/server/academic.repository.server.ts';
import { announcements } from '#modules/announcements/server/announcement.repository.server.ts';
import { systemStats } from '#modules/administration/server/administration.repository.server.ts';
import { listRequests, requestStats } from '#modules/requests/server/request.repository.server.ts';

export async function getOverview(user: User) {
  const [schedule, results, news, requests, stats, admin] = await Promise.all([
    lessons(user),
    grades(user),
    announcements(user),
    ['student', 'dean'].includes(user.role) ? listRequests(user) : Promise.resolve([]),
    ['student', 'dean'].includes(user.role)
      ? requestStats(user)
      : Promise.resolve({ active: '0', new: '0' }),
    user.role === 'admin' ? systemStats() : Promise.resolve(null)
  ]);
  return {
    schedule: schedule.filter((l) => new Date(l.ends_at).getTime() > Date.now()).slice(0, 3),
    grades: results,
    news: news.slice(0, 3),
    requests: requests.slice(0, 4),
    requestStats: stats,
    admin
  };
}
