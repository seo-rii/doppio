import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {loadingConstraintCases, loadingConstraintSources, inspectConstraintDeclarations,
  assertLoadingConstraintsResult, checkLoadingConstraintsExecution, assertLoadingConstraintsClasspath,
  assertLoadingConstraintsProvenance, writeLoadingConstraintsLedger, loadingConstraintsLedgerScope, loadingConstraintOracleBoundary}
  from './java_loading_constraints_test.mjs';

function success(host = 'node') {
  return {status: 'passed', exitCode: 0, signal: null, timedOut: false, outputLimitExceeded: false,
    error: null, stderr: '', stdout: loadingConstraintCases().flatMap(entry => entry.expectedTraces[host].map(event => `${entry.id}=${event}`))
      .concat(['LOADING_CONSTRAINTS_OK', '']).join('\n')};
}

// Synthetic constant-pool reader unit only; never executed or used as javac evidence.
function referenceFixture(shape, actualOwner = false) {
  const u2 = n => { const b = Buffer.alloc(2); b.writeUInt16BE(n); return b; };
  const u4 = n => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };
  const pool = [], add = (tag, ...parts) => { pool.push(Buffer.concat([Buffer.from([tag]), ...parts])); return pool.length; };
  const utf = name => add(1, u2(Buffer.byteLength(name)), Buffer.from(name));
  const cls = name => add(7, u2(utf(name)));
  const self = cls(`constraints/${shape}CallerC`), object = cls('java/lang/Object');
  const owner = cls(`constraints/${shape}${actualOwner ? 'BaseA' : 'SubB'}`);
  const nat = add(12, u2(utf(shape === 'Field' ? 'value' : 'exchange')),
    u2(utf(shape === 'Field' ? 'Lconstraints/Token;' : '(Lconstraints/Token;)Lconstraints/Token;')));
  add(shape === 'Field' ? 9 : shape === 'Static' ? 10 : 11, u2(owner), u2(nat));
  return Buffer.concat([u4(0xcafebabe), u2(0), u2(65), u2(pool.length + 1), ...pool,
    u2(0x21), u2(self), u2(object), u2(0), u2(0), u2(0), u2(0)]);
}

test('B4b mandatory inventory retains declaring-owner, descriptors, late records and rollback cases', () => {
  const cases = loadingConstraintCases();
  assert.equal(cases.length, 31);
  assert.equal(new Set(cases.map(entry => entry.id)).size, 31);
  assert.equal(cases.filter(entry => entry.kind === 'inherited-declaration-loaders').length, 10);
  assert.equal(cases.filter(entry => entry.kind === 'declared-override').length, 2);
  assert.equal(cases.filter(entry => entry.kind === 'non-constraining-control').length, 4);
  assert.equal(cases.filter(entry => entry.kind === 'resolved-declaration-loader').length, 6);
  assert.equal(cases.filter(entry => entry.kind === 'late-record-and-corrected-retry').length, 8);
  assert.equal(cases.filter(entry => entry.kind === 'transitive-failed-edge-rollback').length, 1);
  for (const entry of cases) {
    assert.equal(entry.packageId, 'JVM-002'); assert.equal(entry.mutation, false);
    assert.ok(entry.trace.includes('token-not-initialized'));
    assert.ok(entry.payloads.includes('constraints.Token'));
    for (const release of [21, 25]) assert.ok(entry.specificationRefs[release].includes(
      `https://docs.oracle.com/javase/specs/jvms/se${release}/html/jvms-5.html#jvms-5.3.4`));
  }
});

test('three-loader positive and negative distinguish selected declaration owner from child owner', () => {
  for (const prefix of ['inherited-scalar', 'inherited-abstract', 'array1', 'array2', 'return']) {
    const shared = loadingConstraintCases().find(entry => entry.id === `${prefix}-shared`);
    const distinct = loadingConstraintCases().find(entry => entry.id === `${prefix}-distinct`);
    assert.deepEqual(shared.trace, ['base-interface-token-shared-child-distinct', 'accepted@prepare',
      ...(prefix === 'inherited-abstract' ? ['abstract-bridge-published', 'abstract-bridge-initializations=1'] : []), 'token-not-initialized']);
    assert.deepEqual(distinct.trace, ['base-token-distinct-child-interface-shared',
      'java.lang.LinkageError@prepare', ...(prefix === 'inherited-abstract' ? ['abstract-bridge-published', 'abstract-bridge-initializations=0'] : []),
      'token-not-initialized']);
  }
});

