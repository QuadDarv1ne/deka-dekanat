import type { CabinetSection } from '#application/cabinet-navigation.ts';
import type { User } from '#modules/auth/auth.types.ts';
import { lessons } from '#modules/academics/server/academic.repository.server.ts';
import { groupCurriculum } from '#modules/academics/server/group-curriculum.repository.server.ts';
import { studentAttendance } from '#modules/academics/server/attendance.repository.server.ts';
import { studentProgress } from '#modules/academics/server/student-progress.service.server.ts';
import { announcements } from '#modules/announcements/server/announcement.repository.server.ts';
import { notifications } from '#modules/notifications/server/notification.repository.server.ts';
import { listRequests } from '#modules/requests/server/request.repository.server.ts';
import { studyGrades } from '#modules/study-plan/server/study-plan.repository.server.ts';
import { studyPlan } from '#modules/study-plan/server/study-plan.service.server.ts';
import { PASSING_SCORE } from '#modules/study-plan/study-plan.policy.ts';
import { cabinetResources } from '../cabinet-resources.labels.ts';

export async function cabinetSection(user: User, section: CabinetSection) {
  switch (section) {
    case 'news': {
      const [news, alerts] = await Promise.all([announcements(user), notifications(user.id)]);
      return {
        view: 'news' as const,
        news,
        alerts: alerts.slice(0, 15).map(({ id, title, body, read_at, created_at }) => ({
          id,
          title,
          body,
          read_at,
          created_at
        }))
      };
    }
    case 'schedule':
    case 'sport': {
      const agenda = (await lessons(user)).filter(
        (item) => !item.cancelled_at && Date.parse(item.ends_at) > Date.now()
      );
      return {
        view: 'schedule' as const,
        lessons:
          section === 'sport'
            ? agenda.filter((item) =>
                /физкультур|физическ.*(?:культур|воспитан)|(?:^|[^\p{L}])спорт/iu.test(item.subject)
              )
            : agenda.slice(0, 40)
      };
    }
    case 'attendance':
      return { view: 'attendance' as const, entries: await studentAttendance(user) };
    case 'teachers':
    case 'curriculum':
      return { view: 'curriculum' as const, entries: await groupCurriculum(user) };
    case 'gradebook':
    case 'brs':
    case 'portfolio': {
      const grades = await studyGrades(user);
      return { view: 'grades' as const, grades };
    }
    case 'debts': {
      const grades = await studyGrades(user);
      return {
        view: 'debts' as const,
        scored: grades.length,
        grades: grades.filter((grade) => grade.points < PASSING_SCORE)
      };
    }
    case 'journal':
      return { view: 'journal' as const, courses: await studentProgress(user) };
    case 'trajectory': {
      const plan = await studyPlan(user);
      return { view: 'trajectory' as const, tasks: plan.focus };
    }
    case 'applications': {
      const items = await listRequests(user);
      return {
        view: 'applications' as const,
        requests: items.slice(0, 20).map(({ id, number, kind, status, updated_at }) => ({
          id,
          number,
          kind,
          status,
          updated_at
        }))
      };
    }
    default: {
      const resource: { description: string; links?: { href: string; label: string }[] } =
        cabinetResources[section];
      return {
        view: 'resource' as const,
        description: resource.description,
        links: resource.links ?? []
      };
    }
  }
}
