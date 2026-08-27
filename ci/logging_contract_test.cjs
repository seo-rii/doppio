'use strict';

const assert = require('assert');
const logging = require('../build/release-cli/src/logging');

const objectValue = { label: 'value' };
const cases = [
  [logging.debug_var(7), '7'],
  [logging.debug_var(false), 'false'],
  [logging.debug_var(objectValue), '[object Object]'],
  [logging.debug_vars([7, false, 'value']), ['7', 'false', 'value']],
  [logging.debug_var(null), '!'],
  [logging.debug_var(undefined), 'undef'],
];

for (const [actual, expected] of cases) {
  assert.deepStrictEqual(actual, expected);
}

console.log(`logging-contract:${cases.length}:ok`);
