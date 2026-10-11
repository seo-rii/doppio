import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readStructureLayout} from './java_class_structure_test.mjs';
import {decodeCoreCode} from './java_core_bytecode.mjs';

// These are explicitly mutated payloads carried by genuine javac 21/25 files.
// Header edits do not make the historical controls genuine javac 49/50 output.
const binaryName = 'corehistorical.Target';
const throwableDescriptor = '(Ljava/lang/Throwable;)Ljava/lang/Throwable;';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const u2 = value => {const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes;};
const u4 = value => {const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes;};
const opcode = {nop: 0, pop: 87, pop2: 88, dup: 89, dup_x1: 90, dup_x2: 91,
  dup2: 92, dup2_x1: 93, dup2_x2: 94, swap: 95};
const modernForms = [
  ['dup', 'dup', ['I1'], ['I1', 'I1'], 11],
  ['dup-x1', 'dup_x1', ['I1', 'I2'], ['I2', 'I1', 'I2'], 212],
  ['dup-x2-cat1', 'dup_x2', ['I1', 'I2', 'I3'], ['I3', 'I1', 'I2', 'I3'], 3123],
  ['dup-x2-cat2-bottom', 'dup_x2', ['J1', 'I2'], ['I2', 'J1', 'I2'], 212],
  ['dup2-cat1', 'dup2', ['I1', 'I2'], ['I1', 'I2', 'I1', 'I2'], 1212],
  ['dup2-cat2', 'dup2', ['J1'], ['J1', 'J1'], 11],
  ['dup2-x1-cat1', 'dup2_x1', ['I1', 'I2', 'I3'], ['I2', 'I3', 'I1', 'I2', 'I3'], 23123],
  ['dup2-x1-cat2-top', 'dup2_x1', ['I1', 'J2'], ['J2', 'I1', 'J2'], 212],
  ['dup2-x2-cat1', 'dup2_x2', ['I1', 'I2', 'I3', 'I4'], ['I3', 'I4', 'I1', 'I2', 'I3', 'I4'], 341234],
  ['dup2-x2-cat2-bottom', 'dup2_x2', ['J1', 'I2', 'I3'], ['I2', 'I3', 'J1', 'I2', 'I3'], 23123],
  ['dup2-x2-cat2-top', 'dup2_x2', ['I1', 'I2', 'J3'], ['J3', 'I1', 'I2', 'J3'], 3123],
  ['dup2-x2-cat2-pair', 'dup2_x2', ['J1', 'D2'], ['D2', 'J1', 'D2'], 212],
  ['pop', 'pop', ['I1', 'I2'], ['I1'], 1],
  ['pop2-cat1', 'pop2', ['I1', 'I2', 'I3'], ['I1'], 1],
  ['pop2-cat2', 'pop2', ['I1', 'J2'], ['I1'], 1],
  ['swap', 'swap', ['I1', 'I2'], ['I2', 'I1'], 21],
  ['nop', 'nop', ['I1'], ['I1'], 1]
];
const legacyForms = [
  ['jsr-single', 7, ['jsr', 'ret', 'iinc']],
  ['jsr-two', 14, ['jsr', 'ret', 'iinc']],
  ['jsr-wide', 7, ['jsr_w', 'wide', 'iinc']],
  ['finally', null, ['jsr', 'ret', 'athrow', 'getstatic', 'putstatic']]
];
function entry(id, major, form, trace, requiredOpcodes, extra = {}) {
  const exception = form === 'finally';
  return {id, kind: 'explicit-byte-mutation', trace: [trace],
    entryMethod: exception ? 'caseException' : 'caseInteger', entryDescriptor: '()V',
    payload: {binaryName, major, form, resource: `core-stack-cases/${id}/Target.bin`, ...extra},
    anchors: {JLS: [], JVMS: ['2.6.2', ...requiredOpcodes.map(name => `6.5.${name}`),
      ...(major === 'original-modern' ? [] : ['4.10.2.5'])]},
    probes: [{className: binaryName, method: exception ? 'rethrow' : 'value',
      descriptor: exception ? throwableDescriptor : '()I', requiredOpcodes}]};
}
const cases = [
  ...[49, 50].flatMap(major => legacyForms.map(([form, value, instructions]) =>
    entry(`stack-legacy-${form}-${major}`, major, form, value === null ? 'same;counter=1' : `value=${value}`, instructions))),
  ...modernForms.map(([id, instruction, input, output, value]) =>
    entry(`stack-${id}`, 'original-modern', id, `value=${value}`, [instruction], {instruction, input, output}))
];

