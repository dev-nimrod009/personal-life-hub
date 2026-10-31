import test from 'node:test';
import assert from 'node:assert/strict';
import { getMealBudget } from './data';

test('getMealBudget returns default 0 when not set', () => {
  const budget = getMealBudget('test-user-nonexistent');
  assert.equal(budget, 0);
});
