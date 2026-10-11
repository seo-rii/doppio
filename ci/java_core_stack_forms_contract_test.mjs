import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import group, {carrierSources, mutateCoreStackPayload, inspectCoreStackPayload}
  from './java_core_stack_forms_cases.mjs';
import {readStructureLayout} from './java_class_structure_test.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const u2 = value => {const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes;};
const u4 = value => {const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes;};

// A deliberately synthetic metadata unit input. Genuine javac 21/25 carriers
// and native execution are separate required runner evidence, not this helper.
function syntheticCarrier(major = 65) {
  const pool = [], utf = value => {pool.push(Buffer.concat([Buffer.from([1]), u2(Buffer.byteLength(value)), Buffer.from(value)])); return pool.length;};
  const pair = (tag, first, second) => {pool.push(Buffer.concat([Buffer.from([tag]), u2(first), ...(second === undefined ? [] : [u2(second)])])); return pool.length;};
  const own = pair(7, utf('corehistorical/Target')), object = pair(7, utf('java/lang/Object'));
  const throwable = pair(7, utf('java/lang/Throwable'));
  const init = utf('<init>'), voidDescriptor = utf('()V');
  const initType = pair(12, init, voidDescriptor), objectInit = pair(10, object, initType), throwableInit = pair(10, throwable, initType);
  const counterName = utf('counter'), intType = utf('I'), counter = pair(9, own, pair(12, counterName, intType));
  const codeName = utf('Code'), stackMapName = utf('StackMapTable'), sourceName = utf('SourceFile'), sourceFile = utf('Target.java');
  const intDescriptor = utf('()I'), throwDescriptor = utf('(Ljava/lang/Throwable;)Ljava/lang/Throwable;');
  const throwableDescriptor = utf('()Ljava/lang/Throwable;');
  const definitions = [
    [init, voidDescriptor, 1, 1, 1, Buffer.from([42, 183, objectInit >> 8, objectInit & 255, 177])],
    [utf('value'), intDescriptor, 9, 1, 0, Buffer.from([8, 172])],
    [utf('rethrow'), throwDescriptor, 9, 1, 1, Buffer.from([42, 176])],
    [utf('getCounter'), intDescriptor, 9, 1, 0, Buffer.from([178, counter >> 8, counter & 255, 172])],
    [utf('makeThrowable'), throwableDescriptor, 9, 2, 0, Buffer.from([187, throwable >> 8, throwable & 255, 89, 183, throwableInit >> 8, throwableInit & 255, 176])]
  ];
  const methods = definitions.map(([name, descriptor, flags, maxStack, maxLocals, bytes]) => {
    const body = Buffer.concat([u2(maxStack), u2(maxLocals), u4(bytes.length), bytes, u2(0),
      u2(1), u2(stackMapName), u4(2), u2(0)]);
    return Buffer.concat([u2(flags), u2(name), u2(descriptor), u2(1), u2(codeName), u4(body.length), body]);
  });
  return Buffer.concat([u4(0xcafebabe), u2(0), u2(major), u2(pool.length + 1), ...pool,
    u2(0x31), u2(own), u2(object), u2(0), u2(1), u2(9), u2(counterName), u2(intType), u2(0),
    u2(methods.length), ...methods, u2(1), u2(sourceName), u4(2), u2(sourceFile)]);
}

const selected = id => {const entry = group.cases.find(item => item.id === id); assert.ok(entry, id); return entry;};
const method = (layout, name) => layout.methods.entries.find(item => item.name === name);
const replay = (original, edits) => edits.slice().sort((a, b) => b.offset - a.offset).reduce((bytes, edit) => {
  assert.equal(original.subarray(edit.offset, edit.offset + edit.removeBytes).toString('hex'), edit.beforeHex);
  return Buffer.concat([bytes.subarray(0, edit.offset), Buffer.from(edit.insertHex, 'hex'), bytes.subarray(edit.offset + edit.removeBytes)]);
}, Buffer.from(original));

