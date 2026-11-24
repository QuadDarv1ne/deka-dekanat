import { test } from 'node:test';
import assert from 'node:assert/strict';
import { folded, foldText, ruFoldAlphabets } from '#shared/text-fold.ts';

test('Russian and Latin fold alphabets stay the same length and map yo to ye', () => {
  assert.equal(ruFoldAlphabets.upper.length, ruFoldAlphabets.lower.length);
  assert.equal(ruFoldAlphabets.lower[ruFoldAlphabets.upper.indexOf('Ё')], 'е');
  assert.equal(ruFoldAlphabets.lower[ruFoldAlphabets.upper.indexOf('Е')], 'е');
  assert.match(foldText('room'), /^translate\(room, '[^']+', '[^']+'\)$/);
  assert.equal(folded('Ёлка'), 'елка');
  assert.ok(folded('Лазурин Александр').includes(folded('лазурин')));
});
