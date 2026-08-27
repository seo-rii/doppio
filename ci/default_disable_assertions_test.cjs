'use strict';

const assert = require('assert');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const releaseCliRoot = process.env.DOPPIO_RELEASE_CLI_ROOT === undefined ?
  path.join(repoRoot, 'build', 'release-cli') :
  path.resolve(process.env.DOPPIO_RELEASE_CLI_ROOT);
const doppio = require(path.join(releaseCliRoot, 'src', 'doppiojvm'));

const first = doppio.VM.JVM.getDefaultOptions(path.join(repoRoot, 'default-options-first'));
const second = doppio.VM.JVM.getDefaultOptions(path.join(repoRoot, 'default-options-second'));
let scenarioCount = 0;

assert.equal(Array.isArray(first.disableAssertions), true);
assert.equal(Array.isArray(second.disableAssertions), true);
assert.deepEqual(first.disableAssertions, []);
assert.deepEqual(second.disableAssertions, []);
scenarioCount += 1;

assert.notStrictEqual(first.disableAssertions, second.disableAssertions);
first.disableAssertions.push('example.DisabledAssertions');
assert.deepEqual(second.disableAssertions, []);
scenarioCount += 1;

console.log(`default-disable-assertions:${scenarioCount}:ok`);
