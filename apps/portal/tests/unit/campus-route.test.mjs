import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  plans,
  places,
  connections,
  placeCaption,
  resolvePlace,
  suggestPlaces
} from '#modules/campus/campus-data.ts';
import { campusRoute } from '#modules/campus/campus-route.ts';
import { corridorLine } from '#modules/campus/campus-corridors.ts';
import { roomMapHref } from '#modules/campus/campus-links.ts';

test('Official plans contain the original rooms and only local passive SVG graphics', async () => {
  assert.equal(plans.length, 31);
  assert.equal(
    plans.some((p) => p.id === 'a-4'),
    false
  );
  for (const plan of plans) {
    const svg = await readFile(
      new URL('../../static/campus/mgimo/' + plan.id + '.svg', import.meta.url),
      'utf8'
    );
    assert.match(svg, /<svg[^>]+viewBox=/);
    assert.doesNotMatch(svg, /<script\b|<image\b|<foreignObject\b|\son\w+=|href="(?!#)/i);
    for (const p of places.filter((p) => p.plan === plan.id)) {
      assert.ok(svg.includes('id="' + p.id.split('.').slice(1).join('.') + '"'), p.id);
      assert.ok(p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100, p.id);
      if (p.search) assert.equal(resolvePlace(placeCaption(p))?.id, p.id);
    }
  }
});

test('Plan changes use real portals, lift mode excludes stairs and disconnected facilities stay disconnected', () => {
  for (const edge of connections) {
    assert.ok(edge.a && edge.b);
    assert.notEqual(edge.a.plan, edge.b.plan);
  }
  const from = resolvePlace('308'),
    to = resolvePlace('402');
  const short = campusRoute(from, to, 'standard'),
    lift = campusRoute(from, to, 'lift');
  assert.deepEqual(
    short.map((s) => s.plan),
    ['n-3', 'n-4']
  );
  assert.equal(short[0].transfer, 'stairs');
  assert.equal(lift[0].transfer, 'lift');
  assert.ok(short.every((s) => corridorLine(s).length));
  assert.equal(corridorLine(lift[0]), '');
  const same = campusRoute(resolvePlace('402'), resolvePlace('408'), 'standard');
  assert.equal(same.length, 1);
  assert.ok(corridorLine(same[0]));
  const cross = campusRoute(resolvePlace('Главный вход'), to, 'lift');
  assert.ok(cross.some((s) => s.transfer === 'passage'));
  assert.ok(cross.every((s) => s.transfer !== 'stairs'));
  assert.equal(cross.at(-1).end.id, to.id);
  assert.equal(campusRoute(resolvePlace('Вход в библиотеку'), to, 'standard'), null);
});

test('Classroom search resolves official numbers and preserves grouped rooms and legacy bookmarks', () => {
  assert.equal(roomMapHref('Ауд. 310', 'Аудитория 402'), '/campus?from=n-4.n402&to=n-3.n310a');
  assert.equal(resolvePlace('310а').id, 'n-3.n310');
  assert.equal(resolvePlace('room-402').id, 'n-4.n402');
  assert.equal(resolvePlace('entrance').label, 'Главный вход');
  assert.equal(resolvePlace('Гардероб'), null);
  assert.ok(suggestPlaces('402')[0].startsWith('Аудитория 402 · Новый корпус'));
  assert.equal(roomMapHref('Медиалаборатория'), null);
  assert.equal(roomMapHref('constructor'), null);
});
