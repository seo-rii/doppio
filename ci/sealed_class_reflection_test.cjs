'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const sourceModules = new Set(['doppiojvm', 'VM', 'ClassFile', 'ClassData', 'ClassLoader', 'ConstantPool',
  'threading', 'methods', 'util', 'ClassVerification', 'ClassPreparation', 'LoadingConstraints',
  'BytecodeVerifier', 'BytecodeTypeVerifier', 'VerificationRelations', 'GeneratedAdapters',
  'LambdaAdapters', 'ReflectionAdapters', 'SymbolicResolution', 'ClassAccess', 'method_handles', 'natives/java_lang']);
const cache = new Map();
function load(name) {
  const filename = path.join(runtime, 'src', name + '.js');
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(filename);
  if (cache.has(name)) return cache.get(name).exports;
  const loaded = new Module(filename, module); cache.set(name, loaded);
  loaded.filename = filename; loaded.paths = Module._nodeModulePaths(path.dirname(filename));
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
const natives = load('natives/java_lang').default()['java/lang/DoppioClass'];
const getPermitted = natives['getPermittedSubclasses(Ljava/lang/Class;)[Ljava/lang/Class;'];
const isSealed = natives['isSealed(Ljava/lang/Class;)Z'];
const {ReferenceClassData, ArrayClassData, PrimitiveClassData} = load('ClassData');
const {ClassLoader} = load('ClassLoader');
const {JVMThread} = load('threading');
const {ThreadStatus, StackFrameType} = require(path.join(runtime, 'src/enums'));
const u2 = value => { const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes; };
const u4 = value => { const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes; };

// Synthetic parsed classes and controlled mirrors/array allocation isolate the
// real registered natives, ClassReference resolution and JVMThread boundaries.
// The genuine B7 host corpus, not these seams, supplies native/browser parity.
function classBytes({name, parent = 'java/lang/Object', interfaces = [], flags = 0x21,
    permits = null, invalidBody = false}) {
  const entries = [], indices = new Map();
  function utf(text) {
    const key = 'utf:' + text;
    if (!indices.has(key)) {
      entries.push(Buffer.concat([Buffer.from([1]), u2(Buffer.byteLength(text)), Buffer.from(text)]));
      indices.set(key, entries.length);
    }
    return indices.get(key);
  }
  function cls(text) {
    const key = 'class:' + text;
    if (!indices.has(key)) {
      const nameIndex = utf(text); entries.push(Buffer.concat([Buffer.from([7]), u2(nameIndex)]));
      indices.set(key, entries.length);
    }
    return indices.get(key);
  }
  const self = cls(name), superclass = parent === null ? 0 : cls(parent), parents = interfaces.map(cls), attrs = [], methods = [];
  if (permits !== null) {
    const index = utf('PermittedSubclasses'), names = permits.map(cls);
    const body = Buffer.concat([u2(names.length), ...names.map(u2)]);
    attrs.push(Buffer.concat([u2(index), u4(body.length), body]));
  }
  if (invalidBody) {
    const nameIndex = utf('bad'), descriptor = utf('()I'), codeName = utf('Code');
    const body = Buffer.concat([u2(0), u2(0), u4(1), Buffer.from([0xb1]), u2(0), u2(0)]);
    methods.push(Buffer.concat([u2(9), u2(nameIndex), u2(descriptor), u2(1), u2(codeName), u4(body.length), body]));
  }
  return Buffer.concat([u4(0xcafebabe), u2(0), u2(65), u2(entries.length + 1), ...entries,
    u2(flags), u2(self), u2(superclass), u2(parents.length), ...parents.map(u2), u2(0),
    u2(methods.length), ...methods, u2(attrs.length), ...attrs]);
}

function world() {
  const classes = [], requests = [], definitions = new Map(), failures = new Map(), allocated = [];
  const bootstrap = new ClassLoader(null); bootstrap.bootstrap = bootstrap;
  bootstrap.getLoaderObject = () => null;
  function instrument(loader) {
    loader._loadClass = (caller, name, callback) => {
      requests.push({loader, name});
      setImmediate(() => {
        const failure = failures.get(name);
        if (failure) { caller.throwException(failure); callback(null); return; }
        const cls = definitions.get(loader)?.get(name);
        if (!cls) { caller.throwNewException('Ljava/lang/NoClassDefFoundError;', name); callback(null); return; }
        loader.addClass(name, cls); callback(cls);
      });
    };
    definitions.set(loader, new Map()); return loader;
  }
  instrument(bootstrap);
  function define(spec, loader = bootstrap, publish = true) {
    const cls = new ReferenceClassData(classBytes(spec), null, loader);
    definitions.get(loader).set(cls.getInternalName(), cls);
    if (publish) loader.addClass(cls.getInternalName(), cls);
    cls.getClassObject = () => cls.mirror || (cls.mirror = {$cls: cls});
    classes.push(cls); return cls;
  }
  const object = define({name: 'java/lang/Object', parent: null});
  assert.equal(object.tryToResolveHierarchy(), true);
  for (const [name, parent] of [
    ['Throwable', 'Object'], ['Error', 'Throwable'], ['Exception', 'Throwable'],
    ['RuntimeException', 'Exception'], ['AssertionError', 'Error'], ['LinkageError', 'Error'],
    ['IncompatibleClassChangeError', 'LinkageError'], ['NoClassDefFoundError', 'LinkageError'],
    ['IllegalAccessError', 'IncompatibleClassChangeError'], ['VirtualMachineError', 'Error'],
    ['OutOfMemoryError', 'VirtualMachineError']
  ]) assert.equal(define({name: 'java/lang/' + name, parent: 'java/lang/' + parent}).tryToResolveHierarchy(), true);
  function loader() {
    const value = new ClassLoader(bootstrap); value.getLoaderObject = () => value;
    for (const cls of classes.filter(cls => cls.getInternalName().startsWith('Ljava/lang/')))
      value.addClass(cls.getInternalName(), cls);
    return instrument(value);
  }
  function array(component) {
    const cls = new ArrayClassData(component.getInternalName(), component.getLoader()); cls.setResolved(object, component);
    cls.getClassObject = () => cls.mirror || (cls.mirror = {$cls: cls});
    component.getLoader().addClass(cls.getInternalName(), cls); return cls;
  }
  const classType = define({name: 'java/lang/Class'}), classArray = array(classType);
  classArray.getConstructor = () => function ClassArray(caller, length) {
    assert.ok(caller); this.array = new Array(length).fill(null); this.getClass = () => classArray;
    allocated.push(this);
  };
  bootstrap.getInitializedClass = (caller, name) => {
    assert.equal(name, '[Ljava/lang/Class;', 'Only result-array allocation is an allowed active seam'); return classArray;
  };
  function passive() {
    for (const cls of classes) {
      for (const name of ['resolve', 'tryToResolve', 'initialize', 'tryToInitialize', 'getConstructor'])
        cls[name] = () => assert.fail('Permitted metadata performed active operation ' + cls.getInternalName() + '.' + name);
      for (const name of ['verify', 'tryToVerify'])
        cls.verification[name] = () => assert.fail('Permitted metadata verified ' + cls.getInternalName());
    }
  }
  const failure = (name, marker) => ({marker, getClass: () => bootstrap.getLoadedClass('Ljava/lang/' + name + ';')});
  return {bootstrap, object, classes, requests, failures, allocated, define, loader, array, passive, failure};
}
function thread(bootstrap) {
  const owner = Object.create(JVMThread.prototype); owner.bsCl = bootstrap;
  owner.status = ThreadStatus.RUNNABLE; owner.errors = []; owner.returns = []; owner.statuses = [];
  owner.setStatus = function(value) { this.status = value; this.statuses.push(value); };
  owner.currentMethod = () => null;
  owner.throwNewException = function(name) {
    const cls = bootstrap.getLoadedClass(name); assert.ok(cls, 'Parsed bootstrap Throwable ' + name);
    this.throwException({getClass: () => cls});
  };
  owner.handleUncaughtException = () => assert.fail('An error escaped the controlled native frame');
  owner.stack = [{type: StackFrameType.NATIVE, scheduleException(caller, failure) {
    caller.errors.push(failure); return true;
  }}];
  owner.asyncReturn = value => {
    assert.notEqual(typeof value, 'boolean', 'JVM asyncReturn requires an int, not a JS boolean');
    assert.equal(owner.stack.length, 1, 'All actual metadata exception boundaries must settle');
    owner.returns.push(value); owner.status = ThreadStatus.RUNNABLE;
  };
  return owner;
}
function drain(owner) {
  for (let count = 0; count < 100; count++) {
    const top = owner.stack.at(-1);
    if (owner.status !== ThreadStatus.RUNNABLE || !top || top.type !== StackFrameType.INTERNAL) return;
    top.run(owner);
  }
  assert.fail('Metadata boundary scheduler exceeded its unit bound');
}
async function invoke(api, cls, w, owner = thread(w.bootstrap)) {
  const before = owner.returns.length, errors = owner.errors.length;
  const returned = api(owner, {$cls: cls});
  for (let count = 0; count < 100 && owner.returns.length === before && owner.errors.length === errors; count++) {
    await new Promise(resolve => setImmediate(resolve)); drain(owner);
  }
  assert.ok(owner.returns.length > before || owner.errors.length > errors, 'Async native invocation must settle');
  assert.ok(returned === undefined || returned === null, 'A sealed native completes through asyncReturn');
  return {value: owner.returns[before], error: owner.errors[errors], owner};
}

test('unsealed reference, primitive, void and array mirrors return null/false without loading or allocation', () => {
  const w = world(), ordinary = w.define({name: 'p/Ordinary'}), owner = thread(w.bootstrap);
  const controls = [ordinary, new PrimitiveClassData('I', w.bootstrap), new PrimitiveClassData('V', w.bootstrap), w.array(ordinary)];
  w.passive();
  for (const cls of controls) { assert.equal(getPermitted(owner, {$cls: cls}), null); assert.equal(isSealed(owner, {$cls: cls}), false); }
  assert.deepEqual(w.requests, []); assert.deepEqual(w.allocated, []); assert.deepEqual(owner.statuses, []);
});

test('present empty permitted metadata returns fresh empty arrays and public isSealed completes true', async () => {
  const w = world(), cls = w.define({name: 'p/Empty', permits: []}); w.passive();
  const first = await invoke(getPermitted, cls, w), second = await invoke(getPermitted, cls, w);
  assert.deepEqual(first.value.array, []); assert.deepEqual(second.value.array, []);
  assert.notEqual(first.value, second.value); assert.equal((await invoke(isSealed, cls, w)).value, 1);
  assert.deepEqual(w.requests, []); assert.equal(w.allocated.length, 3);
});

test('original permitted ClassReference objects are exposed by a defensive reference-array copy', () => {
  const w = world(), cls = w.define({name: 'p/Owner', permits: ['p/A', 'p/B', 'p/A']});
  const raw = cls.getAttribute('PermittedSubclasses').classes, refs = cls.getPermittedSubclassReferences();
  assert.notEqual(refs, raw); assert.equal(refs[0], raw[0]); assert.equal(refs[2], raw[0]);
  refs.pop(); refs[0] = null; assert.equal(cls.getPermittedSubclassReferences().length, 3);
  assert.equal(cls.getPermittedSubclassReferences()[0], raw[0]);
});

test('native resolves the actual CP metadata without verifying or initializing a malformed direct child', async () => {
  const w = world(), loader = w.loader(), root = w.define({name: 'p/Root', permits: ['p/Leaf']}, loader);
  const leaf = w.define({name: 'p/Leaf', parent: 'p/Root', flags: 0x31, invalidBody: true}, loader);
  assert.equal(leaf.tryToResolveHierarchy(), true); assert.equal(leaf.isVerified(), false); w.passive();
  const result = await invoke(getPermitted, root, w);
  assert.deepEqual(result.value.array.map(mirror => mirror.$cls), [leaf]); assert.equal(result.error, undefined);
  assert.equal(root.getAttribute('PermittedSubclasses').classes[0].cls, leaf, 'Retain the original CP success identity');
  assert.equal(leaf.isVerified(), false); assert.equal(leaf.isResolved(), false);
  assert.equal(leaf.getDeclaredMethod('bad()I').declaredCode.getCode()[0], 0xb1);
  assert.equal((await invoke(isSealed, root, w)).value, 1);
});

test('class enumeration retains duplicate direct identities but filters unrelated, indirect and array entries', async () => {
  const w = world(), loader = w.loader();
  const root = w.define({name: 'p/Root', permits: ['p/Leaf', 'p/Unrelated', 'p/Mid', 'p/Indirect', '[Lp/Leaf;', 'p/Leaf']}, loader);
  const leaf = w.define({name: 'p/Leaf', parent: 'p/Root', flags: 0x31}, loader);
  const unrelated = w.define({name: 'p/Unrelated'}, loader), mid = w.define({name: 'p/Mid', parent: 'p/Root'}, loader);
  const indirect = w.define({name: 'p/Indirect', parent: 'p/Mid'}, loader);
  for (const cls of [leaf, unrelated, mid, indirect]) assert.equal(cls.tryToResolveHierarchy(), true);
  w.array(leaf); w.passive();
  const first = await invoke(getPermitted, root, w), second = await invoke(getPermitted, root, w);
  assert.deepEqual(first.value.array.map(mirror => mirror.$cls), [leaf, mid, leaf]);
  assert.notEqual(first.value, second.value); first.value.array.fill(null);
  assert.deepEqual(second.value.array.map(mirror => mirror.$cls), [leaf, mid, leaf]);
});

test('interface enumeration accepts actual direct subinterfaces/implementors, not assignable indirect types', async () => {
  const w = world(), loader = w.loader();
  const root = w.define({name: 'p/Role', flags: 0x601, permits: ['p/SubRole', 'p/Impl', 'p/Indirect', 'p/Unrelated']}, loader);
  const sub = w.define({name: 'p/SubRole', flags: 0x601, interfaces: ['p/Role']}, loader);
  const impl = w.define({name: 'p/Impl', interfaces: ['p/Role']}, loader);
  const indirect = w.define({name: 'p/Indirect', parent: 'p/Impl'}, loader), unrelated = w.define({name: 'p/Unrelated'}, loader);
  for (const cls of [sub, impl, indirect, unrelated]) assert.equal(cls.tryToResolveHierarchy(), true);
  w.passive(); const result = await invoke(getPermitted, root, w);
  assert.deepEqual(result.value.array.map(mirror => mirror.$cls), [sub, impl]);
});

function failingChildWorld() {
  const w = world(), loader = w.loader();
  const root = w.define({name: 'p/Root', permits: ['p/Child', 'p/Good']}, loader);
  const child = w.define({name: 'p/Child', parent: 'p/Root'}, loader, false);
  const good = w.define({name: 'p/Good', parent: 'p/Root'}, loader);
  assert.equal(child.tryToResolveHierarchy(), true); assert.equal(good.tryToResolveHierarchy(), true);
  return {...w, root, child, good};
}

test('ordinary LinkageError, AssertionError and RuntimeException skip only the failed entry and preserve later members', async () => {
  for (const name of ['LinkageError', 'AssertionError', 'RuntimeException']) {
    const w = failingChildWorld(), marker = w.failure(name, name); w.failures.set('Lp/Child;', marker); w.passive();
    const result = await invoke(getPermitted, w.root, w);
    assert.deepEqual(result.value.array.map(mirror => mirror.$cls), [w.good]);
    assert.equal(result.error, undefined); assert.deepEqual(result.owner.errors, []);
    assert.equal(result.owner.stack.length, 1); assert.ok(result.owner.statuses.includes(ThreadStatus.ASYNC_WAITING));
  }
});

test('missing permitted class is suppressed while a real later child remains visible', async () => {
  const w = world(), loader = w.loader(), root = w.define({name: 'p/Root', permits: ['p/Missing', 'p/Good']}, loader);
  const good = w.define({name: 'p/Good', parent: 'p/Root'}, loader); assert.equal(good.tryToResolveHierarchy(), true); w.passive();
  const result = await invoke(getPermitted, root, w);
  assert.deepEqual(result.value.array.map(mirror => mirror.$cls), [good]); assert.equal(result.error, undefined);
});

test('ordinary failure suppression retains the same CP LinkageError instead of silently reopening failed resolution', async () => {
  const w = failingChildWorld(); w.failures.set('Lp/Child;', w.failure('LinkageError', 'original')); w.passive();
  assert.deepEqual((await invoke(getPermitted, w.root, w)).value.array.map(mirror => mirror.$cls), [w.good]);
  w.failures.delete('Lp/Child;');
  assert.deepEqual((await invoke(getPermitted, w.root, w)).value.array.map(mirror => mirror.$cls), [w.good]);
  assert.equal(w.requests.filter(request => request.name === 'Lp/Child;').length, 1,
    'The controlled CP LinkageError cache remains authoritative');
});

test('a non-Linkage ordinary failure may retry through the same original CP reference', async () => {
  const w = failingChildWorld(); w.failures.set('Lp/Child;', w.failure('RuntimeException', 'original')); w.passive();
  assert.deepEqual((await invoke(getPermitted, w.root, w)).value.array.map(mirror => mirror.$cls), [w.good]);
  w.failures.delete('Lp/Child;');
  assert.deepEqual((await invoke(getPermitted, w.root, w)).value.array.map(mirror => mirror.$cls), [w.child, w.good]);
});

for (const [name, api] of [['getPermittedSubclasses', getPermitted], ['isSealed', isSealed]]) {
  test(name + ' propagates the exact bootstrap VME and permits a successful metadata retry', async () => {
    const w = failingChildWorld(), marker = w.failure('OutOfMemoryError', 'same Java object');
    w.failures.set('Lp/Child;', marker); w.passive();
    const first = await invoke(api, w.root, w);
    assert.equal(first.error, marker); assert.equal(first.value, undefined); assert.equal(first.owner.returns.length, 0);
    assert.equal(first.owner.stack.length, 1, 'No metadata failure boundary remains');
    w.failures.delete('Lp/Child;'); const second = await invoke(api, w.root, w, first.owner);
    assert.equal(second.error, undefined);
    if (api === isSealed) assert.equal(second.value, 1);
    else assert.deepEqual(second.value.array.map(mirror => mirror.$cls), [w.child, w.good]);
    assert.equal(first.owner.errors.length, 1, 'The original VME is delivered only once');
  });
}

test('VME taxonomy checks actual bootstrap identity, not a foreign same-named Error class', async () => {
  const w = failingChildWorld(), foreign = w.loader();
  const forged = w.define({name: 'java/lang/VirtualMachineError', parent: 'java/lang/Error'}, foreign, false);
  assert.equal(forged.tryToResolveHierarchy(), true);
  assert.equal(forged.isSubclass(w.bootstrap.getLoadedClass('Ljava/lang/VirtualMachineError;')), false);
  w.failures.set('Lp/Child;', {getClass: () => forged}); w.passive();
  const result = await invoke(getPermitted, w.root, w);
  assert.deepEqual(result.value.array.map(mirror => mirror.$cls), [w.good]); assert.equal(result.error, undefined);
});

test('repeated cached permitted CP entries complete without recursive callback-stack growth', async () => {
  const w = world(), loader = w.loader(), copies = 4096;
  const root = w.define({name: 'p/Root', permits: Array(copies).fill('p/Leaf')}, loader);
  const leaf = w.define({name: 'p/Leaf', parent: 'p/Root'}, loader);
  assert.equal(leaf.tryToResolveHierarchy(), true); w.passive();
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await invoke(getPermitted, root, w);
    assert.equal(result.error, undefined); assert.equal(result.value.array.length, copies);
    assert.ok(result.value.array.every(mirror => mirror.$cls === leaf));
    assert.equal(result.owner.stack.length, 1);
  }
});
