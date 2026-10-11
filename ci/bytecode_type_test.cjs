'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {test} = require('node:test');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const ByteStream = require(path.join(runtime, 'src/ByteStream')).default;
const {ConstantPool} = require(path.join(runtime, 'src/ConstantPool'));
const {Code, StackMapTable, ExceptionHandler} = require(path.join(runtime, 'src/attributes'));
const {StackMapTableEntryType: Frame} = require(path.join(runtime, 'src/enums'));
const cache = {};
function load(name) {
  const filename = path.join(runtime, 'src', name + '.js');
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(filename);
  if (cache[name]) return cache[name].exports;
  const Module = require('node:module');
  const ts = require('typescript');
  const source = fs.readFileSync(path.join(__dirname, '../src', name + '.ts'), 'utf8');
  const loaded = new Module(filename, module);
  cache[name] = loaded;
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = id => /^\.\/Bytecode(?:Type)?Verifier$/.test(id) ? load(id.slice(2)) : original(id);
  loaded._compile(ts.transpileModule(source, {compilerOptions: {
    target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS
  }}).outputText, filename);
  return loaded.exports;
}
const {decodeMethodCode, BytecodeVerificationError, BytecodeFormatError} = load('BytecodeVerifier');
const {verifyMethodTypes} = load('BytecodeTypeVerifier');
const u2 = n => { const b = Buffer.alloc(2); b.writeUInt16BE(n); return b; };
function input(code, options = {}) {
  const constants = [];
  const add = (tag, ...bytes) => { constants.push(Buffer.concat([Buffer.from([tag]), ...bytes])); return constants.length; };
  const utf = text => { const b = Buffer.from(text); return add(1, u2(b.length), b); };
  const cls = text => add(7, u2(utf(text)));
  const ref = (tag, owner, name, desc) => add(tag, u2(cls(owner)), u2(add(12, u2(utf(name)), u2(utf(desc)))));
  const indices = {objectInit: ref(10, 'java/lang/Object', '<init>', '()V'), self: cls('verify/Probe'),
    selfInit: ref(10, 'verify/Probe', '<init>', '()V'), field: ref(9, 'verify/Probe', 'value', 'I'),
    consumeString: ref(10, 'verify/Probe', 'consume', '(Ljava/lang/String;)V'),
    string: cls('java/lang/String'), method: ref(10, 'java/lang/Object', 'toString', '()Ljava/lang/String;'),
    object: cls('java/lang/Object'), protectedBase: cls('java/util/AbstractList'),
    protectedInit: ref(10, 'java/util/AbstractList', '<init>', '()V')};
  const cp = new ConstantPool();
  cp.parse(new ByteStream(Buffer.concat([u2(constants.length + 1), ...constants])), null, options.major || 65);
  return {className: 'Lverify/Probe;', superClassName: options.superClassName || 'Ljava/lang/Object;', majorVersion: options.major || 65,
    name: options.name || 'probe', descriptor: options.descriptor || '()V',
    declaredAccessFlags: options.flags === undefined ? 9 : options.flags, constantPool: cp,
    declaredCode: new Code(options.stack === undefined ? 8 : options.stack, options.locals === undefined ? 8 : options.locals,
      (options.handlers || []).map(handler => new ExceptionHandler(...handler)),
      options.frames ? [new StackMapTable(options.frames)] : [], Buffer.from(typeof code === 'function' ? code(indices) : code))};
}
const verify = (code, options) => { const method = input(code, options); return verifyMethodTypes(method, decodeMethodCode(method)); };
const invalid = (code, options) => assert.throws(() => verify(code, options), BytecodeVerificationError);
const same = delta => ({type: Frame.SAME_FRAME, offsetDelta: delta});
const full = (delta, locals, stack = []) => ({type: Frame.FULL_FRAME, offsetDelta: delta, localsTypes: locals, stackTypes: stack});

test('type verifier checks arithmetic, underflow, return types and stack limits', () => {
  verify([3, 4, 0x60, 0xac], {descriptor: '()I', stack: 2});
  verify([3, 4, 0xac], {descriptor: '()I'}); // Extra values below return are legal.
  invalid([0x57, 0xb1]);
  invalid([0x0b, 0xac], {descriptor: '()I'});
  invalid([3, 4, 0x60, 0xac], {descriptor: '()I', stack: 1});
  invalid([0xb1], {descriptor: '()I'});
  invalid([0]); // Falling off the end is never a return.
});

