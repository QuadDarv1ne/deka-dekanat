import atlas from './atlas.json' with { type: 'json' };
import { classroomId, mainEntrance } from './campus-links.ts';
import type { CampusPlace, CampusPlan } from './campus.types.ts';

export const plans: CampusPlan[] = atlas.plans;
export const places: CampusPlace[] = atlas.places;
export const planById = new Map(plans.map((p) => [p.id, p]));
const placeById = new Map(places.map((p) => [p.id, p]));
const norm = (s: string) =>
  s.trim().toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/\s+/g, ' ');

const namesByPlan = new Map<string, CampusPlace[]>();
for (const p of places.filter((point) => point.search)) {
  const key = p.plan + '/' + p.label;
  const peers = namesByPlan.get(key) ?? [];
  peers.push(p);
  namesByPlan.set(key, peers);
}

export function placeCaption(p: CampusPlace) {
  const peers = namesByPlan.get(p.plan + '/' + p.label) ?? [];
  const label = peers.length > 1 ? p.label + ' (' + (peers.indexOf(p) + 1) + ')' : p.label;
  return label + ' · ' + planById.get(p.plan)!.label;
}

const entries = places
  .filter((p) => p.search)
  .map((p) => ({
    place: p,
    caption: placeCaption(p),
    key: norm(placeCaption(p)),
    label: norm(p.label)
  }));
export function resolvePlace(input: string | null) {
  if (!input || input.length > 300) return null;
  const key = norm(input);
  const id = key === 'entrance' ? mainEntrance : (classroomId(key.replace(/^room-/, '')) ?? input);
  const direct = placeById.get(id);
  if (direct?.search) return direct;
  const matches = entries.filter((e) => e.key === key || e.label === key);
  return matches.length === 1 ? matches[0].place : null;
}

export function suggestPlaces(query: string) {
  const q = norm(query).slice(0, 100);
  if (!q) return [];
  const words = q.split(' ');
  const exact = resolvePlace(q);
  const result = entries
    .filter((e) => words.every((part) => e.key.includes(part)))
    .sort(
      (a, b) =>
        Number(b.place === exact) - Number(a.place === exact) ||
        Number(b.label.startsWith(q)) - Number(a.label.startsWith(q)) ||
        a.caption.localeCompare(b.caption, 'ru', { numeric: true })
    );
  return result.slice(0, 12).map((e) => e.caption);
}

export const connections = atlas.edges.map((e) => {
  if (e.kind !== 'stairs' && e.kind !== 'lift' && e.kind !== 'passage')
    throw Error('Unknown campus connection');
  return {
    a: placeById.get(e.a)!,
    b: placeById.get(e.b)!,
    kind: e.kind as 'stairs' | 'lift' | 'passage'
  };
});
