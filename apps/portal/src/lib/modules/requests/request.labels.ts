import type { RequestKind, RequestStatus } from './request.types';
export const requestKinds: Record<RequestKind, string> = {
  study: 'Справка об обучении',
  scholarship: 'Справка о стипендии',
  tax: 'Справка для налоговой',
  leave: 'Академический отпуск',
  transfer: 'Перезачёт дисциплины',
  other: 'Другое обращение'
};
export function requestNumber(value: number | string) {
  return String(value).padStart(4, '0');
}
export const statusNames: Record<RequestStatus, string> = {
  new: 'Новое',
  in_progress: 'В работе',
  ready: 'Готово к выдаче',
  done: 'Завершено',
  rejected: 'Отклонено',
  cancelled: 'Отменено'
};
