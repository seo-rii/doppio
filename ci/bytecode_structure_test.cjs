'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const {test} = require('node:test');
const runtimeRoot = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const ByteStream = require(path.join(runtimeRoot, 'src/ByteStream')).default;
const {ConstantPool} = require(path.join(runtimeRoot, 'src/ConstantPool'));
const {Code, ExceptionHandler, StackMapTable} = require(path.join(runtimeRoot, 'src/attributes'));
const {StackMapTableEntryType: Frame} = require(path.join(runtimeRoot, 'src/enums'));

// The source-only mode permits isolated development without rewriting a shared
// runtime build. CI defaults to the actual compiled release module.
function verifierModule() {
  const filename = path.join(runtimeRoot, 'src/BytecodeVerifier.js');
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(filename);
  const Module = require('node:module');
  const ts = require('typescript');
  const source = fs.readFileSync(path.resolve(__dirname, '../src/BytecodeVerifier.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES5
  }});
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(compiled.outputText, filename);
  return loaded.exports;
}
const {decodeMethodCode, BytecodeVerificationError, BytecodeFormatError} = verifierModule();
const u2 = (value) => { const data = Buffer.alloc(2); data.writeUInt16BE(value); return data; };
const u4 = (value) => { const data = Buffer.alloc(4); data.writeUInt32BE(value >>> 0); return data; };

function constants(major = 65) {
  const entries = [];
  function add(tag, ...parts) {
    const index = entries.length + 1;
    entries.push(Buffer.concat([Buffer.from([tag]), ...parts]));
    if (tag === 5 || tag === 6) entries.push(null);
    return index;
  }
  function utf8(value) { const bytes = Buffer.from(value); return add(1, u2(bytes.length), bytes); }
  const cls = (name) => add(7, u2(utf8(name)));
  const nt = (name, descriptor) => add(12, u2(utf8(name)), u2(utf8(descriptor)));
  const ref = (tag, owner, name, descriptor) => add(tag, u2(owner), u2(nt(name, descriptor)));
  const indices = {
    thisClass: cls('bytecode/Probe'), object: cls('java/lang/Object'),
    intArray: cls('[I'), objectArray: cls('[Ljava/lang/Object;'),
    deepArray: cls('['.repeat(255) + 'I'), intValue: add(3, u4(7)),
    floatValue: add(4, u4(0)), longValue: add(5, u4(0), u4(7)),
    doubleValue: add(6, u4(0), u4(0)), text: utf8('not-loadable'),
    codeName: utf8('Code'), stackMapName: utf8('StackMapTable'),
    methodName: utf8('probe'), methodDescriptor: utf8('()V')
  };
  indices.stringValue = add(8, u2(indices.text));
  indices.field = ref(9, indices.object, 'missingField', 'I');
  indices.method = ref(10, indices.object, 'toString', '()Ljava/lang/String;');
  indices.init = ref(10, indices.object, '<init>', '()V');
  indices.interfaceMethod = ref(11, cls('java/lang/Runnable'), 'run', '()V');
  indices.wideInterfaceMethod = ref(11, cls('java/util/function/LongUnaryOperator'), 'applyAsLong', '(J)J');
  if (major >= 51) {
    indices.methodType = add(16, u2(indices.methodDescriptor));
    indices.handle = add(15, Buffer.from([5]), u2(indices.method));
    indices.dynamicMethod = add(18, u2(0), u2(nt('call', '()V')));
    indices.bootstrapName = utf8('BootstrapMethods');
    indices.bootstrapHandle = add(15, Buffer.from([6]), u2(ref(10,
      cls('java/lang/invoke/ConstantBootstraps'), 'nullConstant',
      '(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;)Ljava/lang/Object;')));
  }
  if (major >= 55) {
    indices.dynamicInt = add(17, u2(0), u2(nt('integer', 'I')));
    indices.dynamicLong = add(17, u2(0), u2(nt('wide', 'J')));
  }
  const bytes = () => Buffer.concat([u2(entries.length + 1), ...entries.filter(Boolean)]);
  const pool = new ConstantPool();
  pool.parse(new ByteStream(bytes()), null, major);
  return {pool, indices, bytes, utf8};
}

