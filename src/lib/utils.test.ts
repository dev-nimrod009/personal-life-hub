import test from 'node:test';
import assert from 'node:assert/strict';
import { getInitials } from './utils';

test('getInitials picks first letter of each name for two names', () => {
  assert.equal(getInitials('John Doe'), 'JD');
  assert.equal(getInitials('Jane Mary Smith'), 'JM');
  assert.equal(getInitials('Alice'), 'AL');
  assert.equal(getInitials('user@example.com'), 'US');
});
