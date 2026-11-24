import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarDate, dateFromExcel } from '#shared/calendar-date.ts';

test('Imported dates keep the calendar day from ISO, Russian and Excel cells', () => {
  assert.equal(calendarDate('2026-12-01'), '2026-12-01');
  assert.equal(calendarDate('01.12.2026'), '2026-12-01');
  assert.equal(calendarDate('1.12.2026'), '2026-12-01');
  assert.equal(calendarDate('01/12/2026'), '2026-12-01');
  assert.equal(calendarDate('31.02.2026'), null);
  assert.equal(calendarDate('2026-02-31'), null);
  assert.equal(dateFromExcel(new Date(Date.UTC(2026, 11, 1))), '2026-12-01');
  assert.equal(dateFromExcel(new Date(2026, 11, 1)), '2026-12-01');
});
