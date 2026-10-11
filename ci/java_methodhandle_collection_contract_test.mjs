import assert from 'node:assert/strict';
import test from 'node:test';
import * as harness from './java_methodhandle_collection_test.mjs';
import * as core from './java_methodhandle_core_test.mjs';
import {registerMethodHandleContractTests} from './java_methodhandle_contract_suite.mjs';

registerMethodHandleContractTests(harness, {phaseId: 'C2', caseCount: 48, groupCount: 3,
  harnessFilename: 'java_methodhandle_collection_test.mjs', contractFilename: 'java_methodhandle_collection_contract_test.mjs',
  ledgerBase: 'java-methodhandle-collection'});

test('C1 and C2 evidence cannot be substituted or merge their independent inventories', () => {
  assert.deepEqual(harness.methodHandleGroups.map(group => group.id),
    ['methodhandle-arrays', 'methodhandle-routing', 'methodhandle-control-flow']);
  assert.deepEqual(harness.methodHandleGroups.map(group => group.cases.length), [16, 16, 16]);
  const first = core.createMethodHandleLedger(), second = harness.createMethodHandleLedger();
  assert.throws(() => harness.assertMethodHandleLedger(first));
  assert.throws(() => core.assertMethodHandleLedger(second));
  const mixed = structuredClone(second); mixed.results[0] = structuredClone(first.results[0]);
  assert.throws(() => harness.assertMethodHandleLedger(mixed));
  assert.equal(core.validateMethodHandleGroups(), 60); assert.equal(harness.validateMethodHandleGroups(), 48);
});

test('the counted-range documentation conflict remains an explicit pinned-native boundary', () => {
  const cases = harness.methodHandleGroups.flatMap(group => group.cases);
  assert.deepEqual(cases.filter(entry => entry.oracleKind === 'pinned-native-regression').map(entry => entry.id),
    ['cf-counted-range-wide-state', 'cf-counted-empty-reversed', 'cf-component-throwable-identity']);
  for (const entry of cases.filter(entry => entry.oracleKind === 'pinned-native-regression')) {
    assert.ok(entry.limitations.some(value => value.includes('internally inconsistent') &&
      value.includes('not a normative ordering claim')));
    for (const release of [21, 25]) assert.ok(entry.primarySources.some(url =>
      url.includes('/javase/' + release + '/') &&
      url.endsWith('#countedLoop(' + Array(4).fill('java.lang.invoke.MethodHandle').join(',') + ')')));
  }
});
