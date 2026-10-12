'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {test} = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.join(root, 'build/release-cli');
const sourceModules = new Set(['ClassData', 'ClassLoader', 'ConstantPool', 'threading', 'methods',
  'ClassVerification', 'ClassPreparation', 'LoadingConstraints', 'BytecodeVerifier', 'BytecodeTypeVerifier',
  'VerificationRelations', 'ReflectionAdapters', 'GeneratedAdapters', 'LambdaAdapters', 'SymbolicResolution',
  'ClassAccess', 'BootstrapLinkage', 'util']);
const cache = new Map();
function load(name) {
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(path.join(runtime, 'src', name + '.js'));
  if (cache.has(name)) return cache.get(name).exports;
  const filename = path.join(runtime, 'src', name + '.js'), loaded = new Module(filename, module);
  cache.set(name, loaded);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = id => id.startsWith('./') && sourceModules.has(id.slice(2)) ? load(id.slice(2)) : original(id);
  loaded._compile(ts.transpileModule(fs.readFileSync(path.join(root, 'src', name + '.ts'), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS, ignoreDeprecations: '6.0'}
  }).outputText, filename);
  return loaded.exports;
}
const {ReferenceClassData} = load('ClassData');
const {ClassLoader, applyModernBootstrapOverlays} = load('ClassLoader');
const {invokeExactMethod, invokeVirtualMethod} = load('methods');
const {JVMThread, BytecodeStackFrame, InternalStackFrame} = load('threading');
const {ThreadStatus, MethodHandleReferenceKind} = require(path.join(runtime, 'src/enums'));
const u2 = value => { const b = Buffer.alloc(2); b.writeUInt16BE(value); return b; };

// Parsed alias Method identities, real dispatch/MemberName bridge functions and
// actual Java exception/continuation frames isolate the entry authority check.
// Metadata and runnable bodies are controlled here; the genuine C5 corpus
// separately executes the public Java APIs in native, Node and Chromium hosts.
function payloadBytes(flags = 0x11) {
  const utf = value => Buffer.concat([Buffer.from([1]), u2(Buffer.byteLength(value)), Buffer.from(value)]);
  return Buffer.concat([Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0, 0, 0, 65]), u2(7),
    utf('scope/Payload'), Buffer.from([7, 0, 1]), utf('java/lang/Object'), Buffer.from([7, 0, 3]),
    utf('value'), utf('I'), u2(0x21), u2(2), u2(4), u2(0), u2(1),
    u2(flags), u2(5), u2(6), u2(0), u2(0), u2(0)]);
}
function world({hidden = true, final = true} = {}) {
  const loader = new ClassLoader(null);
  loader.bootstrap = loader;
  loader.getLoaderObject = () => null;
  const classes = new Map();
  for (const name of ['java/lang/reflect/Field', 'java/lang/invoke/MethodHandles$Lookup']) {
    const stock = execFileSync('unzip', ['-p', path.join(root, 'vendor/java_home/lib/rt.jar'), name + '.class'], {timeout: 10000});
    const cls = new ReferenceClassData(applyModernBootstrapOverlays('L' + name + ';', stock), null, loader);
    classes.set(cls.getInternalName(), cls);
  }
  const payload = new ReferenceClassData(payloadBytes(final ? 0x11 : 1), null, loader);
  if (hidden) payload.markHidden('0x1', null, false);
  loader.getLoadedClass = name => classes.get(name) || null;
  const fieldClass = classes.get('Ljava/lang/reflect/Field;'), lookupClass = classes.get('Ljava/lang/invoke/MethodHandles$Lookup;'),
    field = {'java/lang/reflect/Field/clazz': {$cls: payload}, 'java/lang/reflect/Field/slot': 0,
      'java/lang/reflect/Field/modifiers': 0, 'java/lang/reflect/AccessibleObject/override': 1,
      getClass: () => fieldClass}, lookup = {getClass: () => lookupClass};
  const owner = Object.create(JVMThread.prototype), errors = [];
  Object.assign(owner, {stack: [], status: ThreadStatus.RUNNABLE});
  owner.setStatus = function(value) { this.status = value; };
  owner.getBsCl = () => loader;
  owner.throwNewException = function(name, message) {
    const failure = {name, message}; errors.push(failure); this.throwException(failure);
  };
  owner.handleUncaughtException = () => assert.fail('Guard exception escaped its callback');
  return {loader, classes, payload, fieldClass, lookupClass, field, lookup, owner, errors};
}
function finishError(w, outcomes) {
  assert.equal(w.owner.stack.length, 1);
  assert.ok(w.owner.stack[0] instanceof InternalStackFrame);
  w.owner.stack[0].run(w.owner);
  assert.equal(w.owner.stack.length, 0);
  assert.equal(outcomes.length, 1);
  assert.equal(outcomes[0][0], w.errors[0]);
  assert.equal(outcomes[0][1], undefined);
  assert.equal(w.errors[0].name, 'Ljava/lang/IllegalAccessException;');
}
const setters = [['set', 'Ljava/lang/Object;'], ['setBoolean', 'Z'], ['setByte', 'B'], ['setChar', 'C'],
  ['setShort', 'S'], ['setInt', 'I'], ['setLong', 'J'], ['setFloat', 'F'], ['setDouble', 'D']];

