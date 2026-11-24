import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarExport } from '#modules/academics/server/calendar-export.server.ts';

const lesson = {
  id: '11111111-1111-4111-8111-111111111111',
  subject: 'Базы данных',
  color: 'blue',
  teacher: 'Иванов Иван',
  group_name: 'МГ-21',
  starts_at: '2026-12-01T06:00:00.000Z',
  ends_at: '2026-12-01T07:30:00.000Z',
  room: '402',
  kind: 'lecture',
  note: '',
  cancelled_at: null
};

test('Calendar export marks a cancelled lesson and keeps an active one confirmed', () => {
  const active = calendarExport([lesson], new Date('2026-11-24T09:00:00.000Z'));
  assert.match(active, /SUMMARY:Базы данных/);
  assert.match(active, /STATUS:CONFIRMED/);
  assert.match(active, /BEGIN:VALARM\r\nTRIGGER:-PT15M\r\nACTION:DISPLAY/);
  assert.doesNotMatch(active, /STATUS:CANCELLED/);
  const cancelled = calendarExport(
    [{ ...lesson, cancelled_at: '2026-11-24T08:00:00.000Z' }],
    new Date('2026-11-24T09:00:00.000Z')
  );
  assert.match(cancelled, /SUMMARY:Отменено: Базы данных/);
  assert.match(cancelled, /STATUS:CANCELLED/);
  assert.doesNotMatch(cancelled, /BEGIN:VALARM/);
  for (const line of cancelled.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
});
