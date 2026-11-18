import type { RequestKind } from './request.types.ts';

interface RequestTemplate {
  kind: RequestKind;
  label: string;
  description: string;
  text: string;
  hint: string;
}

export const requestTemplates = {
  study: {
    kind: 'study',
    label: 'Об обучении',
    description: 'Подтвердить, что вы учитесь в вузе.',
    text: 'Справка для предоставления по месту требования. Нужен один экземпляр.',
    hint: 'Если справку ждёт конкретная организация, укажите её название.'
  },
  scholarship: {
    kind: 'scholarship',
    label: 'О стипендии',
    description: 'Запросить сведения о назначенной стипендии.',
    text: 'Справка о назначенной стипендии для предоставления по месту требования.',
    hint: 'Добавьте период, за который нужны сведения.'
  },
  tax: {
    kind: 'tax',
    label: 'Для налоговой',
    description: 'Запросить справку для налогового органа.',
    text: 'Справка об оплате обучения для предоставления в налоговый орган.',
    hint: 'Укажите год оплаты и количество экземпляров.'
  }
} satisfies Record<string, RequestTemplate>;

export const isRequestTemplate = (value: string): value is keyof typeof requestTemplates =>
  Object.hasOwn(requestTemplates, value);