for (const [name, type] of setters) test('exact private Field.' + name + ' alias rejects hidden-final writes before retained Code executes', () => {
  const w = world(), method = w.fieldClass.getDeclaredMethod('doppioHiddenFinalBase$' + name + '(Ljava/lang/Object;' + type + ')V'),
    outcomes = [], args = type === 'J' || type === 'D' ? [{}, 1, null] : [{}, 1];
  assert.ok(method.declaredCode, 'Actual parsed stock Code remains present');
  assert.equal(invokeExactMethod(w.owner, method, w.field, args, (...values) => outcomes.push(values)), false);
  finishError(w, outcomes);
});

test('reflection virtual dispatch into a private Field alias completes one failure and no success callback', () => {
  const w = world(), method = w.fieldClass.getDeclaredMethod('doppioHiddenFinalBase$setInt(Ljava/lang/Object;I)V'), outcomes = [];
  assert.equal(invokeVirtualMethod(w.owner, method, w.field, [{}, 1], (...values) => outcomes.push(values)), false);
  finishError(w, outcomes);
});

for (const kind of [MethodHandleReferenceKind.INVOKESPECIAL, MethodHandleReferenceKind.INVOKEVIRTUAL]) {
  test('real MethodHandle MemberName bridge kind' + kind + ' cannot bypass hidden-final Field alias guard', () => {
    const w = world(), method = w.fieldClass.getDeclaredMethod('doppioHiddenFinalBase$setInt(Ljava/lang/Object;I)V'), outcomes = [];
    method.getVMTargetBridgeMethod(w.owner, kind)(w.owner, '(Ljava/lang/reflect/Field;Ljava/lang/Object;I)V',
      [w.field, {}, 1], (...values) => outcomes.push(values));
    finishError(w, outcomes);
  });
}

test('accessible Lookup.unreflectSetter private alias cannot create a hidden-final setter capability', () => {
  const w = world(), method = w.lookupClass.getDeclaredMethod(
    'doppioHiddenFinalBase$unreflectSetter(Ljava/lang/reflect/Field;)Ljava/lang/invoke/MethodHandle;'), outcomes = [];
  assert.equal(invokeVirtualMethod(w.owner, method, w.lookup, [w.field], (...values) => outcomes.push(values)), false);
  finishError(w, outcomes);
});

for (const options of [{hidden: false}, {final: false}]) test('ordinary or mutable field alias retains its original bytecode frame and arguments: ' + JSON.stringify(options), () => {
  const w = world(options), method = w.fieldClass.getDeclaredMethod('doppioHiddenFinalBase$setInt(Ljava/lang/Object;I)V'),
    target = {}, args = [target, 13], outcomes = [];
  assert.equal(invokeExactMethod(w.owner, method, w.field, args, (...values) => outcomes.push(values)), true);
  assert.equal(w.errors.length, 0);
  assert.equal(w.owner.stack.length, 2);
  const frame = w.owner.stack[1];
  assert.ok(frame instanceof BytecodeStackFrame);
  assert.equal(frame.method, method, 'The exact stock alias body executes, not a fabricated replacement');
  assert.deepEqual(frame.locals, [w.field, target, 13]);
  assert.deepEqual(outcomes, []);
  assert.deepEqual(args, [target, 13], 'Callee locals do not mutate a shared argument vector');
});

test('a guest declaration with the same alias spelling cannot masquerade as an exact bootstrap guard target', () => {
  const w = world(), actual = w.fieldClass.getDeclaredMethod('doppioHiddenFinalBase$setInt(Ljava/lang/Object;I)V'),
    cloned = Object.create(Object.getPrototypeOf(actual));
  Object.assign(cloned, actual, {cls: w.payload});
  assert.equal(invokeExactMethod(w.owner, cloned, {getClass: () => w.payload}, [{}, 1]), true);
  assert.equal(w.errors.length, 0);
  assert.ok(w.owner.stack[0] instanceof BytecodeStackFrame);
});