test('one explicit native/spec boundary cannot become neutral acceptance or silently disappear', () => {
  const boundary = loadingConstraintOracleBoundary();
  assert.equal(boundary.strictNativeParity, false);
  assert.equal(boundary.crossHostSpecAgreement, false);
  assert.equal(boundary.nativeParityCaseCount, 30);
  assert.equal(boundary.documentedOracleDifferenceCaseCount, 1);
  assert.deepEqual(boundary.oracleDifferences.map(entry => entry.id), ['inherited-abstract-distinct']);
  const difference = boundary.oracleDifferences[0];
  assert.equal(difference.nativeExpected, 'accepted@prepare');
  assert.equal(difference.specExpected, 'java.lang.LinkageError@prepare');
  assert.deepEqual(difference.nativeFeatures, [21, 25]);
  assert.equal(difference.selectedMethodFlags, 0x401);
  assert.deepEqual(difference.ownBridgeInstanceMethods, []);
  assert.equal(assertLoadingConstraintsResult(success('native'), 'native unit', 'native').length, 31);
  assert.throws(() => assertLoadingConstraintsResult(success('native'), 'guest unit', 'node'));
  assert.throws(() => assertLoadingConstraintsResult(success('node'), 'native unit', 'native'));
  assert.throws(() => assertLoadingConstraintsResult(success(), 'unknown', 'other'));
  for (const host of ['native', 'node', 'chromium']) {
    const result = success(host);
    for (const event of loadingConstraintCases().find(entry => entry.id === difference.id).expectedTraces[host]) {
      assert.throws(() => assertLoadingConstraintsResult({...result,
        stdout: result.stdout.replace(`${difference.id}=${event}\n`, '')}, 'missing boundary evidence', host));
    }
  }
});

test('actual declaration owner is distinct from symbolic owner for all three resolution kinds', () => {
  for (const shape of ['Field', 'Static', 'Interface']) {
    const result = inspectConstraintDeclarations(referenceFixture(shape), `constraints.${shape}CallerC`);
    assert.equal(result.references.length, 1);
    assert.equal(result.references[0].owner, `constraints/${shape}SubB`);
    assert.throws(() => inspectConstraintDeclarations(referenceFixture(shape, true), `constraints.${shape}CallerC`), /symbolic intermediary/);
  }
});

test('genuine source plan supplies exact resource inventory with scalar, array and return-only descriptors', () => {
  const sources = loadingConstraintSources();
  assert.equal(sources.length, 38);
  assert.equal(new Set(sources.map(entry => entry.binaryName)).size, sources.length);
  assert.deepEqual([...new Set(loadingConstraintCases().flatMap(entry => entry.payloads))].sort(),
    sources.map(entry => entry.binaryName).sort());
  const source = name => sources.find(entry => entry.binaryName === `constraints.${name}`).text;
  assert.match(source('ArrayOneBaseA'), /Token\[\] exchange\(Token\[\] value\)/);
  assert.match(source('ArrayTwoBaseA'), /Token\[\]\[\] exchange\(Token\[\]\[\] value\)/);
  assert.match(source('ReturnOnlyBaseA'), /Token exchange\(\)/);
  assert.match(source('AbstractBaseA'), /abstract Token exchange/);
  assert.match(source('AbstractInterfaceB'), /default Token exchange/);
  assert.ok(!source('AbstractBridgeC').includes('exchange'));
  assert.match(source('AbstractBridgeC'), /static \{ classes\.modern_test\.JavaLoadingConstraints\.effect\(\); \}/);
  assert.match(source('PrimitiveBaseA'), /int\[\]\[\] exchange/);
  assert.deepEqual(loadingConstraintSources(), sources);
});

test('late records require zero eager loads, failed publication rollback, and corrected identity retry', () => {
  for (const entry of loadingConstraintCases().filter(item => item.kind === 'late-record-and-corrected-retry')) {
    assert.deepEqual(entry.trace.slice(1), ['token-loads=0', 'first-token-recorded', 'java.lang.LinkageError@late-define',
      'failed-token-not-published', 'corrected-delegation-accepted', 'token-not-initialized']);
  }
  assert.deepEqual(loadingConstraintCases().find(entry => entry.id === 'failed-edge-rollback').trace,
    ['accepted@first-edge', 'middle-token-not-loaded', 'java.lang.LinkageError@conflicting-edge', 'failed-edge-rolled-back', 'token-not-initialized']);
});