function fixture(code = [0xb1], options = {}) {
  const major = options.major || 65;
  const cp = options.cp || constants(major);
  const bytes = Buffer.from(typeof code === 'function' ? code(cp.indices) : code);
  const frames = options.frames || [];
  const handlers = (options.handlers || []).map(entry => new ExceptionHandler(...entry));
  const attribute = new Code(options.maxStack === undefined ? 8 : options.maxStack,
    options.maxLocals === undefined ? 4 : options.maxLocals, handlers,
    frames.length ? [new StackMapTable(frames)] : [], bytes);
  const input = {className: 'Lbytecode/Probe;', majorVersion: major, name: 'probe',
    descriptor: options.descriptor || '()V', declaredAccessFlags: 9,
    declaredCode: attribute, constantPool: cp.pool};
  return {input, bytes, cp, decode: () => decodeMethodCode(input)};
}

function rejects(code, options, pattern) {
  assert.throws(fixture(code, options).decode, error => {
    assert.ok(error instanceof BytecodeVerificationError, String(error));
    if (pattern) assert.match(error.message, pattern);
    return true;
  });
}

test('static decoder returns immutable instructions and an independent original byte snapshot', () => {
  const data = fixture([0x10, 0xfe, 0x3b, 0xc4, 0x84, 0, 0, 0xff, 0xfe, 0xb1]);
  const decoded = data.decode();
  assert.deepEqual(decoded.instructions.map(item => [item.pc, item.opcode, item.nextPC]),
    [[0, 0x10, 2], [2, 0x3b, 3], [3, 0x84, 9], [9, 0xb1, 10]]);
  assert.equal(decoded.instructions[0].immediate, -2);
  assert.equal(decoded.instructions[2].immediate, -2);
  assert.equal(decoded.instructions[2].wide, true);
  assert.equal(decoded.instructionAt[4], undefined);
  assert.equal(decoded.instructionAt[3], decoded.instructions[2]);
  data.bytes[0] = 0xd0;
  assert.equal(decoded.code[0], 0x10);
  assert.throws(() => { decoded.code[0] = 0xd0; }, TypeError);
  assert.throws(() => { decoded.instructions[0].pc = 2; }, TypeError);
  assert.ok(new BytecodeVerificationError('probe') instanceof BytecodeVerificationError);
});

test('reserved, private FAST, truncated and malformed wide instructions are verification errors', () => {
  for (let opcode = 0xca; opcode <= 0xff; opcode++) rejects([opcode, 0xb1]);
  for (const bytes of [[0x10], [0x11, 0], [0x12], [0xb2, 0], [0xb9, 0, 1, 1],
    [0xba, 0, 1, 0], [0xc5, 0, 1], [0xc8, 0, 0, 0], [0xc4], [0xc4, 0x15, 0],
    [0xc4, 0x84, 0, 0, 0], [0xc4, 0x00, 0, 0], [0xc4, 0xc4, 0, 0]]) rejects(bytes);
});

test('all explicit, implicit and wide local instructions account for category-2 widths', () => {
  const groups = [[1, [0x15, 0x17, 0x19, 0x36, 0x38, 0x3a]], [2, [0x16, 0x18, 0x37, 0x39]]];
  for (const [width, opcodes] of groups) {
    for (const opcode of opcodes) {
      assert.equal(fixture([opcode, 2, 0xb1], {maxLocals: 2 + width}).decode().instructions[0].localWidth, width);
      rejects([opcode, 2, 0xb1], {maxLocals: 1 + width});
      assert.equal(fixture([0xc4, opcode, 1, 0, 0xb1], {maxLocals: 256 + width}).decode().instructions[0].localIndex, 256);
      rejects([0xc4, opcode, 1, 0, 0xb1], {maxLocals: 255 + width});
    }
  }
  for (const start of [0x1a, 0x1e, 0x22, 0x26, 0x2a, 0x3b, 0x3f, 0x43, 0x47, 0x4b]) {
    const width = [0x1e, 0x26, 0x3f, 0x47].includes(start) ? 2 : 1;
    for (let index = 0; index < 4; index++) {
      assert.equal(fixture([start + index, 0xb1], {maxLocals: index + width}).decode().instructions[0].localIndex, index);
      rejects([start + index, 0xb1], {maxLocals: index + width - 1});
    }
  }
  rejects([0x84, 1, 0, 0xb1], {maxLocals: 1});
  rejects([0xc4, 0x84, 1, 0, 0, 0, 0xb1], {maxLocals: 256});
});