test('category-2 stack manipulation and local overlap use real verification widths', () => {
  verify([9, 0x58, 0xb1]);
  verify([9, 0x5c, 0x61, 0xad], {descriptor: '()J'});
  invalid([9, 0x57, 0xb1]);
  invalid([9, 0x59, 0x58, 0xb1]);
  invalid([0x1a, 0xac], {descriptor: '()I'});
  invalid([9, 0x3f, 3, 0x3c, 0x1e, 0xad], {descriptor: '()J'});
  verify([9, 0x3f, 0x1e, 0xad], {descriptor: '()J'});
});

test('modern branch targets and dead code require frames and consistent stack types', () => {
  const code = [3, 0x99, 0, 4, 0xb1, 0xb1];
  verify(code, {frames: [same(5)]});
  invalid(code);
  invalid(code, {frames: [full(5, [], [{tag: 1}])]});
  invalid([0xb1, 0xb1]);
  verify([0xb1, 0xb1], {frames: [same(1)]});
  invalid([0xa7, 0, 0]); // The implicit initial state is not an explicit target frame.
  verify([0xa7, 0, 0], {frames: [same(0)]});
});

test('frame-local declarations cannot invent initialized locals on a branch', () => {
  invalid([0xa7, 0, 3, 0x1a, 0xac], {descriptor: '()I', frames: [full(3, [{tag: 1}])]});
  verify([3, 0x3b, 0xa7, 0, 3, 0x1a, 0xac], {descriptor: '()I', frames: [full(5, [{tag: 1}])]});
});

test('arrays check index and component types, including primitive arrays', () => {
  verify([3, 0xbc, 10, 3, 0x2e, 0xac], {descriptor: '()I'});
  invalid([3, 0xbc, 10, 3, 0x30, 0xae], {descriptor: '()F'});
  invalid([3, 0xbc, 10, 0x0b, 0x2e, 0xac], {descriptor: '()I'});
  invalid([3, 0xbc, 10, 3, 1, 0x53, 0xb1]);
});

test('reference uses produce loader-aware obligations without resolving symbols', () => {
  const result = verify(indices => [0x2a, 0xb8, ...u2(indices.consumeString), 0xb1], {descriptor: '(Ljava/lang/Object;)V'});
  assert.ok(result.obligations.some(item => item.kind === 'assignable' && item.sourceType === 'Ljava/lang/Object;' && item.targetType === 'Ljava/lang/String;'));
  invalid(indices => [3, 0xb8, ...u2(indices.consumeString), 0xb1]);
  verify(indices => [1, 0xb8, ...u2(indices.consumeString), 0xb1]);
});

test('new objects stay uninitialized until the exact constructor initializes all aliases', () => {
  verify(indices => [0xbb, ...u2(indices.self), 0x59, 0xb7, ...u2(indices.selfInit), 0xb0], {descriptor: '()Lverify/Probe;'});
  invalid(indices => [0xbb, ...u2(indices.self), 0xb0], {descriptor: '()Lverify/Probe;'});
  invalid(indices => [0xbb, ...u2(indices.self), 0xb7, ...u2(indices.objectInit), 0xb1]);
  invalid([0xb1], {name: '<init>', flags: 1});
  verify(indices => [0x2a, 0xb7, ...u2(indices.objectInit), 0xb1], {name: '<init>', flags: 1});
  invalid(indices => [0x2a, 0xb6, ...u2(indices.method), 0x57, 0xb1], {name: '<init>', flags: 1});
});

test('exception handlers receive exactly one Throwable and check incoming locals', () => {
  verify([0x01, 0xbf, 0x57, 0xb1], {handlers: [[0, 2, 2, '<any>']],
    frames: [full(2, [], [{tag: 7, className: 'Ljava/lang/Throwable;'}])]});
  invalid([0x01, 0xbf, 0x57, 0xb1], {handlers: [[0, 2, 2, '<any>']], frames: [same(2)]});
  for (const major of [49, 50]) {
    const unreachable = verify([0xb1, 0, 0xb1, 0xbf], {major,
      handlers: [[1, 2, 3, 'Ljava/lang/Object;']]});
    assert.equal(unreachable.checkedInstructions, 1);
    assert.ok(unreachable.obligations.some(item => item.kind === 'assignable' &&
      item.sourceType === 'Ljava/lang/Object;' && item.targetType === 'Ljava/lang/Throwable;'));
  }
});

test('historical inference retains branch and jsr/ret control flow without modern frames', () => {
  for (const major of [49, 50]) {
    verify([3, 0x99, 0, 4, 0xb1, 0xb1], {major});
    verify([0xa8, 0, 4, 0xb1, 0x4b, 0xa9, 0], {major});
    invalid([0xa9, 0], {major});
    invalid([0xa8, 0, 4, 0xb1, 0x4b, 0xa8, 0xff, 0xff, 0xa9, 0], {major});
  }
});

