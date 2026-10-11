'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const sourceModules = new Set(['ClassData', 'ClassLoader', 'ConstantPool', 'threading', 'methods',
  'ClassVerification', 'BytecodeVerifier', 'BytecodeTypeVerifier', 'VerificationRelations',
  'GeneratedAdapters', 'LambdaAdapters', 'ReflectionAdapters', 'LoadingConstraints', 'ClassPreparation',
  'opcodes', 'jit', 'method_handles', 'SymbolicResolution', 'ClassAccess', 'util']);
const cache = new Map();
function load(name) {
  const filename = path.join(runtime, 'src', name + '.js');
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(filename);
  if (cache.has(name)) return cache.get(name).exports;
  const loaded = new Module(filename, module);
  cache.set(name, loaded);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = id => {
    const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(name), id));
    return id.startsWith('.') && sourceModules.has(dependency) ? load(dependency) : original(id);
  };
  loaded._compile(require('typescript').transpileModule(
    fs.readFileSync(path.join(__dirname, '../src', name + '.ts'), 'utf8'), {
      compilerOptions: {target: 1, module: 1, ignoreDeprecations: '6.0'}
    }).outputText, filename);
  return loaded.exports;
}
const {ReferenceClassData, ArrayClassData, PrimitiveClassData} = load('ClassData');
const {PreAllocatedStack} = load('threading');
const opcodes = load('opcodes');
const {OpCode} = require(path.join(runtime, 'src/enums'));
const u2 = value => { const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes; };
const u4 = value => { const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes; };
const storeDescriptor = '([Ljava/lang/Object;ILjava/lang/Object;I)I';
const storePC = 4;
const storeCode = Buffer.from([OpCode.ILOAD_3, OpCode.ALOAD_0, OpCode.ILOAD_1,
  OpCode.ALOAD_2, OpCode.AASTORE, OpCode.IRETURN]);

// Deliberately constructed metadata, not javac/native/host-conformance evidence.
// The actual parser, class identity predicates and instruction/Trace emitters
// run here. The genuine JavaCoreArraysObjects gate supplies native agreement.
function classBytes(name, superclass, interfaces, flags, withProbe = false) {
  const pool = [];
  const utf = text => {
    const bytes = Buffer.from(text);
    pool.push(Buffer.concat([Buffer.from([1]), u2(bytes.length), bytes]));
    return pool.length;
  };
  const cls = text => {
    const index = utf(text);
    pool.push(Buffer.concat([Buffer.from([7]), u2(index)]));
    return pool.length;
  };
  const self = cls(name), parent = superclass === null ? 0 : cls(superclass);
  const parents = interfaces.map(cls), methods = [];
  if (withProbe) {
    const methodName = utf('store'), descriptor = utf(storeDescriptor), codeName = utf('Code');
    const body = Buffer.concat([u2(4), u2(4), u4(storeCode.length), storeCode, u2(0), u2(0)]);
    methods.push(Buffer.concat([u2(9), u2(methodName), u2(descriptor), u2(1),
      u2(codeName), u4(body.length), body]));
  }
  return Buffer.concat([Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0, 0, 0, 65]), u2(pool.length + 1), ...pool,
    u2(flags), u2(self), u2(parent), u2(parents.length), ...parents.map(u2), u2(0),
    u2(methods.length), ...methods, u2(0)]);
}