export function carrierSources() {
  return [{binaryName, text: 'package corehistorical;\npublic final class Target {\n' +
    '  public static int counter;\n  public static int value() { return 5; }\n' +
    '  public static Throwable rethrow(Throwable value) { return value; }\n' +
    '  public static int getCounter() { return counter; }\n' +
    '  public static Throwable makeThrowable() { return new Throwable(); }\n}\n'}];
}

function knownEntry(entry) {
  const canonical = cases.find(candidate => candidate.id === entry?.id);
  assert.ok(canonical, 'Known complete stack case');
  assert.deepEqual(entry, canonical, 'Unchanged stack case contract');
  return canonical;
}

function targetMetadata(bytes) {
  const layout = readStructureLayout(bytes), pool = layout.pool;
  const utf = index => {assert.equal(pool[index]?.tag, 1); return pool[index].value;};
  const className = index => {assert.equal(pool[index]?.tag, 7); return utf(pool[index].first).replaceAll('/', '.');};
  assert.equal(className(layout.thisClass), binaryName, 'Exact carrier binary name');
  assert.equal(className(bytes.readUInt16BE(layout.superClassOffset)), 'java.lang.Object');
  assert.equal(layout.interfaceCount, 0);
  const find = (name, descriptor) => {
    const matches = layout.methods.entries.filter(method => method.name === name && method.descriptor === descriptor);
    assert.equal(matches.length, 1, `Exact carrier method ${name}${descriptor}`);
    const method = matches[0]; assert.ok(method.code); return method;
  };
  const instructions = method => decodeCoreCode(bytes.subarray(method.code.instructionsOffset,
    method.code.instructionsOffset + method.code.codeLength), pool, bytes);
  const getter = find('getCounter', '()I'), getterCode = instructions(getter);
  assert.deepEqual(getterCode.map(item => item.name), ['getstatic', 'ireturn']);
  const counter = getterCode[0].cp;
  assert.deepEqual([counter.tag, counter.owner, counter.name, counter.descriptor], [9, binaryName, 'counter', 'I']);
  const counterField = layout.fields.entries.filter(field => field.name === 'counter' && field.descriptor === 'I');
  assert.equal(counterField.length, 1); assert.equal(counterField[0].flags, 9, 'Public static non-final counter');
  const factoryCode = instructions(find('makeThrowable', '()Ljava/lang/Throwable;'));
  assert.deepEqual(factoryCode.map(item => item.name), ['new', 'dup', 'invokespecial', 'areturn']);
  assert.equal(factoryCode[0].cp.tag, 7); assert.equal(factoryCode[0].cp.value, 'java.lang.Throwable');
  assert.deepEqual([factoryCode[2].cp.owner, factoryCode[2].cp.name, factoryCode[2].cp.descriptor],
    ['java.lang.Throwable', '<init>', '()V']);
  return {layout, find, instructions, counter, throwableClassIndex: factoryCode[0].cp.index};
}

