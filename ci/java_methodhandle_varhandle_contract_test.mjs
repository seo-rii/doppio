import assert from 'node:assert/strict';
import test from 'node:test';
import * as harness from './java_methodhandle_varhandle_test.mjs';
import * as core from './java_methodhandle_core_test.mjs';
import * as collection from './java_methodhandle_collection_test.mjs';
import {registerMethodHandleContractTests} from './java_methodhandle_contract_suite.mjs';
import {proveCoreGroup} from './java_core_bytecode.mjs';

registerMethodHandleContractTests(harness, {phaseId: 'C3', caseCount: 48, groupCount: 3,
  harnessFilename: 'java_methodhandle_varhandle_test.mjs', contractFilename: 'java_methodhandle_varhandle_contract_test.mjs',
  ledgerBase: 'java-methodhandle-varhandle'});

test('C1, C2 and C3 cannot substitute inventories, raw receipts or official ledger scopes', () => {
  assert.deepEqual(harness.methodHandleGroups.map(group => group.id),
    ['varhandle-fields', 'varhandle-arrays', 'varhandle-interop']);
  assert.deepEqual(harness.methodHandleGroups.map(group => group.cases.length), [16, 16, 16]);
  assert.deepEqual(harness.methodHandleGroups.map(group => group.mainClass), [
    'classes.modern_test.VarHandleFieldsFinal', 'classes.modern_test.VarHandleArraysFinal',
    'classes.modern_test.VarHandleInteropFinal'
  ]);
  assert.deepEqual(harness.methodHandleGroups.map(group => group.completionMarker),
    ['VARHANDLE_FIELDS_OK', 'VARHANDLE_ARRAYS_OK', 'VARHANDLE_INTEROP_OK']);
  for (const first of [core, collection, harness]) for (const second of [core, collection, harness]) {
    if (first === second) continue;
    assert.throws(() => first.assertMethodHandleLedger(second.createMethodHandleLedger()));
    const mixed = first.createMethodHandleLedger();
    mixed.results[0] = structuredClone(second.createMethodHandleLedger().results[0]);
    assert.throws(() => first.assertMethodHandleLedger(mixed));
    assert.throws(() => first.createMethodHandleLedger('browser', second.methodHandleGroups));
  }
  assert.equal(core.validateMethodHandleGroups(), 60);
  assert.equal(collection.validateMethodHandleGroups(), 48);
  assert.equal(harness.validateMethodHandleGroups(), 48);
});

test('single-thread C3 execution never promotes memory-order or concurrent-visibility conformance', () => {
  const flags = ['varHandleMemoryOrderingConformanceProven', 'varHandleConcurrentVisibilityConformanceProven'];
  for (const mode of ['browser', 'native-only', 'diagnostic']) {
    const ledger = harness.createMethodHandleLedger(mode);
    for (const flag of flags) {
      assert.equal(ledger[flag], false);
      for (const replacement of [true, 'false', 0, null, undefined]) {
        const changed = structuredClone(ledger);
        changed[flag] = replacement;
        assert.throws(() => harness.assertMethodHandleLedger(changed));
      }
      const missing = structuredClone(ledger);
      delete missing[flag];
      assert.throws(() => harness.assertMethodHandleLedger(missing));
    }
  }
});

test('C3 pins only the explicitly limited native unsupported/type-mismatch priority case', () => {
  const cases = harness.methodHandleGroups.flatMap(group => group.cases);
  const pinned = cases.filter(entry => entry.oracleKind === 'pinned-native-regression');
  assert.deepEqual(pinned.map(entry => entry.id), ['vh-interop-unsupported-modes']);
  assert.ok(pinned[0].limitations.some(limit => limit.includes('precedence') && limit.includes('not a normative priority claim')));
  assert.ok(pinned[0].trace[0].includes('pinned-mixed-priority='));
  for (const release of [21, 25]) assert.ok(pinned[0].primarySources.some(source =>
    source.includes('/javase/' + release + '/docs/api/') && source.endsWith('/VarHandle.html')));
  const init = cases.find(entry => entry.id === 'vh-field-static-initialization');
  assert.equal(init.oracleKind, 'specification');
  assert.ok(init.trace[0].includes('factory/query-timing=unclaimed'));
  assert.ok(init.limitations.some(limit => limit.includes('not a prohibition on earlier factory initialization')));
});

test('C3 reflection placeholders cannot replace direct signature-polymorphic execution evidence', () => {
  const group = harness.methodHandleGroups.find(entry => entry.id === 'varhandle-interop');
  const reflected = group.cases.find(entry => entry.id === 'vh-reflective-access-placeholders');
  assert.ok(reflected.limitations.some(limit => limit.includes('Lookup.unreflect(Method).asFixedArity()')));
  assert.ok(reflected.limitations.some(limit => limit.includes('Method.invoke is excluded')));
  assert.ok(reflected.probes[0].symbolicOperands.some(operand => operand.owner === 'java.lang.invoke.VarHandle' &&
    operand.name === 'get' && operand.descriptor === '([JI)J' && operand.opcode === 'invokevirtual' && operand.tag === 10));
  assert.ok(reflected.probes.slice(1).some(probe => probe.symbolicOperands.some(operand =>
    operand.owner === 'java.lang.invoke.MethodHandle' && operand.name === 'invokeExact' &&
    operand.descriptor === '(Ljava/lang/invoke/VarHandle;[Ljava/lang/Object;)Ljava/lang/Object;')));
  for (const probe of reflected.probes) assert.ok(!probe.symbolicOperands.some(operand =>
    operand.owner === 'java.lang.reflect.Method' && operand.name === 'invoke'));
});