test('25 explicit mutations retain eight major49/50 controls and all 17 valid stack forms', () => {
  assert.equal(group.id, 'stack-forms'); assert.equal(group.cases.length, 25);
  assert.equal(new Set(group.cases.map(entry => entry.id)).size, 25);
  assert.equal(group.cases.filter(entry => entry.payload.major === 49).length, 4);
  assert.equal(group.cases.filter(entry => entry.payload.major === 50).length, 4);
  assert.equal(group.cases.filter(entry => entry.payload.major === 'original-modern').length, 17);
  for (const entry of group.cases) {
    assert.equal(entry.kind, 'explicit-byte-mutation'); assert.equal(entry.entryDescriptor, '()V');
    assert.ok(['caseInteger', 'caseException'].includes(entry.entryMethod));
    assert.equal(entry.payload.binaryName, 'corehistorical.Target');
    assert.equal(entry.payload.resource, `core-stack-cases/${entry.id}/Target.bin`);
    assert.ok(entry.probes.every(probe => probe.className === 'corehistorical.Target' && probe.requiredOpcodes.length));
    assert.ok(entry.anchors.JLS.every(anchor => !anchor.startsWith('14.')));
  }
  assert.deepEqual(group.cases.slice(8).map(entry => entry.trace[0]), [
    'value=11', 'value=212', 'value=3123', 'value=212', 'value=1212', 'value=11',
    'value=23123', 'value=212', 'value=341234', 'value=23123', 'value=3123', 'value=212',
    'value=1', 'value=1', 'value=1', 'value=21', 'value=1'
  ]);
});

test('all anchor IDs exist in both edition source indices without a JLS statement claim', () => {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'ci/plan_spec_source_index.json')));
  for (const entry of group.cases) for (const [spec, anchors] of Object.entries(entry.anchors))
    for (const edition of [21, 25]) for (const anchor of anchors)
      assert.ok(index.units.some(unit => unit.id === `${spec}-${edition}:${spec.toLowerCase()}-${anchor}`), `${spec}-${edition}:${anchor}`);
});