function makeBody(entry, counterIndex) {
  const {form, major} = entry.payload;
  if (major !== 'original-modern') {
    if (form === 'jsr-single') return {code: Buffer.from([3, 59, 168, 0, 5, 26, 172, 76, 132, 0, 7, 169, 1]), maxStack: 1, maxLocals: 2, handlers: []};
    if (form === 'jsr-two') return {code: Buffer.from([3, 59, 168, 0, 8, 168, 0, 5, 26, 172, 76, 132, 0, 7, 169, 1]), maxStack: 1, maxLocals: 2, handlers: []};
    if (form === 'jsr-wide') {
      const code = Buffer.alloc(40011);
      code.set([3, 59, 201], 0); code.writeInt32BE(39998, 3); code.set([26, 172], 7);
      code.set([196, 58, 1, 44, 132, 0, 7, 196, 169, 1, 44], 40000);
      return {code, maxStack: 1, maxLocals: 301, handlers: []};
    }
    assert.equal(form, 'finally');
    return {code: Buffer.from([42, 191, 76, 168, 0, 5, 43, 191, 77,
      178, counterIndex >> 8, counterIndex & 255, 4, 96, 179, counterIndex >> 8, counterIndex & 255, 169, 2]),
    maxStack: 2, maxLocals: 3, handlers: [[0, 2, 2, 0]]};
  }
  const {instruction, input, output} = entry.payload, code = [];
  for (const value of input) {
    code.push(3 + Number(value.slice(1)));
    if (value[0] === 'J') code.push(133);
    if (value[0] === 'D') code.push(135);
  }
  code.push(opcode[instruction]);
  for (let i = 0; i < output.length; i++) {
    const type = output[output.length - i - 1][0];
    if (type === 'J') code.push(136);
    if (type === 'D') code.push(142);
    code.push(54, i);
  }
  code.push(3);
  for (let i = output.length - 1; i >= 0; i--) code.push(16, 10, 104, 21, i, 96);
  code.push(172);
  return {code: Buffer.from(code), maxStack: 16, maxLocals: output.length, handlers: []};
}

export function mutateCoreStackPayload(original, entry) {
  entry = knownEntry(entry);
  assert.ok(Buffer.isBuffer(original));
  assert.equal(original.readUInt16BE(4), 0, 'Non-preview original carrier');
  assert.ok([65, 69].includes(original.readUInt16BE(6)), 'Genuine modern carrier policy 21/25');
  const metadata = targetMetadata(original), probe = entry.probes[0];
  assert.deepEqual(metadata.instructions(metadata.find('value', '()I')).map(item => item.name), ['iconst_5', 'ireturn'],
    'Unmodified value carrier');
  assert.deepEqual(metadata.instructions(metadata.find('rethrow', throwableDescriptor)).map(item => item.name), ['aload_0', 'areturn'],
    'Unmodified rethrow carrier');
  const target = metadata.find(probe.method, probe.descriptor), code = target.code;
  assert.equal(target.flags, 9, 'Public static payload method');
  const replacement = makeBody(entry, metadata.counter.index);
  const body = Buffer.concat([u2(replacement.maxStack), u2(replacement.maxLocals), u4(replacement.code.length), replacement.code,
    u2(replacement.handlers.length), ...replacement.handlers.flatMap(handler => handler.map(u2)), u2(0)]);
  const edits = [{offset: code.start, removeBytes: code.end - code.start,
    beforeHex: original.subarray(code.start, code.end).toString('hex'),
    insertHex: Buffer.concat([u2(code.nameIndex), u4(body.length), body]).toString('hex'),
    reason: `Explicit ${entry.payload.form} Code replacement; preserve name index, remove only replaced Code nested attributes`}];
  if (entry.payload.major !== 'original-modern') edits.unshift({offset: 6, removeBytes: 2,
    beforeHex: original.subarray(6, 8).toString('hex'), insertHex: u2(entry.payload.major).toString('hex'),
    reason: `Explicit historical major ${entry.payload.major} policy control; not genuine javac ${entry.payload.major} output`});
  const bytes = edits.slice().sort((a, b) => b.offset - a.offset).reduce((result, edit) =>
    Buffer.concat([result.subarray(0, edit.offset), Buffer.from(edit.insertHex, 'hex'), result.subarray(edit.offset + edit.removeBytes)]), Buffer.from(original));
  return {bytes, edits, originalSha256: sha(original), mutatedSha256: sha(bytes)};
}

// A separate category/ordering model used only by evidence inspection. The byte
// emitter above never invokes it: a wrong form table or edit cannot certify itself.
function categoryEffect(input, instruction) {
  const stack = input.slice(), category = value => ['J', 'D'].includes(value[0]) ? 2 : 1;
  const take = words => {
    const values = []; let used = 0;
    while (used < words) {assert.ok(stack.length, 'Stack category underflow'); const value = stack.pop(); values.unshift(value); used += category(value);}
    assert.equal(used, words, 'No splitting category-2 values'); return values;
  };
  if (instruction === 'nop') return stack;
  if (instruction === 'pop' || instruction === 'pop2') {take(instruction === 'pop' ? 1 : 2); return stack;}
  if (instruction === 'swap') {const first = take(1), second = take(1); return [...stack, ...first, ...second];}
  const duplicateWords = instruction.startsWith('dup2') ? 2 : 1;
  const top = take(duplicateWords);
  const below = instruction.endsWith('_x1') ? take(1) : instruction.endsWith('_x2') ? take(2) : [];
  return [...stack, ...top, ...below, ...top];
}