test('every C3 case has reachable actual-Code member operands rather than a metadata-only claim', () => {
  let probes = 0;
  for (const group of harness.methodHandleGroups) for (const entry of group.cases) {
    assert.equal(entry.probes[0].method, entry.entryMethod);
    assert.equal(entry.probes[0].descriptor, entry.entryDescriptor);
    for (const probe of entry.probes) {
      probes++;
      assert.ok(probe.symbolicOperands.length > 0);
      assert.ok(probe.symbolicOperands.some(operand => ['invokevirtual', 'invokestatic'].includes(operand.opcode) &&
        operand.tag === 10 && (operand.owner.startsWith('java.lang.invoke.') || operand.owner === 'java.lang.Class' ||
          operand.owner === 'java.lang.reflect.Method')));
    }
  }
  assert.equal(probes, 93);
  const calls = harness.methodHandleGroups.flatMap(group => group.cases.flatMap(entry => entry.probes
    .flatMap(probe => probe.symbolicOperands))).filter(operand => operand.owner === 'java.lang.invoke.VarHandle');
  for (const name of ['get', 'getVolatile', 'getAcquire', 'getOpaque', 'set', 'setVolatile', 'setRelease', 'setOpaque',
    'compareAndSet', 'compareAndExchange', 'compareAndExchangeAcquire', 'compareAndExchangeRelease',
    'weakCompareAndSetPlain', 'weakCompareAndSet', 'weakCompareAndSetAcquire', 'weakCompareAndSetRelease',
    'getAndSet', 'getAndSetAcquire', 'getAndSetRelease', 'getAndAdd', 'getAndAddAcquire', 'getAndAddRelease',
    'getAndBitwiseOr', 'getAndBitwiseOrAcquire', 'getAndBitwiseOrRelease', 'getAndBitwiseAnd', 'getAndBitwiseAndAcquire',
    'getAndBitwiseAndRelease', 'getAndBitwiseXor', 'getAndBitwiseXorAcquire', 'getAndBitwiseXorRelease'])
    assert.ok(calls.some(operand => operand.name === name && operand.opcode === 'invokevirtual' && operand.tag === 10));
});

test('VarHandle Code proofs reject wrong descriptor/tag/owner and uncalled reflected decoys', () => {
  const className = 'VarHandleCodeFixture';
  const target = {opcode: 'invokevirtual', tag: 10, owner: 'java.lang.invoke.VarHandle', name: 'getAndAdd', descriptor: '([JIJ)J'};
  const group = {mainClass: className, cases: [{id: 'varhandle-code', entryMethod: 'caseShape', entryDescriptor: '()V',
    probes: [{method: 'caseShape', descriptor: '()V', requiredOpcodes: ['invokevirtual'], symbolicOperands: [target]}]}]};
  const body = (name, descriptor, instructions) => ({name, descriptor, instructions, codeSha256: 'a'.repeat(64),
    codeLength: 4, maxStack: 6, maxLocals: 0, handlers: []});
  const call = (owner, name, descriptor, tag = 10) => ({name: 'invokevirtual', opcode: 182, pc: 0,
    cp: {tag, owner, name, descriptor}});
  const classes = new Map([[className, {file: {path: className + '.class', sha256: 'b'.repeat(64)}, methods: new Map([
    ['main([Ljava/lang/String;)V', body('main', '([Ljava/lang/String;)V', [call(className, 'caseShape', '()V')])],
    ['caseShape()V', body('caseShape', '()V', [call(target.owner, target.name, target.descriptor)])],
    ['uncalledDecoy()V', body('uncalledDecoy', '()V', [call(target.owner, target.name, target.descriptor)])]
  ])}]]);
  assert.equal(proveCoreGroup(group, classes)[0].probes[0].matches.at(-1).cp.descriptor, '([JIJ)J');
  for (const replacement of [call(target.owner, target.name, '([JII)J'), call(target.owner, target.name, target.descriptor, 11),
    call('java.lang.invoke.MethodHandle', target.name, target.descriptor),
    call('java.lang.reflect.Method', 'invoke', '(Ljava/lang/Object;[Ljava/lang/Object;)Ljava/lang/Object;')]) {
    classes.get(className).methods.get('caseShape()V').instructions = [replacement];
    assert.throws(() => proveCoreGroup(group, classes));
  }
  classes.get(className).methods.get('caseShape()V').instructions = [call(target.owner, target.name, target.descriptor)];
  classes.get(className).methods.get('main([Ljava/lang/String;)V').instructions = [];
  assert.throws(() => proveCoreGroup(group, classes));
});
