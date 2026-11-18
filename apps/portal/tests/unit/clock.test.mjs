import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clockAnswer } from '../../src/lib/modules/assistant/server/clock.server.ts';
test('Current time is supplied by the server clock with timezone and correct date rollover', () => {
  const now = new Date('2026-11-08T22:45:00Z');
  assert.match(clockAnswer('Сколько сейчас времени в Москве?', now), /01:45.*МСК.*9 ноября 2026/);
  assert.match(clockAnswer('Который час в Новосибирске?', now), /05:45.*UTC\+7/);
  assert.equal(clockAnswer('Сколько времени в Токио?', now), null);
  assert.equal(clockAnswer('Как получить справку?', now), null);
  assert.equal(clockAnswer('Сколько времени нужно на подготовку к экзамену?', now), null);
  assert.equal(clockAnswer('Сколько времени потребуется на дорогу в Москве?', now), null);
});