function inspectModern(instructions, entry) {
  const {input, output, instruction} = entry.payload;
  let at = 0;
  const next = name => {const decoded = instructions[at++]; assert.equal(decoded?.name, name, 'Exact decoded linear payload shape'); return decoded;};
  for (const value of input) {
    next('iconst_' + value.slice(1));
    if (value[0] === 'J') next('i2l');
    if (value[0] === 'D') next('i2d');
  }
  const tested = next(instruction), actualOutput = categoryEffect(input, instruction);
  assert.deepEqual(actualOutput, output, 'Independently derived category ordering');
  for (let i = 0; i < actualOutput.length; i++) {
    const type = actualOutput[actualOutput.length - i - 1][0];
    if (type === 'J') next('l2i');
    if (type === 'D') next('d2i');
    assert.equal(next('istore').localIndex, i, 'Actual result stored top to bottom');
  }
  next('iconst_0');
  for (let i = actualOutput.length - 1; i >= 0; i--) {
    assert.equal(next('bipush').value, 10); next('imul');
    assert.equal(next('iload').localIndex, i, 'Decimal reconstruction loads bottom to top'); next('iadd');
  }
  next('ireturn'); assert.equal(at, instructions.length, 'No extra payload instructions');
  const value = Number(actualOutput.map(item => item.slice(1)).join(''));
  assert.deepEqual(entry.trace, [`value=${value}`], 'Fixed expected order, not a checksum');
  return {tested: {pc: tested.pc, opcode: tested.name}, input: input.slice(), output: actualOutput, value};
}