test('branches use signed offsets and can target wide prefixes but not operands or code end', () => {
  for (let opcode = 0x99; opcode <= 0xa7; opcode++) {
    assert.deepEqual(fixture([opcode, 0, 3, 0xb1]).decode().instructions[0].branchTargets, [3]);
    rejects([opcode, 0, 2, 0xb1]);
    rejects([opcode, 0, 4, 0xb1]);
    rejects([opcode, 0xff, 0xff, 0xb1]);
  }
  for (const opcode of [0xc6, 0xc7]) rejects([opcode, 0, 2, 0xb1]);
  assert.deepEqual(fixture([0, 0xa7, 0xff, 0xff]).decode().instructions[1].branchTargets, [0]);
  assert.deepEqual(fixture([0xa7, 0, 3, 0xc4, 0x15, 0, 0, 0xb1]).decode().instructions[0].branchTargets, [3]);
  rejects([0xa7, 0, 4, 0xc4, 0x15, 0, 0, 0xb1]);
  rejects([0xc8, 0x7f, 0xff, 0xff, 0xff]);
});

test('historical subroutines remain decoded but are forbidden from class version 51', () => {
  for (const major of [49, 50]) {
    const decoded = fixture([0xa8, 0, 4, 0xb1, 0x4b, 0xa9, 0], {major}).decode();
    assert.equal(decoded.hasLegacySubroutines, true);
    assert.equal(decoded.instructions[0].returnAddressPC, 3);
    assert.equal(decoded.instructions[3].localIndex, 0);
    assert.equal(fixture([0xc4, 0xa9, 0, 0], {major}).decode().instructions[0].opcode, 0xa9);
    assert.equal(fixture([0xc9, 0, 0, 0, 0], {major}).decode().instructions[0].returnAddressPC, 5);
  }
  for (const major of [51, 52, 65, 69]) {
    for (const bytes of [[0xa8, 0, 0], [0xa9, 0], [0xc9, 0, 0, 0, 0], [0xc4, 0xa9, 0, 0]]) rejects(bytes, {major});
  }
});

function switchCode(kind, pairs, options = {}) {
  const prefix = options.prefix || [];
  const pc = prefix.length;
  const padding = Buffer.alloc((4 - ((pc + 1) % 4)) % 4, options.padding || 0);
  const header = kind === 0xaa ? [u4(options.low || 0), u4(options.high === undefined ? pairs.length - 1 : options.high)] : [u4(pairs.length)];
  const length = 1 + padding.length + 4 + header.length * 4 + pairs.length * (kind === 0xaa ? 4 : 8);
  const entries = kind === 0xaa ? pairs.map(target => u4(target === null ? length : target)) :
    pairs.flatMap(([key, target]) => [u4(key), u4(target === null ? length : target)]);
  return Buffer.concat([Buffer.from(prefix), Buffer.from([kind]), padding,
    u4(options.default === undefined ? length : options.default), ...header, ...entries, Buffer.from([0xb1])]);
}

test('switch decoding bounds counts before allocation, preserves signed keys and accepts nonzero padding', () => {
  for (let prefixLength = 0; prefixLength < 4; prefixLength++) {
    const prefix = new Array(prefixLength).fill(0);
    const table = fixture(switchCode(0xaa, [null, null], {prefix, padding: 0x7f, low: -1, high: 0})).decode();
    assert.deepEqual(table.instructions[prefixLength].switchKeys, [-1, 0]);
    const lookup = fixture(switchCode(0xab, [[-2, null], [7, null]], {prefix, padding: 0x7f})).decode();
    assert.deepEqual(lookup.instructions[prefixLength].switchKeys, [-2, 7]);
  }
  fixture(switchCode(0xab, [])).decode();
  rejects(switchCode(0xab, [[2, null], [1, null]]));
  rejects(switchCode(0xab, [[1, null], [1, null]]));
  rejects(switchCode(0xaa, [null], {low: 2, high: 1}));
  rejects(switchCode(0xaa, [null], {low: -2147483648, high: 2147483647}));
  rejects(switchCode(0xab, [[0, null]], {default: 2}));
  for (const kind of [0xaa, 0xab]) {
    const bytes = switchCode(kind, kind === 0xaa ? [null] : [[0, null]]);
    for (let length = 1; length < bytes.length - 1; length++) rejects(bytes.subarray(0, length));
  }
  rejects(Buffer.concat([Buffer.from([0xab, 0, 0, 0]), u4(0), u4(0xffffffff), Buffer.from([0xb1])]));
});