test('carrier source is deterministic and distinct from the resource-only two-class driver', () => {
  assert.deepEqual(carrierSources(), carrierSources()); assert.equal(carrierSources().length, 1);
  const carrier = carrierSources()[0]; assert.equal(carrier.binaryName, 'corehistorical.Target');
  assert.match(carrier.text, /public static int value\(\)\s*\{\s*return 5;/);
  assert.match(carrier.text, /public static Throwable rethrow\(Throwable value\)/);
  assert.match(carrier.text, /return counter;/); assert.match(carrier.text, /new Throwable\(/);
  const source = fs.readFileSync(path.join(root, group.source), 'utf8');
  assert.equal((source.match(/\bclass\s+\w+/g) || []).length, 2, 'Only main driver and named payload loader');
  assert.doesNotMatch(source, /Target\.class|ClassLoader\.getSystemClassLoader/);
  assert.match(source, /core-stack-cases\//); assert.match(source, /Target\.bin/);
  assert.match(source, /args\.length != IDS\.length/);
  assert.match(source, /!IDS\[i\]\.equals\(args\[i\]\)/);
  for (const entry of group.cases) assert.ok(source.includes('"' + entry.id + '"'));
  assert.match(source, /failure\.getCause\(\) != original/);
});

test('every edit replays from untouched modern carrier bytes with exact before/after hashes', () => {
  for (const major of [65, 69]) for (const entry of group.cases) {
    const original = syntheticCarrier(major), saved = Buffer.from(original);
    const first = mutateCoreStackPayload(original, entry), second = mutateCoreStackPayload(original, entry);
    assert.deepEqual(original, saved); assert.notEqual(first.bytes, original);
    assert.deepEqual(first.bytes, second.bytes); assert.deepEqual(first.edits, second.edits);
    assert.deepEqual(first.bytes, replay(original, first.edits));
    assert.equal(first.originalSha256, sha(original)); assert.equal(first.mutatedSha256, sha(first.bytes));
    assert.equal(first.edits.length, entry.payload.major === 'original-modern' ? 1 : 2);
    for (const edit of first.edits) {assert.ok(edit.reason); assert.equal(edit.beforeHex.length, edit.removeBytes * 2);}
    const proof = inspectCoreStackPayload(first.bytes, entry);
    assert.equal(proof.kind, 'explicit-byte-mutation'); assert.equal(proof.major, entry.payload.major === 'original-modern' ? major : entry.payload.major);
    assert.equal(proof.classSha256, first.mutatedSha256);
    assert.ok(Buffer.byteLength(JSON.stringify(proof)) < 20000, 'Far nop padding must not flood the proof ledger');
  }
});

test('replacement removes only the replaced Code nested frames and preserves every other member and class attribute', () => {
  const original = syntheticCarrier(), before = readStructureLayout(original);
  for (const entry of group.cases) {
    const changed = mutateCoreStackPayload(original, entry).bytes, after = readStructureLayout(changed);
    const name = entry.entryMethod === 'caseException' ? 'rethrow' : 'value';
    assert.equal(method(after, name).code.nameIndex, method(before, name).code.nameIndex);
    assert.equal(method(after, name).code.attributes.entries.length, 0);
    for (const item of before.methods.entries) if (item.name !== name) {
      const retained = method(after, item.name);
      assert.deepEqual(changed.subarray(retained.start, retained.end), original.subarray(item.start, item.end));
    }
    assert.deepEqual(changed.subarray(after.attributes.countOffset), original.subarray(before.attributes.countOffset));
    assert.deepEqual(changed.subarray(8, after.flagsOffset), original.subarray(8, before.flagsOffset), 'No constant-pool edits');
  }
});

test('independent decoder proves wide return-address slot and positive far target in both old major policies', () => {
  for (const major of [49, 50]) {
    const entry = selected(`stack-legacy-jsr-wide-${major}`);
    const proof = inspectCoreStackPayload(mutateCoreStackPayload(syntheticCarrier(), entry).bytes, entry);
    assert.equal(proof.codeLength, 40011); assert.equal(proof.maxLocals, 301);
    assert.deepEqual(proof.branches, [{pc: 2, opcode: 'jsr_w', offset: 39998, target: 40000}]);
    assert.deepEqual(proof.wide, [{pc: 40000, opcode: 'astore', index: 300}, {pc: 40007, opcode: 'ret', index: 300}]);
    assert.equal(proof.opcodeCounts.nop, 39991);
  }
});

test('finally mutation retains exact catch-all interval and counter read/write symbolic identity', () => {
  const entry = selected('stack-legacy-finally-50');
  const proof = inspectCoreStackPayload(mutateCoreStackPayload(syntheticCarrier(), entry).bytes, entry);
  assert.deepEqual(proof.handlers, [{start: 0, end: 2, target: 2, catchType: 0}]);
  assert.equal(proof.counter.owner, 'corehistorical.Target'); assert.equal(proof.counter.name, 'counter');
  assert.equal(proof.counter.descriptor, 'I'); assert.equal(proof.counter.accesses.length, 2);
  assert.deepEqual(proof.counter.accesses.map(access => [access.pc, access.opcode]), [[9, 'getstatic'], [14, 'putstatic']]);
});

test('decoder evidence rejects changed literal, conversion, stack opcode, reconstruction order and extra code', () => {
  for (const [id, alter] of [
    ['stack-swap', bytes => {bytes[1] = 4;}],
    ['stack-dup2-cat2', bytes => {bytes[1] = 135;}],
    ['stack-swap', bytes => {bytes[2] = 0;}],
    ['stack-swap', bytes => {bytes[12] = 0;}]
  ]) {
    const entry = selected(id), changed = mutateCoreStackPayload(syntheticCarrier(), entry).bytes;
    const layout = readStructureLayout(changed), code = method(layout, 'value').code;
    alter(changed.subarray(code.instructionsOffset, code.instructionsOffset + code.codeLength));
    assert.throws(() => inspectCoreStackPayload(changed, entry), id);
  }
});

test('legacy proof rejects changed major, handler and return-address index rather than trusting labels', () => {
  const original = syntheticCarrier(), entry = selected('stack-legacy-finally-49');
  for (const change of ['major', 'handler', 'ret']) {
    const bytes = mutateCoreStackPayload(original, entry).bytes, layout = readStructureLayout(bytes), code = method(layout, 'rethrow').code;
    if (change === 'major') bytes.writeUInt16BE(51, 6);
    if (change === 'handler') bytes.writeUInt16BE(1, code.handlersOffset + 2);
    if (change === 'ret') bytes[code.instructionsOffset + 18] = 1;
    assert.throws(() => inspectCoreStackPayload(bytes, entry), change);
  }
});

test('unknown cases, already-mutated carriers and unsupported original versions fail closed', () => {
  const entry = selected('stack-swap'), original = syntheticCarrier();
  assert.throws(() => mutateCoreStackPayload(original, {...entry, id: 'unknown'}));
  assert.throws(() => mutateCoreStackPayload(syntheticCarrier(50), entry));
  assert.throws(() => mutateCoreStackPayload(mutateCoreStackPayload(original, entry).bytes, entry));
});