function world() {
  const classes = [], loaders = [];
  const sameJavaLoaderObject = {};
  function loader() {
    const definitions = new Map(), value = {
      bootstrap: loaders[0] || null,
      getLoadedClass: name => definitions.get(name) || null,
      // Deliberately identical Java loader mirrors cannot merge defining identities.
      getLoaderObject: () => sameJavaLoaderObject,
      loadClass() { assert.fail('aastore must not load a class'); },
      resolveClass() { assert.fail('aastore must not link a class'); },
      initializeClass() { assert.fail('aastore must not initialize a class'); }
    };
    if (loaders.length === 0) value.bootstrap = value;
    value.definitions = definitions;
    loaders.push(value);
    return value;
  }
  const bootstrap = loader();
  let object;
  function define(name, {parent = object || null, interfaces = [], owner = bootstrap,
      iface = false, withProbe = false} = {}) {
    const result = new ReferenceClassData(classBytes(name,
      parent === null ? null : parent.getInternalName().slice(1, -1),
      interfaces.map(cls => cls.getInternalName().slice(1, -1)), iface ? 0x601 : 0x21, withProbe), null, owner);
    owner.definitions.set(result.getInternalName(), result);
    result.setResolved(parent, interfaces);
    classes.push(result);
    return result;
  }
  object = define('java/lang/Object', {parent: null});
  const cloneable = define('java/lang/Cloneable', {iface: true});
  const serializable = define('java/io/Serializable', {iface: true});
  const role = define('store/Role', {iface: true});
  const base = define('store/Base', {interfaces: [role]});
  const child = define('store/Child', {parent: base});
  const other = define('store/Other');
  const probe = define('store/Probe', {withProbe: true}).getDeclaredMethod('store' + storeDescriptor);
  const primitive = type => new PrimitiveClassData(type, bootstrap);
  function array(component) {
    const result = new ArrayClassData(component.getInternalName(), component.getLoader());
    result.setResolved(object, component);
    classes.push(result);
    return result;
  }
  function forbidActiveWork() {
    for (const cls of classes) {
      for (const method of ['resolve', 'tryToResolve', 'initialize', 'tryToInitialize'])
        cls[method] = () => assert.fail('aastore called ' + method);
      if (cls.verification) for (const method of ['verify', 'tryToVerify'])
        cls.verification[method] = () => assert.fail('aastore called verifier');
    }
  }
  return {define, loader, array, primitive, object, cloneable, serializable, role, base, child, other,
    probe, classes, forbidActiveWork};
}

function reference(cls, events) {
  return {getClass() { if (events) events.push('value-class'); return cls; }};
}

function arrayValue(cls, initial, events) {
  let stored = initial;
  const backing = [initial];
  Object.defineProperty(backing, '0', {
    enumerable: true, configurable: true,
    get() { return stored; },
    set(value) { events.push('write'); stored = value; }
  });
  return {array: backing, getClass: () => cls};
}

function execute(engine, w, array, index, value) {
  w.forbidActiveWork();
  const returned = [], errors = [];
  const frame = {method: w.probe, locals: [array, index, value, 29], pc: 0,
    opStack: new PreAllocatedStack(4), returnToThreadLoop: false};
  const thread = {
    getJVM: () => ({shouldPrintJITCompilation: () => false, shouldDumpCompiledCode: () => false}),
    asyncReturn(result) { returned.push(result); },
    throwNewException(name, message) {
      errors.push({name, message, pc: frame.pc, stack: frame.opStack.sliceFromBottom(0)});
    }
  };
  const before = Buffer.from(w.probe.getCodeAttribute().getCode());
  if (engine === 'interpreter') {
    for (let steps = 0; !frame.returnToThreadLoop; steps++) {
      assert.ok(steps < 8, 'bounded real instruction execution');
      opcodes.LookupTable[storeCode[frame.pc]](thread, frame, storeCode);
    }
  } else {
    // Invoke the actual private planner/Trace.close through its JS method, not
    // a copied emitter. This exercises stack caching and onErrorPushes too.
    const compiled = w.probe.jitCompileFrom(0, thread);
    assert.equal(typeof compiled, 'function', 'the full store trace must compile');
    compiled(frame, thread, opcodes);
  }
  assert.equal(w.probe.getCodeAttribute().getCode().equals(before), true, 'instruction bytes stay unchanged');
  return {frame, errors, returned};
}

