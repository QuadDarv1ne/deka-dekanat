import type { Role } from '#modules/auth/auth.types.ts';
export function navigationFor(role: Role) {
  return [
    { href: '/overview', name: 'Обзор', icon: 'home' as const, show: true },
    {
      href: '/schedule',
      name: 'Расписание',
      icon: 'calendar' as const,
      show: role !== 'admin'
    },
    {
      href: '/grades',
      name: role === 'student' ? 'Успеваемость' : 'Учебные результаты',
      icon: 'chart' as const,
      show: role !== 'admin'
    },
    {
      href: '/requests',
      name: role === 'student' ? 'Мои заявления' : 'Заявления',
      icon: 'files' as const,
      show: ['student', 'dean'].includes(role)
    },
    { href: '/assistant', name: 'Помощник', icon: 'chat' as const, show: true },
    {
      href: '/academics/manage',
      name: 'Учебные данные',
      icon: 'book' as const,
      show: ['dean', 'teacher'].includes(role)
    },
    {
      href: '/students',
      name: 'Студенты',
      icon: 'users' as const,
      show: ['dean', 'teacher'].includes(role)
    },
    { href: '/announcements', name: 'Объявления', icon: 'news' as const, show: true },
    { href: '/notifications', name: 'Уведомления', icon: 'bell' as const, show: true },
    {
      href: '/people',
      name: 'Пользователи',
      icon: 'users' as const,
      show: role === 'admin'
    },
    {
      href: '/audit',
      name: 'Журнал действий',
      icon: 'shield' as const,
      show: role === 'admin'
    }
  ].filter((n) => n.show);
}