test('special invocations constrain receivers to the current class and protect new constructors', () => {
  const foreign = verify(indices => [0xbb, ...u2(indices.object), 0x59, 0xb7, ...u2(indices.objectInit),
    0xb7, ...u2(indices.method), 0x57, 0xb1]);
  assert.ok(foreign.obligations.some(item => item.kind === 'assignable' &&
    item.sourceType === 'Ljava/lang/Object;' && item.targetType === 'Lverify/Probe;'));
  const constructor = verify(indices => [0xbb, ...u2(indices.protectedBase),
    0xb7, ...u2(indices.protectedInit), 0xb1], {superClassName: 'Ljava/util/AbstractList;'});
  assert.ok(constructor.obligations.some(item => item.kind === 'protected' && item.memberName === '<init>' &&
    item.sourceType === 'Ljava/util/AbstractList;' && item.targetType === 'Ljava/util/AbstractList;'));
});

test('uninitialized references may be compared and monitored but may not escape or be cast', () => {
  for (const opcode of [0xc6, 0xc7]) {
    verify(indices => [0xbb, ...u2(indices.self), opcode, 0, 3, 0xb1], {frames: [same(6)]});
  }
  for (const opcode of [0xa5, 0xa6]) {
    verify(indices => [0xbb, ...u2(indices.self), 0x59, opcode, 0, 3, 0xb1], {frames: [same(7)]});
  }
  verify(indices => [0xbb, ...u2(indices.self), 0x59, 0xc2, 0xc3, 0xb1]);
  invalid(indices => [0xbb, ...u2(indices.self), 0xbf]);
  for (const opcode of [0xc0, 0xc1]) invalid(indices => [0xbb, ...u2(indices.self), opcode, ...u2(indices.self), 0x57, 0xb1]);
  invalid(indices => [0xbb, ...u2(indices.self), 0xb0], {descriptor: '()Ljava/lang/Object;'});
});

test('frame matching counts words and allows unusable Top values only when they stay unused', () => {
  verify([3, 0xa7, 0, 3, 0xb1], {frames: [full(4, [], [{tag: 0}])]});
  verify([9, 0xa7, 0, 3, 0xb1], {frames: [full(4, [], [{tag: 0}, {tag: 0}])]});
  verify([14, 0xa7, 0, 3, 0xb1], {frames: [full(4, [], [{tag: 0}, {tag: 0}])]});
  invalid([0xb1, 0x57, 0xb1], {frames: [full(1, [], [{tag: 0}])]});
  invalid([0xb1, 0x59, 0x58, 0xb1], {frames: [full(1, [], [{tag: 0}])]});
  invalid([0xb1, 0x58, 0xb1], {frames: [full(1, [], [{tag: 0}, {tag: 0}])]});
  invalid([3, 4, 0xa7, 0, 3, 0x58, 0xb1], {frames: [full(5, [], [{tag: 4}])]});
  assert.throws(() => verify([0xb1], {stack: 1, frames: [full(0, [], [{tag: 1}, {tag: 1}])]}), BytecodeFormatError);
});

test('constructor flags are represented by uninitializedThis locals, not stack entries', () => {
  invalid(indices => [0x2a, 1, 0x4b, 0xa7, 0, 3, 0xb7, ...u2(indices.objectInit), 0xb1], {
    name: '<init>', flags: 1, frames: [full(6, [{tag: 5}], [{tag: 6}])]
  });
});

test('native JVM compatibility retains uninitialized tokens declared in dead framed blocks', () => {
  // JDK 21 and 25 accept these unreachable frames despite the stricter new
  // substitution/notMember clauses in the specification's Prolog presentation.
  verify(indices => [0xb1, 0xbb, ...u2(indices.self), 0x57, 0x2a, 0xb7, ...u2(indices.selfInit), 0xb1], {
    frames: [full(1, [{tag: 8, newOffset: 1}])]
  });
  verify(indices => [0xb1, 0xbb, ...u2(indices.self), 0x58, 0xb1], {
    frames: [full(1, [], [{tag: 8, newOffset: 1}])]
  });
  for (const major of [49, 50, 65]) {
    verify(indices => [0xbb, ...u2(indices.object), 0x4b, 0xa7, 0xff, 0xfc], {
      major, frames: [same(0)]
    });
    verify(indices => [0xbb, ...u2(indices.object), 0x4b, 0x2a, 0x57, 0xa7, 0xff, 0xfe], {
      major, frames: [full(4, [{tag: 8, newOffset: 0}])]
    });
  }
});