function success(result) {
  assert.equal(result.errors.length, 0, 'valid store must not throw');
  assert.deepEqual(result.returned, [29], 'store operands are consumed, unrelated value reaches ireturn exactly once');
  assert.equal(result.frame.pc, 5);
  assert.equal(result.frame.returnToThreadLoop, true);
  assert.deepEqual(result.frame.opStack.sliceFromBottom(0), []);
}

function failure(result, name) {
  assert.deepEqual(result.errors.map(error => error.name), [name], 'exact one guest exception');
  assert.equal(result.errors[0].pc, storePC, 'throwing instruction PC is restored before guest delivery');
  assert.deepEqual(result.errors[0].stack, [29], 'cached values are restored before guest delivery');
  assert.deepEqual(result.returned, [], 'failed store must not run the success continuation');
  assert.equal(result.frame.pc, storePC, 'failure retains the actual throwing instruction PC');
  assert.equal(result.frame.returnToThreadLoop, true);
  assert.deepEqual(result.frame.opStack.sliceFromBottom(0), [29],
    'store operands consumed once; cached JIT values restored before handler dispatch');
}

test('aastore fixtures use actual parsed metadata and distinguish defining loaders', () => {
  const w = world(), first = w.loader(), second = w.loader();
  const a = w.define('same/Name', {owner: first}), b = w.define('same/Name', {owner: second});
  assert.equal(a instanceof ReferenceClassData, true);
  assert.equal(a.getInternalName(), b.getInternalName());
  assert.equal(first.getLoaderObject() === second.getLoaderObject(), true);
  assert.equal(a === b, false);
  assert.equal(a.isCastable(b), false);
  assert.equal(w.probe.declaredCode.getCode().equals(storeCode), true);
  assert.equal(w.probe.cls.isVerified(), false, 'synthetic instruction unit, not a guest verification claim');
});

