import assert from 'node:assert/strict';
import test from 'node:test';
import { assertVersionResult, mutateClassHeader, versionCases } from './java_class_version_test.mjs';

function header(major = 65, minor = 0) {
  const bytes = Buffer.alloc(16);
  bytes.writeUInt32BE(0xcafebabe, 0);
  bytes.writeUInt16BE(minor, 4);
  bytes.writeUInt16BE(major, 6);
  bytes.fill(42, 8);
  return bytes;
}

const successful = { status: 'passed', exitCode: 0, signal: null, timedOut: false,
  outputLimitExceeded: false, error: null, stdout: 'CLASS_VERSION_INITIALIZED\nCLASS_VERSION_MAIN\n', stderr: '' };
const rejected = { ...successful, status: 'failed', exitCode: 1, stdout: '',
  stderr: 'Exception in thread "main" java.lang.UnsupportedClassVersionError: rejected class\n' };

test('header mutations are isolated copies and record genuine controls separately', () => {
  const original = header();
  const before = Buffer.from(original);
  const mutation = mutateClassHeader(original, { major: 69, minor: 65535 });
  assert.equal(mutation.readUInt16BE(4), 65535);
  assert.equal(mutation.readUInt16BE(6), 69);
  assert.deepEqual(mutation.subarray(8), original.subarray(8));
  assert.deepEqual(original, before);
  const controls = versionCases().filter((entry) => !entry.mutation);
  assert.deepEqual(controls.map((entry) => entry.baseRelease), [21, 25]);
});

test('malformed magic and incomplete header are deliberate copy mutations', () => {
  const original = header();
  assert.equal(mutateClassHeader(original, { magic: 0xdeadbeef }).readUInt32BE(0), 0xdeadbeef);
  assert.equal(mutateClassHeader(original, { truncateBytes: 7 }).length, 7);
  assert.equal(original.length, 16);
  assert.equal(original.readUInt32BE(0), 0xcafebabe);
});

test('corpus covers historical boundary controls, every truncated header, and both illegal modern minors', () => {
  const cases = versionCases();
  assert.equal(new Set(cases.map(({ id }) => id)).size, cases.length);
  for (const [major, minor] of [[45, 3], [45, 65535], [55, 1], [55, 65535]]) {
    assert.ok(cases.some((entry) => entry.mutation?.major === major && entry.mutation.minor === minor && !entry.error));
  }
  for (const major of [65, 69]) {
    for (const minor of [1, 65534, 65535]) {
      assert.ok(cases.some((entry) => entry.mutation?.major === major && entry.mutation.minor === minor &&
        entry.error === 'java.lang.UnsupportedClassVersionError'));
    }
  }
  for (const major of [56, 64]) {
    assert.deepEqual(cases.find((entry) => entry.mutation?.major === major).nativeReleases, [25]);
  }
  assert.deepEqual(cases.filter((entry) => entry.mutation?.truncateBytes !== undefined)
    .map((entry) => entry.mutation.truncateBytes), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(cases.length, 25);
});

test('negative gate fails closed on status, timeout, wrong exception, and executed body', () => {
  const entry = { error: 'java.lang.UnsupportedClassVersionError' };
  assertVersionResult(rejected, entry, 'expected rejection');
  for (const mutation of [
    { exitCode: 0 }, { timedOut: true }, { signal: 'SIGTERM' }, { error: 'host exception' },
    { outputLimitExceeded: true }, { status: 'passed' },
    { stderr: 'java.lang.ClassFormatError: wrong subtype' },
    { stderr: 'java.lang.ClassFormatError: java.lang.UnsupportedClassVersionError' },
    { stderr: 'java.lang.ClassFormatError: top-level\nCaused by: java.lang.UnsupportedClassVersionError: nested' },
    { stderr: 'java.io.IOException: top-level\nCaused by: java.lang.UnsupportedClassVersionError: nested' },
    { stderr: 'TypeError: host error\nCaused by: java.lang.UnsupportedClassVersionError: nested' },
    { stderr: 'Caused by: java.lang.UnsupportedClassVersionError: nested only' },
    { stderr: 'Error: java.lang.UnsupportedClassVersionError: host error message' },
    { stderr: 'TypeError: java.lang.UnsupportedClassVersionError' },
    { stderr: 'unrelated message java.lang.UnsupportedClassVersionError' },
    { stderr: 'java.lang.UnsupportedClassVersionErrorUnexpected: wrong exception' },
    { stdout: 'CLASS_VERSION_INITIALIZED\n' },
    { stderr: 'java.lang.UnsupportedClassVersionError: CLASS_VERSION_MAIN' },
  ]) {
    assert.throws(() => assertVersionResult({ ...rejected, ...mutation }, entry, 'invalid rejection'));
  }
});

test('exact type parser accepts native linkage and Java uncaught-exception diagnostics', () => {
  const entry = { error: 'java.lang.UnsupportedClassVersionError' };
  for (const stderr of [
    'Error: LinkageError occurred while loading main class Example\n\tjava.lang.UnsupportedClassVersionError: rejected\n',
    'Exception in thread "main" java.lang.UnsupportedClassVersionError: rejected\n\tat java.lang.Thread.run(Thread.java:1)\n',
    'java.lang.UnsupportedClassVersionError: rejected\n',
  ]) {
    assertVersionResult({ ...rejected, stderr }, entry, 'actual Java exception diagnostic');
  }
});

test('positive gate requires both static initialization and main body with no diagnostics', () => {
  assertVersionResult(successful, {}, 'positive');
  for (const mutation of [{ stdout: 'CLASS_VERSION_MAIN\n' }, { stderr: 'warning' }, { exitCode: 1 }]) {
    assert.throws(() => assertVersionResult({ ...successful, ...mutation }, {}, 'invalid positive'));
  }
});
