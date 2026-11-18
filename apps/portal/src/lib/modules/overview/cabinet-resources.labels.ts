import type { CabinetSection } from '#application/cabinet-navigation.ts';
import { campusPath } from '#modules/campus/campus-links.ts';

type Resource = { description: string; links?: { href: string; label: string }[] };
const generalRequest = { href: '/requests/new', label: 'Написать в деканат' };
const announcements = { href: '/announcements', label: 'Объявления факультета' };

export const cabinetResources = {
  library: {
    description: 'Данные читательского билета пока недоступны в кабинете.',
    links: [generalRequest]
  },
  orders: {
    description:
      'Приказы вуза пока недоступны в кабинете. Вы можете уточнить сведения об интересующем приказе.',
    links: [generalRequest]
  },
  feedback: {
    description:
      'Анкета пока не опубликована. Вы можете отправить замечание о качестве обучения через форму обращения.',
    links: [generalRequest]
  },
  military: {
    description:
      'Данные воинского учёта в кабинете отсутствуют. Уточните в деканате, куда подать документы.',
    links: [generalRequest]
  },
  payments: {
    description:
      'Счета и оплата онлайн пока недоступны. Уточнить вопрос об оплате можно через деканат.',
    links: [generalRequest]
  },
  housing: {
    description:
      'Запись на заселение из кабинета пока недоступна. Уточните порядок подачи заявки в деканате.',
    links: [generalRequest]
  },
  clearance: {
    description:
      'Электронный обходной лист пока недоступен. Уточните порядок оформления в деканате.',
    links: [generalRequest]
  },
  coworking: {
    description:
      'Расписание и бронирование площадок пока недоступны. Об открытых событиях сообщают в объявлениях.',
    links: [announcements]
  },
  laboratories: {
    description:
      'Каталог лабораторий пока недоступен. Учебные лабораторные занятия можно найти в расписании группы.',
    links: [{ href: '/profile/schedule', label: 'Расписание группы' }]
  },
  counseling: {
    description:
      'Запись на приём из кабинета пока недоступна. Порядок записи можно уточнить в деканате.',
    links: [generalRequest]
  },
  esports: {
    description:
      'Запись на мероприятия Киберзоны пока недоступна. Следите за объявлениями факультета.',
    links: [announcements]
  },
  resources: {
    description: 'Учебные и информационные разделы кабинета.',
    links: [
      { href: '/profile/curriculum', label: 'Учебный план' },
      { href: '/profile/journal', label: 'Электронный журнал' },
      { href: campusPath, label: 'Карта МГИМО' },
      { href: '/profile/news', label: 'Новости и уведомления' }
    ]
  },
  distance: {
    description: 'Ссылки и задания дистанционных курсов пока недоступны в кабинете.',
    links: [{ href: '/profile/schedule', label: 'Посмотреть расписание' }, generalRequest]
  },
  support: {
    description:
      'Если возникла проблема с кабинетом, отправьте обращение и опишите, на каком экране она появилась.',
    links: [generalRequest]
  }
} satisfies Partial<Record<CabinetSection, Resource>>;
