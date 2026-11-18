import identifiers from './room-index.json' with { type: 'json' };
import type { CampusMode } from './campus.types.ts';

export const campusPath = '/campus';
export const mainEntrance = 'v-2.go_enter_v2';
export const officialCampusMap = 'https://mgimo.ru/territory/map/';
const rooms: Readonly<Record<string, string>> = identifiers;

export function classroomId(room: string) {
  const key = room
    .trim()
    .toLocaleLowerCase('ru-RU')
    .replace(/^(?:ауд(?:итория)?\.?|каб(?:инет)?\.?)\s*/u, '');
  return Object.hasOwn(rooms, key) ? rooms[key] : null;
}

export function mapRouteHref(from = '', to = '', mode: CampusMode = 'standard', plan = '') {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (mode === 'lift') params.set('mode', 'lift');
  if (plan) params.set('plan', plan);
  return params.size ? campusPath + '?' + params : campusPath;
}

export function roomMapHref(room: string, previousRoom?: string) {
  const to = classroomId(room);
  if (!to) return null;
  const from = previousRoom ? classroomId(previousRoom) : null;
  return mapRouteHref(from && from !== to ? from : '', to);
}