export function inspectCoreStackPayload(bytes, entry) {
  entry = knownEntry(entry);
  const metadata = targetMetadata(bytes), probe = entry.probes[0], target = metadata.find(probe.method, probe.descriptor);
  const code = target.code, instructions = metadata.instructions(target), major = bytes.readUInt16BE(6);
  assert.equal(bytes.readUInt16BE(4), 0); assert.equal(target.flags, 9);
  if (entry.payload.major === 'original-modern') assert.ok([65, 69].includes(major), 'Original modern payload major');
  else assert.equal(major, entry.payload.major, 'Explicit legacy policy major');
  assert.equal(code.attributes.entries.length, 0, 'No stale frames in replacement Code');
  const handlers = Array.from({length: code.handlerCount}, (_, index) => {
    const offset = code.handlersOffset + index * 8;
    return {start: bytes.readUInt16BE(offset), end: bytes.readUInt16BE(offset + 2),
      target: bytes.readUInt16BE(offset + 4), catchType: bytes.readUInt16BE(offset + 6)};
  });
  const opcodeCounts = {};
  for (const item of instructions) opcodeCounts[item.name] = (opcodeCounts[item.name] || 0) + 1;
  for (const required of probe.requiredOpcodes) assert.ok(opcodeCounts[required], `Decoded required opcode ${required}`);
  const branches = instructions.filter(item => item.branchOffset !== undefined).map(item =>
    ({pc: item.pc, opcode: item.name, offset: item.branchOffset, target: item.branchTarget}));
  const wide = instructions.filter(item => item.name === 'wide').map(item =>
    ({pc: item.pc, opcode: item.modifiedOpcode, index: item.localIndex}));
  const accesses = instructions.filter(item => ['getstatic', 'putstatic'].includes(item.name)).map(item => {
    assert.deepEqual(item.cp, metadata.counter, 'Actual counter Fieldref identity'); return {pc: item.pc, opcode: item.name, cpIndex: item.cp.index};
  });
  let ordering = null;
  if (entry.payload.major === 'original-modern') {
    assert.equal(code.maxStack, 16); assert.equal(code.maxLocals, entry.payload.output.length);
    assert.deepEqual(handlers, []); assert.deepEqual(branches, []); assert.deepEqual(wide, []);
    ordering = inspectModern(instructions, entry);
  } else {
    const actual = instructions.filter(item => item.name !== 'nop').map(item =>
      [item.pc, item.name, item.localIndex ?? null, item.increment ?? null]);
    const form = entry.payload.form;
    if (form === 'finally') {
      assert.equal(code.codeLength, 19); assert.equal(code.maxStack, 2); assert.equal(code.maxLocals, 3);
      assert.deepEqual(actual, [[0, 'aload_0', null, null], [1, 'athrow', null, null], [2, 'astore_1', null, null],
        [3, 'jsr', null, null], [6, 'aload_1', null, null], [7, 'athrow', null, null], [8, 'astore_2', null, null],
        [9, 'getstatic', null, null], [12, 'iconst_1', null, null], [13, 'iadd', null, null], [14, 'putstatic', null, null], [17, 'ret', 2, null]]);
      assert.deepEqual(branches, [{pc: 3, opcode: 'jsr', offset: 5, target: 8}]);
      assert.deepEqual(handlers, [{start: 0, end: 2, target: 2, catchType: 0}]); assert.equal(accesses.length, 2);
    } else {
      assert.equal(code.maxStack, 1); assert.deepEqual(handlers, []); assert.deepEqual(accesses, []);
      const prefix = [[0, 'iconst_0', null, null], [1, 'istore_0', null, null]];
      if (form === 'jsr-single') {
        assert.equal(code.codeLength, 13); assert.equal(code.maxLocals, 2);
        assert.deepEqual(actual, [...prefix, [2, 'jsr', null, null], [5, 'iload_0', null, null], [6, 'ireturn', null, null],
          [7, 'astore_1', null, null], [8, 'iinc', 0, 7], [11, 'ret', 1, null]]);
        assert.deepEqual(branches, [{pc: 2, opcode: 'jsr', offset: 5, target: 7}]);
      } else if (form === 'jsr-two') {
        assert.equal(code.codeLength, 16); assert.equal(code.maxLocals, 2);
        assert.deepEqual(actual, [...prefix, [2, 'jsr', null, null], [5, 'jsr', null, null], [8, 'iload_0', null, null], [9, 'ireturn', null, null],
          [10, 'astore_1', null, null], [11, 'iinc', 0, 7], [14, 'ret', 1, null]]);
        assert.deepEqual(branches, [{pc: 2, opcode: 'jsr', offset: 8, target: 10}, {pc: 5, opcode: 'jsr', offset: 5, target: 10}]);
      } else {
        assert.equal(form, 'jsr-wide'); assert.equal(code.codeLength, 40011); assert.equal(code.maxLocals, 301);
        assert.deepEqual(actual, [...prefix, [2, 'jsr_w', null, null], [7, 'iload_0', null, null], [8, 'ireturn', null, null],
          [40000, 'wide', 300, null], [40004, 'iinc', 0, 7], [40007, 'wide', 300, null]]);
        assert.deepEqual(wide, [{pc: 40000, opcode: 'astore', index: 300}, {pc: 40007, opcode: 'ret', index: 300}]);
        assert.deepEqual(branches, [{pc: 2, opcode: 'jsr_w', offset: 39998, target: 40000}]);
        assert.equal(opcodeCounts.nop, 39991);
      }
    }
  }
  return {id: entry.id, kind: 'explicit-byte-mutation', binaryName, major, classSha256: sha(bytes),
    method: probe.method, descriptor: probe.descriptor, maxStack: code.maxStack, maxLocals: code.maxLocals,
    codeLength: code.codeLength, codeSha256: sha(bytes.subarray(code.instructionsOffset, code.instructionsOffset + code.codeLength)),
    instructionCount: instructions.length, opcodeCounts, handlers, branches, wide, ordering,
    counter: {...metadata.counter, accesses}, throwableClassIndex: metadata.throwableClassIndex,
    requiredOpcodes: probe.requiredOpcodes.slice()};
}

export default {id: 'stack-forms', kind: 'explicit-byte-mutation', source: 'classes/modern_fixture/JavaCoreStackForms.java',
  mainClass: 'classes.modern_test.JavaCoreStackForms', completionMarker: 'CORE_STACK_FORMS_OK', cases, carrierSources};
