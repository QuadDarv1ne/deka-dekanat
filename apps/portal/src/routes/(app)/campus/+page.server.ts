import { redirect } from '@sveltejs/kit';
import { mapRouteHref } from '#modules/campus/campus-links.ts';
import { requireUser } from '#modules/auth/server/auth.service.server.ts';
import {
  plans,
  planById,
  places,
  resolvePlace,
  placeCaption
} from '#modules/campus/campus-data.ts';
import { campusRoute } from '#modules/campus/campus-route.ts';
import { corridorLine } from '#modules/campus/campus-corridors.ts';
import type { CampusMode } from '#modules/campus/campus.types.ts';
import type { PageServerLoad } from './$types';

export const load = (({ locals, url }) => {
  requireUser(locals.user);
  const input = (name: string) => (url.searchParams.get(name) ?? '').trim().slice(0, 300);
  const fromInput = input('from'),
    toInput = input('to');
  const from = resolvePlace(fromInput),
    to = resolvePlace(toInput);
  const mode: CampusMode = ['lift', 'step-free'].includes(input('mode')) ? 'lift' : 'standard';
  if (url.searchParams.has('search') && (!fromInput || from) && (!toInput || to)) {
    redirect(303, mapRouteHref(from?.id, to?.id, mode));
  }
  const route = from && to && from.id !== to.id ? campusRoute(from, to, mode) : null;
  const issue =
    (fromInput && !from) || (toInput && !to)
      ? 'Место не найдено однозначно. Уточните аудиторию или выберите подсказку с корпусом.'
      : from && to && from.id === to.id
        ? 'Вы уже в выбранном месте.'
        : from && to && !route
          ? 'На опубликованных планах нет связанного маршрута для этих условий.'
          : '';
  const plan =
    planById.get(input('plan')) ??
    planById.get(route?.[0].plan ?? to?.plan ?? from?.plan ?? 'n-4')!;
  const step = route?.find((s) => s.plan === plan.id);
  return {
    plans,
    plan,
    from,
    to,
    mode,
    issue,
    route,
    fromText: from ? placeCaption(from) : fromInput,
    toText: to ? placeCaption(to) : toInput,
    markers: places.filter((p) => p.plan === plan.id && p.search),
    step,
    line: step ? corridorLine(step) : ''
  };
}) satisfies PageServerLoad;