test('ldc forms require exact loadable categories without resolving constants or bootstraps', () => {
  const cp = constants();
  for (const name of ['intValue', 'floatValue', 'stringValue', 'object', 'methodType', 'handle', 'dynamicInt']) {
    fixture([0x12, cp.indices[name], 0xb1], {cp}).decode();
    fixture([0x13, 0, cp.indices[name], 0xb1], {cp}).decode();
    rejects([0x14, 0, cp.indices[name], 0xb1], {cp});
  }
  for (const name of ['longValue', 'doubleValue', 'dynamicLong']) {
    fixture([0x14, 0, cp.indices[name], 0xb1], {cp}).decode();
    rejects([0x12, cp.indices[name], 0xb1], {cp});
    rejects([0x13, 0, cp.indices[name], 0xb1], {cp});
  }
  for (const index of [0, cp.indices.text, cp.indices.longValue + 1, 255]) rejects([0x12, index, 0xb1], {cp});
  cp.pool.each((index, item) => {
    if (typeof item.resolve === 'function') item.resolve = () => assert.fail('decoder must not resolve a constant');
  });
  fixture([0xba, 0, cp.indices.dynamicMethod, 0, 0, 0xb1], {cp}).decode();
});

test('field and invocation operands enforce tags, constructor names, argument words and reserved zeros', () => {
  const cp = constants();
  for (const opcode of [0xb2, 0xb3, 0xb4, 0xb5]) {
    fixture([opcode, 0, cp.indices.field, 0xb1], {cp}).decode();
    rejects([opcode, 0, cp.indices.method, 0xb1], {cp});
  }
  fixture([0xb7, 0, cp.indices.init, 0xb1], {cp}).decode();
  for (const opcode of [0xb6, 0xb8]) rejects([opcode, 0, cp.indices.init, 0xb1], {cp});
  rejects([0xb6, 0, cp.indices.interfaceMethod, 0xb1], {cp});
  for (const opcode of [0xb7, 0xb8]) {
    fixture([opcode, 0, cp.indices.interfaceMethod, 0xb1], {cp, major: 52}).decode();
    rejects([opcode, 0, cp.indices.interfaceMethod, 0xb1], {cp, major: 51});
  }
  fixture([0xb9, 0, cp.indices.wideInterfaceMethod, 3, 0, 0xb1], {cp}).decode();
  for (const count of [0, 1, 2, 4]) rejects([0xb9, 0, cp.indices.wideInterfaceMethod, count, 0, 0xb1], {cp});
  rejects([0xb9, 0, cp.indices.interfaceMethod, 1, 1, 0xb1], {cp});
  rejects([0xb9, 0, cp.indices.method, 1, 0, 0xb1], {cp});
  for (const padding of [[0, 1], [1, 0]]) rejects([0xba, 0, cp.indices.dynamicMethod, ...padding, 0xb1], {cp});
  rejects([0xba, 0, cp.indices.method, 0, 0, 0xb1], {cp});
});

test('allocation and type operands enforce class tags and representable array dimensions', () => {
  const cp = constants();
  for (const opcode of [0xbb, 0xbd, 0xc0, 0xc1]) {
    fixture([opcode, 0, cp.indices.object, 0xb1], {cp}).decode();
    rejects([opcode, 0, cp.indices.text, 0xb1], {cp});
  }
  rejects([0xbb, 0, cp.indices.intArray, 0xb1], {cp});
  rejects([0xbd, 0, cp.indices.deepArray, 0xb1], {cp});
  for (let atype = 0; atype <= 12; atype++) {
    if (atype >= 4 && atype <= 11) fixture([0xbc, atype, 0xb1], {cp}).decode();
    else rejects([0xbc, atype, 0xb1], {cp});
  }
  fixture([0xc5, 0, cp.indices.intArray, 1, 0xb1], {cp}).decode();
  fixture([0xc5, 0, cp.indices.deepArray, 255, 0xb1], {cp}).decode();
  for (const dimensions of [0, 2]) rejects([0xc5, 0, cp.indices.intArray, dimensions, 0xb1], {cp});
  rejects([0xc5, 0, cp.indices.object, 1, 0xb1], {cp});
});