test('complete exact traces reject wrong owner results, missing cases, effects, initialization and failure taxonomy', () => {
  const result = success();
  assert.equal(assertLoadingConstraintsResult(result).length, 31);
  assert.doesNotThrow(() => assertLoadingConstraintsResult({...result, stdout: result.stdout.replaceAll('\n', '\r\n')}));
  for (const change of [{status: 'failed'}, {exitCode: 1}, {stderr: 'warning'}, {timedOut: true},
    {signal: 'SIGKILL'}, {outputLimitExceeded: true}, {error: 'launch'},
    {stdout: result.stdout.replace('inherited-scalar-shared=accepted@prepare', 'inherited-scalar-shared=java.lang.LinkageError@prepare')},
    {stdout: result.stdout.replace('java.lang.LinkageError@prepare', 'java.lang.VerifyError@prepare')},
    {stdout: result.stdout.replace('static-distinct=target-effects=0', 'static-distinct=target-effects=1')},
    {stdout: result.stdout.replace('late-array2=token-loads=0', 'late-array2=token-loads=1')},
    {stdout: result.stdout.replace('late-return=corrected-delegation-accepted\n', '')},
    {stdout: result.stdout.replace('token-not-initialized', 'TOKEN_INITIALIZED')},
    {stdout: result.stdout.replace('LOADING_CONSTRAINTS_OK\n', '')}, {stdout: result.stdout + 'extra\n'}]) {
    assert.throws(() => assertLoadingConstraintsResult({...result, ...change}));
  }
});

test('failed raw host results survive even subsequent input-integrity failures', async () => {
  const record = {release: 21, status: 'running', executions: []};
  await checkLoadingConstraintsExecution(record, 'native', async () => success('native'));
  assert.equal(record.executions[0].outcomes.length, 31);
  assert.equal(record.executions[0].expectationProfile, 'pinned-native');
  const failed = {...success(), status: 'failed', exitCode: 1};
  await assert.rejects(checkLoadingConstraintsExecution(record, 'node', async () => failed));
  assert.deepEqual(record.executions[1].result, failed);
  let checks = 0;
  await assert.rejects(checkLoadingConstraintsExecution(record, 'chromium', async () => success(), () => {
    if (++checks === 2) throw new Error('Changed input');
  }), /Changed input/);
  assert.deepEqual(record.executions[2].result, success());
  assert.equal(record.status, 'failed');
  await assert.rejects(checkLoadingConstraintsExecution(record, 'node', async () => { throw new Error('Launch failure'); }), /Launch failure/);
  assert.match(record.executions[3].error, /Launch failure/);
});

test('classpath admits only genuine driver class files and enumerated binary resources', () => {
  const driver = ['classes/modern_test/JavaLoadingConstraints$PayloadLoader.class', 'classes/modern_test/JavaLoadingConstraints.class']
    .map((filename, index) => ({path: filename, size: index + 1, sha256: String(index).repeat(64)}));
  const payload = {resource: {path: 'loading-constraint-cases/constraints/Token.bin', size: 3, sha256: '2'.repeat(64)}};
  assertLoadingConstraintsClasspath([...driver, payload.resource], driver, [payload]);
  assert.throws(() => assertLoadingConstraintsClasspath(driver, driver, [payload]));
  assert.throws(() => assertLoadingConstraintsClasspath([...driver, payload.resource, {path: 'constraints/Token.class', size: 3, sha256: '2'.repeat(64)}], driver, [payload]));
  const wrong = {resource: {...payload.resource, path: 'constraints/Token.class'}};
  assert.throws(() => assertLoadingConstraintsClasspath([...driver, wrong.resource], driver, [wrong]));
});

test('shared provenance gate requires clean unchanged committed sources', () => {
  const clean = {commit: 'a'.repeat(40), trackedDirty: false};
  assertLoadingConstraintsProvenance(clean, clean);
  assert.throws(() => assertLoadingConstraintsProvenance({...clean, trackedDirty: true}, clean));
  assert.throws(() => assertLoadingConstraintsProvenance(clean, {...clean, trackedDirty: true}));
  assert.throws(() => assertLoadingConstraintsProvenance(clean, {...clean, commit: 'b'.repeat(40)}));
});

test('scoped atomic ledger writes retain unrelated, linked and invalid targets', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-constraints-ledger-unit-'));
  try {
    const filename = path.join(directory, 'ledger.json');
    const ledger = {schemaVersion: 1, scope: loadingConstraintsLedgerScope, status: 'failed'};
    writeLoadingConstraintsLedger(filename, ledger);
    assert.deepEqual(JSON.parse(fs.readFileSync(filename)), ledger);
    assert.equal(fs.statSync(filename).mode & 0o777, 0o600);
    writeLoadingConstraintsLedger(filename, {...ledger, status: 'passed'});
    const unrelated = path.join(directory, 'other.json'); fs.writeFileSync(unrelated, '{}');
    assert.throws(() => writeLoadingConstraintsLedger(unrelated, ledger));
    assert.equal(fs.readFileSync(unrelated, 'utf8'), '{}');
    const link = path.join(directory, 'link.json'); fs.symlinkSync(filename, link);
    assert.throws(() => writeLoadingConstraintsLedger(link, ledger));
    const hard = path.join(directory, 'hard.json'); fs.linkSync(filename, hard);
    assert.throws(() => writeLoadingConstraintsLedger(hard, ledger));
    assert.throws(() => writeLoadingConstraintsLedger(filename, ledger));
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});