for (const engine of ['interpreter', 'jit']) {
  test(engine + ': aastore accepts exact/subclass values and stores the same reference once', () => {
    for (const kind of ['exact', 'subclass']) {
      const w = world(), events = [], original = reference(w.base),
        value = reference(kind === 'exact' ? w.base : w.child, events),
        array = arrayValue(w.array(w.base), original, events);
      success(execute(engine, w, array, 0, value));
      assert.equal(array.array[0] === value, true);
      assert.equal(events.filter(event => event === 'write').length, 1, 'one successful mutation');
      assert.ok(events.indexOf('value-class') >= 0 && events.indexOf('value-class') < events.indexOf('write'),
        'type decision precedes mutation');
    }
  });

  test(engine + ': aastore rejects an unrelated value before mutation or return', () => {
    const w = world(), events = [], original = reference(w.child),
      array = arrayValue(w.array(w.child), original, events), value = reference(w.other, events);
    failure(execute(engine, w, array, 0, value), 'Ljava/lang/ArrayStoreException;');
    assert.equal(array.array[0] === original, true, 'failed store preserves old element identity');
    assert.ok(events.length > 0 && events.every(event => event === 'value-class'), 'type check without mutation');
  });

  test(engine + ': a covariant array still rejects a superclass value', () => {
    const w = world(), events = [], original = reference(w.child),
      array = arrayValue(w.array(w.child), original, events);
    failure(execute(engine, w, array, 0, reference(w.base, events)), 'Ljava/lang/ArrayStoreException;');
    assert.equal(array.array[0] === original, true);
    assert.ok(events.length > 0 && events.every(event => event === 'value-class'), 'type check without mutation');
  });

  test(engine + ': null is legal without a value class query', () => {
    const w = world(), events = [], array = arrayValue(w.array(w.child), reference(w.child), events);
    success(execute(engine, w, array, 0, null));
    assert.equal(array.array[0], null);
    assert.deepEqual(events, ['write']);
  });

  test(engine + ': interface arrays use actual implementation identity', () => {
    for (const compatible of [true, false]) {
      const w = world(), events = [], original = reference(w.child),
        array = arrayValue(w.array(w.role), original, events),
        value = reference(compatible ? w.child : w.other, events);
      const result = execute(engine, w, array, 0, value);
      if (compatible) success(result); else failure(result, 'Ljava/lang/ArrayStoreException;');
      assert.equal(array.array[0] === (compatible ? value : original), true);
    }
  });

  test(engine + ': same-named class values from another defining loader are rejected', () => {
    const w = world(), first = w.loader(), second = w.loader(), events = [];
    const target = w.define('same/Value', {owner: first}), foreign = w.define('same/Value', {owner: second});
    const original = reference(target), array = arrayValue(w.array(target), original, events);
    failure(execute(engine, w, array, 0, reference(foreign, events)), 'Ljava/lang/ArrayStoreException;');
    assert.equal(array.array[0] === original, true);
    assert.ok(events.length > 0 && events.every(event => event === 'value-class'), 'type check without mutation');
  });

  test(engine + ': same-named interfaces from another loader do not confer assignment compatibility', () => {
    const w = world(), first = w.loader(), second = w.loader(), events = [];
    const target = w.define('same/Role', {owner: first, iface: true}),
      foreign = w.define('same/Role', {owner: second, iface: true}),
      implementation = w.define('same/Impl', {owner: second, interfaces: [foreign]});
    const array = arrayValue(w.array(target), null, events);
    failure(execute(engine, w, array, 0, reference(implementation, events)), 'Ljava/lang/ArrayStoreException;');
    assert.equal(array.array[0], null);
    assert.ok(events.length > 0 && events.every(event => event === 'value-class'), 'type check without mutation');
  });

  test(engine + ': reference-array values obey recursive component covariance', () => {
    for (const compatible of [true, false]) {
      const w = world(), events = [], component = w.array(w.base),
        valueClass = w.array(compatible ? w.child : w.object),
        original = reference(component), array = arrayValue(w.array(component), original, events),
        value = reference(valueClass, events);
      const result = execute(engine, w, array, 0, value);
      if (compatible) success(result); else failure(result, 'Ljava/lang/ArrayStoreException;');
      assert.equal(array.array[0] === (compatible ? value : original), true);
    }
  });

  test(engine + ': primitive-array values require the exact primitive component type', () => {
    for (const compatible of [true, false]) {
      const w = world(), events = [], ints = w.array(w.primitive('I')),
        valueClass = compatible ? ints : w.array(w.primitive('J')),
        original = reference(ints), array = arrayValue(w.array(ints), original, events),
        value = reference(valueClass, events);
      const result = execute(engine, w, array, 0, value);
      if (compatible) success(result); else failure(result, 'Ljava/lang/ArrayStoreException;');
      assert.equal(array.array[0] === (compatible ? value : original), true);
    }
  });

  test(engine + ': array values can be stored in actual bootstrap Object and marker-interface arrays', () => {
    for (const target of ['object', 'cloneable', 'serializable']) {
      const w = world(), events = [], array = arrayValue(w.array(w[target]), null, events),
        value = reference(w.array(w.primitive('I')), events);
      success(execute(engine, w, array, 0, value));
      assert.equal(array.array[0] === value, true);
    }
  });

  test(engine + ': null-array rejection precedes index and value compatibility checks', () => {
    const w = world();
    const value = {getClass() { assert.fail('null array must reject before value type inspection'); }};
    failure(execute(engine, w, null, -1, value), 'Ljava/lang/NullPointerException;');
  });

  test(engine + ': both negative and upper bounds precede incompatible value inspection', () => {
    for (const index of [-1, 1]) {
      const w = world(), events = [], original = reference(w.child),
        array = arrayValue(w.array(w.child), original, events);
      const value = {getClass() { assert.fail('bounds must reject before value type inspection'); }};
      failure(execute(engine, w, array, index, value), 'Ljava/lang/ArrayIndexOutOfBoundsException;');
      assert.equal(array.array.length, 1, 'failed store cannot extend the array');
      assert.equal(array.array[0] === original, true);
      assert.deepEqual(events, []);
    }
  });
}