test('stack map offsets and uninitialized entries identify instruction and new boundaries', () => {
  const cp = constants();
  const frames = [{type: Frame.SAME_FRAME, offsetDelta: 0},
    {type: Frame.SAME_LOCALS_1_STACK_ITEM_FRAME, offsetDelta: 2,
      stackTypes: [{tag: 8, newOffset: 0}], stack: ['uninitialized 0']}];
  const decoded = fixture([0xbb, 0, cp.indices.object, 0x57, 0xb1], {cp, frames}).decode();
  assert.deepEqual(decoded.stackMapFrames.map(frame => frame.pc), [0, 3]);
  assert.equal(decoded.newSites[0], 'Ljava/lang/Object;');
  frames[1].stackTypes[0].newOffset = 4;
  assert.equal(decoded.stackMapFrames[1].entry.stackTypes[0].newOffset, 0);
  assert.throws(() => { decoded.stackMapFrames[1].entry.stackTypes[0].newOffset = 4; }, TypeError);
  for (const offset of [1, 5, 65535]) rejects([0x11, 0, 0, 0x57, 0xb1], {
    frames: [{type: Frame.SAME_FRAME, offsetDelta: offset}]
  });
  for (const newOffset of [1, 3, 99]) assert.throws(fixture([0xbb, 0, cp.indices.object, 0x57, 0xb1], {cp,
    frames: [{type: Frame.SAME_LOCALS_1_STACK_ITEM_FRAME, offsetDelta: 3, stackTypes: [{tag: 8, newOffset}]}]
  }).decode, BytecodeFormatError);
});

test('handler instruction boundaries are format errors and preserve an end at code length', () => {
  const handlers = [[0, 4, 3, '<any>']];
  const decoded = fixture([0x10, 0, 0x57, 0xb1], {handlers}).decode();
  assert.deepEqual(decoded.exceptionHandlers, [{startPC: 0, endPC: 4, handlerPC: 3, catchType: '<any>'}]);
  assert.throws(() => { decoded.exceptionHandlers[0].endPC = 1; }, TypeError);
  for (const invalid of [[1, 3, 3, '<any>'], [0, 1, 3, '<any>'], [0, 3, 1, '<any>']]) {
    assert.throws(fixture([0x10, 0, 0x57, 0xb1], {handlers: [invalid]}).decode, BytecodeFormatError);
  }
});

test('version 50 uses legacy inference for stack maps and historical switch padding remains constrained', () => {
  for (const major of [49, 50]) {
    fixture([0x11, 0, 0, 0x57, 0xb1], {major,
      frames: [{type: Frame.SAME_FRAME, offsetDelta: 1}]}).decode();
    fixture(index => [0xbb, 0, index.object, 0x57, 0xb1], {major,
      frames: [{type: Frame.SAME_LOCALS_1_STACK_ITEM_FRAME, offsetDelta: 3,
        stackTypes: [{tag: 8, newOffset: 1}]}]}).decode();
    rejects(switchCode(0xaa, [null], {padding: 0x7f}), {major});
    rejects(switchCode(0xab, [[0, null]], {padding: 0x7f}), {major});
    assert.throws(fixture([0x10, 0, 0x57, 0xb1], {major,
      handlers: [[0, 1, 3, '<any>']]}).decode, BytecodeFormatError);
  }
  rejects(index => [0x12, index.object, 0x57, 0xb1], {major: 48});
  fixture(index => [0x12, index.object, 0x57, 0xb1], {major: 49}).decode();
});

function classBytes(code, options = {}) {
  const major = options.major || 65;
  const cp = constants(major);
  const instructions = Buffer.from(typeof code === 'function' ? code(cp.indices) : code);
  const attribute = (name, body) => Buffer.concat([u2(name), u4(body.length), body]);
  const nested = options.stackMap === undefined ? [] : [attribute(cp.indices.stackMapName,
    Buffer.from(typeof options.stackMap === 'function' ? options.stackMap(cp.indices) : options.stackMap))];
  const handlers = (options.handlers || []).map(handler => Buffer.concat(handler.map(u2)));
  const body = Buffer.concat([u2(8), u2(options.maxLocals === undefined ? 4 : options.maxLocals),
    u4(instructions.length), instructions, u2(handlers.length), ...handlers, u2(nested.length), ...nested]);
  const classAttributes = major < 51 ? [] : [attribute(cp.indices.bootstrapName,
    Buffer.concat([u2(1), u2(cp.indices.bootstrapHandle), u2(0)]))];
  return Buffer.concat([u4(0xcafebabe), u2(0), u2(major), cp.bytes(), u2(0x21),
    u2(cp.indices.thisClass), u2(cp.indices.object), u2(0), u2(0), u2(1),
    u2(9), u2(cp.indices.methodName), u2(cp.indices.methodDescriptor), u2(1),
    attribute(cp.indices.codeName, body), u2(classAttributes.length), ...classAttributes]);
}

