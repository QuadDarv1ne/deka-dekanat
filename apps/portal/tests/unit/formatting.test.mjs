import { test } from 'node:test';
import assert from 'node:assert/strict';
import { academicTerm } from '#shared/formatting.ts';
import { requestNumber } from '#modules/requests/request.labels.ts';

test('The semester follows the Moscow calendar instead of a fixed year', () => {
  assert.deepEqual(academicTerm(new Date('2026-11-24T12:00:00+03:00')), {
    season: 'Осенний семестр',
    years: '2026 / 2027'
  });
  assert.deepEqual(academicTerm(new Date('2027-01-20T12:00:00+03:00')), {
    season: 'Осенний семестр',
    years: '2026 / 2027'
  });
  assert.deepEqual(academicTerm(new Date('2027-02-09T12:00:00+03:00')), {
    season: 'Весенний семестр',
    years: '2026 / 2027'
  });
  assert.deepEqual(academicTerm(new Date('2027-09-01T00:30:00+03:00')), {
    season: 'Осенний семестр',
    years: '2027 / 2028'
  });
});

test('Request numbers keep the four-digit form shown on documents', () => {
  assert.equal(requestNumber(7), '0007');
  assert.equal(requestNumber('0007'), '0007');
  assert.equal(requestNumber(10000), '10000');
});
