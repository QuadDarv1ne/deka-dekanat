export const cabinetSections = {
  news: 'Новости и уведомления',
  schedule: 'Расписание',
  attendance: 'Посещаемость',
  gradebook: 'Электронная зачётная книжка',
  debts: 'Дисциплины ниже порога',
  library: 'Читательский билет',
  teachers: 'Преподаватели',
  orders: 'Приказы',
  journal: 'Электронный журнал',
  sport: 'Занятия физкультурой',
  brs: 'Достижения в БРС',
  curriculum: 'Дисциплины программы',
  trajectory: 'Траектория',
  feedback: 'Анкета качества образования',
  military: 'Воинский учёт',
  payments: 'Оплата услуг',
  applications: 'Заявления',
  housing: 'Заявки по общежитиям',
  clearance: 'Обходной лист',
  coworking: 'Техноковоркинг',
  laboratories: 'Мегалаборатории',
  counseling: 'Приём психолога',
  esports: 'Киберзона',
  portfolio: 'Портфолио',
  resources: 'Ресурсы',
  distance: 'Дистанционное обучение',
  support: 'Техническая поддержка'
} as const;

export type CabinetSection = keyof typeof cabinetSections;
export const isCabinetSection = (value: string): value is CabinetSection =>
  Object.hasOwn(cabinetSections, value);
export const cabinetPath = (value: CabinetSection) => '/profile/' + value;

export const cabinetGroups = [
  {
    label: 'Обучение',
    icon: 'book',
    sections: ['attendance', 'gradebook', 'debts', 'teachers', 'journal']
  },
  {
    label: 'Образовательная программа',
    icon: 'cap',
    sections: ['curriculum', 'trajectory']
  },
  {
    label: 'Сервисы',
    icon: 'settings',
    sections: ['applications', 'resources', 'support']
  }
] as const satisfies ReadonlyArray<{
  label: string;
  icon: 'book' | 'cap' | 'settings';
  sections: readonly CabinetSection[];
}>;