test('pinned JDK 21 and 25 agree on static bytecode error categories', {
  skip: process.env.DOPPIO_VERIFY_NATIVE !== '1'
}, () => {
  const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname,
    '../build/java-compatibility-toolchains/toolchains.json'), 'utf8'));
  assert.equal(manifest.lockSha256, createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,
    'java_compatibility_toolchains.lock.json'))).digest('hex'), 'prepared toolchains must match the pinned lock');
  assert.deepEqual(manifest.toolchains.map(item => item.feature).sort((a, b) => a - b), [21, 25]);
  const cases = [
    ['valid_return', [0xb1]],
    ['valid_legacy_subroutine', [0xa8, 0, 4, 0xb1, 0x4b, 0xa9, 0], {major: 49}],
    ['valid_dynamic_wide_last_constant', index => [0x14, 0, index.dynamicLong, 0x58, 0xb1]],
    ['valid_nonzero_switch_padding', switchCode(0xaa, [null], {prefix: [3], padding: 0x7f}), {stackMap: [0, 1, 20]}],
    ['valid_legacy_class_literal', index => [0x12, index.object, 0x57, 0xb1], {major: 49}],
    ['valid_v50_frame_fallback', [0x11, 0, 0, 0x57, 0xb1], {major: 50, stackMap: [0, 1, 1]}],
    ['valid_v50_new_fallback', index => [0xbb, 0, index.object, 0x57, 0xb1], {major: 50, stackMap: [0, 1, 67, 8, 0, 1]}],
    ['format_v50_reserved_frame', [0xb1], {major: 50, stackMap: [0, 1, 128]}],
    ['format_v50_unknown_type', [0xb1], {major: 50, stackMap: [0, 1, 64, 9]}],
    ['format_v50_wrong_object_tag', [0xb1], {major: 50,
      stackMap: index => [0, 1, 64, 7, 0, index.text]}],
    ['format_v50_zero_object_index', [0xb1], {major: 50, stackMap: [0, 1, 64, 7, 0, 0]}],
    ['format_v50_outside_object_index', [0xb1], {major: 50, stackMap: [0, 1, 64, 7, 0xff, 0xff]}],
    ['format_v50_truncated_frame', [0xb1], {major: 50, stackMap: [0, 1]}],
    ['format_v50_truncated_count', [0xb1], {major: 50, stackMap: [0]}],
    ['reserved_opcode', [0xca]],
    ['truncated_operand', [0x11, 0]],
    ['invalid_wide', [0xc4, 0x00, 0, 0]],
    ['branch_operand', [0xa7, 0, 2, 0xb1]],
    ['modern_subroutine', [0xa8, 0, 4, 0xb1, 0x4b, 0xa9, 0]],
    ['local_out_of_range', [0x15, 4, 0x57, 0xb1]],
    ['ldc_wrong_tag', index => [0x12, index.text, 0x57, 0xb1]],
    ['ldc_wide_category', index => [0x12, index.longValue, 0x58, 0xb1]],
    ['invokeinterface_count', index => [0x01, 0xb9, 0, index.interfaceMethod, 0, 0, 0xb1]],
    ['invokedynamic_reserved', index => [0xba, 0, index.dynamicMethod, 0, 1, 0xb1]],
    ['new_array_class', index => [0xbb, 0, index.intArray, 0x57, 0xb1]],
    ['anewarray_dimensions', index => [0x03, 0xbd, 0, index.deepArray, 0x57, 0xb1]],
    ['newarray_type', [0x03, 0xbc, 3, 0x57, 0xb1]],
    ['multi_dimensions', index => [0x03, 0xc5, 0, index.intArray, 2, 0x57, 0xb1]],
    ['lookup_unsorted', switchCode(0xab, [[1, null], [0, null]], {prefix: [3]})],
    ['lookup_duplicate', switchCode(0xab, [[1, null], [1, null]], {prefix: [3]})],
    ['table_high_below_low', switchCode(0xaa, [null], {prefix: [3], low: 2, high: 1})],
    ['legacy_switch_padding', switchCode(0xaa, [null], {prefix: [3], padding: 0x7f}), {major: 49}],
    ['v50_switch_padding', switchCode(0xaa, [null], {prefix: [3], padding: 0x7f}), {major: 50}],
    ['legacy_class_literal', index => [0x12, index.object, 0x57, 0xb1], {major: 48}],
    ['handler_legacy_end_operand', [0x10, 0, 0x57, 0xb1], {major: 49, handlers: [[0, 1, 3, 0]]}],
    ['handler_v50_end_operand', [0x10, 0, 0x57, 0xb1], {major: 50, handlers: [[0, 1, 3, 0]]}],
    ['handler_start_operand', [0x10, 0, 0x57, 0xb1], {handlers: [[1, 3, 3, 0]]}],
    ['handler_end_operand', [0x10, 0, 0x57, 0xb1], {handlers: [[0, 1, 3, 0]]}],
    ['handler_target_operand', [0x10, 0, 0x57, 0xb1], {handlers: [[0, 3, 1, 0]]}],
    ['stackmap_operand', [0x11, 0, 0, 0x57, 0xb1], {stackMap: [0, 1, 1]}],
    ['stackmap_code_end', [0xb1], {stackMap: [0, 1, 1]}],
    ['stackmap_outside', [0xb1], {stackMap: [0, 1, 251, 0xff, 0xff]}],
    ['valid_new_site', index => [0xbb, 0, index.object, 0x57, 0xb1], {stackMap: [0, 1, 67, 8, 0, 0]}],
    ['uninitialized_operand', index => [0xbb, 0, index.object, 0x57, 0xb1], {stackMap: [0, 1, 67, 8, 0, 1]}],
    ['uninitialized_non_new', index => [0xbb, 0, index.object, 0x57, 0xb1], {stackMap: [0, 1, 67, 8, 0, 3]}],
    ['uninitialized_outside', index => [0xbb, 0, index.object, 0x57, 0xb1], {stackMap: [0, 1, 67, 8, 0, 99]}]
  ];
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-bytecode-taxonomy-'));
  try {
    for (const [name, code, options] of cases) fs.writeFileSync(path.join(directory, name + '.class'), classBytes(code, options));
    const sourcePath = path.join(directory, 'VerifierTaxonomy.java');
    fs.writeFileSync(sourcePath, `import java.nio.file.*;
class VerifierTaxonomy extends ClassLoader {
  Class<?> define(byte[] bytes) { return defineClass(null, bytes, 0, bytes.length); }
  void link(Class<?> value) { resolveClass(value); }
  public static void main(String[] args) throws Exception {
    System.out.println("feature=" + Runtime.version().feature());
    for (int index = 1; index < args.length; index++) {
      String name = args[index], stage = "define";
      try {
        VerifierTaxonomy loader = new VerifierTaxonomy();
        Class<?> value = loader.define(Files.readAllBytes(Path.of(args[0], name + ".class")));
        stage = "resolve"; loader.link(value);
        stage = "initialize"; Class.forName(value.getName(), true, loader);
        System.out.println(name + "=accepted@" + stage);
      } catch (Throwable error) {
        System.out.println(name + "=" + error.getClass().getName() + "@" + stage);
      }
    }
  }
}\n`);
    const observed = [];
    for (const toolchain of manifest.toolchains) {
      const result = spawnSync(path.join(toolchain.home, 'bin/java'), ['-Xverify:all', sourcePath,
        directory, ...cases.map(entry => entry[0])], {encoding: 'utf8', timeout: 60000});
      assert.equal(result.status, 0, result.stderr || String(result.error));
      const lines = result.stdout.trim().split(/\r?\n/);
      assert.equal(lines.shift(), 'feature=' + toolchain.feature);
      assert.equal(lines.length, cases.length);
      console.log(toolchain.id + '\n' + result.stdout.trim());
      observed.push([toolchain, lines]);
    }
    for (const [toolchain, lines] of observed) {
      for (const [index, [name]] of cases.entries()) {
        const expected = name.startsWith('valid_') ? 'accepted' :
          name.startsWith('handler_') || name.startsWith('uninitialized_') || name.startsWith('format_') ? 'java.lang.ClassFormatError' : 'java.lang.VerifyError';
        assert.equal(lines[index], name + '=' + expected + '@initialize', toolchain.id + ': ' + name);
      }
    }
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});
