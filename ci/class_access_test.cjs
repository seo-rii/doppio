'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const ts = require('typescript');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const sourceModules = new Set(['ClassAccess', 'ClassData', 'ClassLoader', 'ConstantPool', 'SymbolicResolution',
  'threading', 'methods', 'util', 'ClassVerification', 'ClassPreparation', 'LoadingConstraints',
  'BytecodeVerifier', 'BytecodeTypeVerifier', 'VerificationRelations', 'ReflectionAdapters',
  'GeneratedAdapters', 'LambdaAdapters']);
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  const filename = path.join(runtime, 'src', name + '.js'), loaded = new Module(filename, module);
  cache.set(name, loaded);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = id => id.startsWith('./') && sourceModules.has(id.slice(2)) ? load(id.slice(2)) : original(id);
  loaded._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', name + '.ts'), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS, ignoreDeprecations: '6.0'}
  }).outputText, filename);
  return loaded.exports;
}
const access = load('ClassAccess');
const {ReferenceClassData, ArrayClassData, PrimitiveClassData} = load('ClassData');
const {ClassLoader} = load('ClassLoader');
const {ClassReference} = load('ConstantPool');
const {JVMThread} = load('threading');
const {Flags} = load('util');
const {ThreadStatus, StackFrameType} = require(path.join(runtime, 'src/enums'));
const u2 = value => { const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes; };
const u4 = value => { const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes; };

// Controlled, parsed class files isolate access state and real guest exception
// boundaries. They are not javac output, native parity, or browser evidence.
function classBytes({name, parent = 'java/lang/Object', flags = 0x21, nestHost = null,
    nestMembers = null, invalidBody = false}) {
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
      const nameIndex = utf(text);
      entries.push(Buffer.concat([Buffer.from([7]), u2(nameIndex)]));
      indices.set(key, entries.length);
    }
    return indices.get(key);
  }
  const self = cls(name), superclass = parent === null ? 0 : cls(parent), attributes = [], methods = [];
  if (nestHost !== null) {
    const attrName = utf('NestHost'), host = cls(nestHost);
    attributes.push(Buffer.concat([u2(attrName), u4(2), u2(host)]));
  }
  if (nestMembers !== null) {
    const attrName = utf('NestMembers'), members = nestMembers.map(cls);
    attributes.push(Buffer.concat([u2(attrName), u4(2 + members.length * 2), u2(members.length), ...members.map(u2)]));
  }
  if (invalidBody) {
    const nameIndex = utf('bad'), descriptor = utf('()I'), codeName = utf('Code');
    const code = Buffer.concat([u2(0), u2(0), u4(1), Buffer.from([0xb1]), u2(0), u2(0)]);
    methods.push(Buffer.concat([u2(9), u2(nameIndex), u2(descriptor), u2(1), u2(codeName), u4(code.length), code]));
  }
  return Buffer.concat([Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0, 0]), u2(65), u2(entries.length + 1), ...entries,
    u2(flags), u2(self), u2(superclass), u2(0), u2(0), u2(methods.length), ...methods,
    u2(attributes.length), ...attributes]);
}

function throwable(name, bootstrap) {
  const cls = bootstrap.getLoadedClass(name);
  assert.ok(cls, 'The controlled Throwable requires a parsed bootstrap class: ' + name);
  return {getClass: () => cls};
}
function thread(bootstrap = null) {
  const current = Object.create(JVMThread.prototype);
  current.bsCl = bootstrap;
  current.status = ThreadStatus.RUNNABLE;
  current.errors = [];
  current.setStatus = function(status) { this.status = status; };
  current.currentMethod = () => null;
  current.throwNewException = function(name) { this.throwException(throwable(name, this.bsCl)); };
  current.handleUncaughtException = () => assert.fail('An access error escaped its controlled native frame');
  current.stack = [{type: StackFrameType.NATIVE, scheduleException(owner, failure) {
    owner.errors.push(failure); return true;
  }}];
  return current;
}
function drain(...owners) {
  for (let count = 0; count < 100; count++) {
    let progressed = false;
    for (const owner of owners) {
      const top = owner.stack.at(-1);
      if (owner.status === ThreadStatus.RUNNABLE && top && top.type === StackFrameType.INTERNAL) {
        top.run(owner); progressed = true;
      }
    }
    if (!progressed) return;
  }
  assert.fail('Access metadata did not settle');
}
const tick = () => new Promise(resolve => setImmediate(resolve));
async function until(predicate, ...owners) {
  for (let count = 0; count < 100 && !predicate(); count++) { await tick(); drain(...owners); }
  assert.ok(predicate(), 'Access metadata completion was not delivered');
}
function world() {
  const classes = [], requests = [], bootstrap = new ClassLoader(null);
  bootstrap.bootstrap = bootstrap;
  bootstrap.getLoaderObject = () => null;
  function instrument(loader) {
    const original = loader.loadClass;
    loader.loadClass = function(owner, name, callback, explicit, ancestors) {
      if (owner !== null && owner.bsCl === null) owner.bsCl = loader.bootstrap;
      requests.push({loader, name, explicit});
      return original.call(this, owner, name, callback, explicit, ancestors);
    };
    loader._loadClass = (owner, name, callback) => {
      owner.throwNewException('Ljava/lang/NoClassDefFoundError;', name);
      callback(null);
    };
    return loader;
  }
  instrument(bootstrap);
  function define(spec, loader = bootstrap, publish = true) {
    const value = new ReferenceClassData(classBytes(spec), null, loader);
    if (publish) loader.addClass(value.getInternalName(), value);
    classes.push(value);
    return value;
  }
  const object = define({name: 'java/lang/Object', parent: null});
  assert.equal(object.tryToResolveHierarchy(), true);
  for (const [name, parent] of [
    ['Throwable', 'Object'], ['Error', 'Throwable'], ['LinkageError', 'Error'],
    ['IncompatibleClassChangeError', 'LinkageError'], ['NoClassDefFoundError', 'LinkageError'],
    ['IllegalAccessError', 'IncompatibleClassChangeError']
  ]) {
    assert.equal(define({name: 'java/lang/' + name, parent: 'java/lang/' + parent}).tryToResolveHierarchy(), true);
  }
  function loader() {
    const value = new ClassLoader(bootstrap);
    value.getLoaderObject = () => value;
    value.addClass(object.getInternalName(), object);
    return instrument(value);
  }
  function array(component) {
    const value = new ArrayClassData(component.getInternalName(), component.getLoader());
    value.setResolved(object, component);
    return value;
  }
  function passive() {
    for (const cls of classes) {
      for (const name of ['resolve', 'tryToResolve', 'initialize', 'tryToInitialize', 'getConstructor']) {
        cls[name] = () => assert.fail('Access performed active operation ' + cls.getInternalName() + '.' + name);
      }
      for (const name of ['verify', 'tryToVerify']) {
        cls.verification[name] = () => assert.fail('Access verified ' + cls.getInternalName());
      }
      for (const name of ['prepare', 'tryToPrepare']) {
        cls.preparation[name] = () => assert.fail('Access prepared ' + cls.getInternalName());
      }
    }
  }
  return {bootstrap, object, classes, requests, define, loader, array, passive};
}
function virtualMachineFailure(w) {
  const base = w.define({name: 'java/lang/VirtualMachineError', parent: 'java/lang/Error'});
  const cls = w.define({name: 'java/lang/OutOfMemoryError', parent: 'java/lang/VirtualMachineError'});
  assert.equal(cls.tryToResolveHierarchy(), true);
  assert.equal(cls.isSubclass(base), true);
  return {getClass: () => cls};
}
async function host(cls, owner = thread(cls.getLoader().bootstrap)) {
  const values = [];
  access.resolveNestHost(owner, cls, value => values.push(value));
  await until(() => values.length > 0, owner);
  assert.equal(values.length, 1);
  assert.deepEqual(owner.errors, []);
  assert.equal(owner.stack.length, 1, 'Nest resolution leaves no exception boundary behind');
  return values[0];
}
async function member(caller, declaring, rawFlags, symbolicOwner = declaring, owner = thread(caller.getLoader().bootstrap)) {
  const values = [];
  access.resolveMemberAccess(owner, caller, declaring, new Flags(rawFlags), symbolicOwner, value => values.push(value));
  await until(() => values.length > 0, owner);
  assert.equal(values.length, 1);
  assert.deepEqual(owner.errors, []);
  return values[0];
}

test('runtime packages use defining loader objects, not package or loader-object spellings', () => {
  const w = world(), a = w.loader(), b = w.loader(), mirror = {};
  a.getLoaderObject = b.getLoaderObject = () => mirror;
  const left = w.define({name: 'p/Left'}, a), sibling = w.define({name: 'p/Sibling'}, a);
  const lookalike = w.define({name: 'p/Right'}, b), other = w.define({name: 'q/Other'}, a);
  w.passive();
  assert.equal(access.sameRuntimePackage(left, sibling), true);
  assert.equal(access.sameRuntimePackage(left, lookalike), false);
  assert.equal(access.sameRuntimePackage(left, other), false);
  assert.deepEqual(w.requests, []);
});

test('class access checks every array rank down to the actual reference leaf without loading it', () => {
  const w = world(), a = w.loader(), b = w.loader();
  const caller = w.define({name: 'p/Caller'}, a), peer = w.define({name: 'q/Peer'}, a);
  const hidden = w.define({name: 'p/Hidden', flags: 0x20}, a);
  const foreignHidden = w.define({name: 'p/Hidden', flags: 0x20}, b);
  const exported = w.define({name: 'q/Public'}, b), integer = new PrimitiveClassData('I', w.bootstrap);
  w.passive();
  assert.equal(access.canAccessClass(caller, hidden), true);
  assert.equal(access.canAccessClass(caller, foreignHidden), false);
  assert.equal(access.canAccessClass(peer, hidden), false);
  assert.equal(access.canAccessClass(caller, w.array(w.array(foreignHidden))), false);
  assert.equal(access.canAccessClass(caller, w.array(w.array(hidden))), true);
  assert.equal(access.canAccessClass(peer, w.array(w.array(exported))), true);
  assert.equal(access.canAccessClass(peer, w.array(w.array(integer))), true);
  assert.equal(access.canAccessClass(peer, integer), true);
  assert.equal(access.canAccessClass(peer, new PrimitiveClassData('V', w.bootstrap)), true);
  assert.deepEqual(w.requests, []);
});

test('an array without component metadata never grants access from its public mirror flags', () => {
  const w = world(), caller = w.define({name: 'p/Caller'});
  const unresolved = new ArrayClassData('Lp/Missing;', w.bootstrap);
  w.passive();
  assert.equal(access.canAccessClass(caller, unresolved), false);
  assert.deepEqual(w.requests, []);
});

test('singleton nests and private self access are exact-identity shortcuts with no host lookup', async () => {
  const w = world(), a = w.loader(), b = w.loader();
  const self = w.define({name: 'p/Same'}, a), lookalike = w.define({name: 'p/Same'}, b);
  const malformed = w.define({name: 'p/Self', nestHost: 'missing/Host'}, a);
  w.passive();
  assert.equal(access.getKnownNestHost(self), self);
  assert.equal(access.isKnownNestmate(self, self), true);
  assert.equal(access.isKnownNestmate(self, lookalike), false);
  assert.equal(self.isNestmateOf(lookalike), false);
  assert.equal(await member(malformed, malformed, 2), true);
  assert.equal(access.getKnownNestHost(malformed), null);
  assert.deepEqual(w.requests, []);
});

test('reciprocal NestHost/NestMembers metadata admits actual siblings without verification or initialization', async () => {
  const w = world(), loader = w.loader();
  const leader = w.define({name: 'p/Host', nestMembers: ['p/Host$A', 'p/Host$B'], invalidBody: true}, loader);
  const a = w.define({name: 'p/Host$A', nestHost: 'p/Host'}, loader);
  const b = w.define({name: 'p/Host$B', nestHost: 'p/Host'}, loader);
  w.passive();
  assert.equal(access.getKnownNestHost(a), null);
  assert.equal(a.isNestmateOf(b), false, 'An unresolved spelling is not proof');
  assert.equal(await member(a, b, 2), true);
  assert.equal(access.getKnownNestHost(a), leader);
  assert.equal(access.getKnownNestHost(b), leader);
  assert.equal(a.isNestmateOf(b), true);
  assert.ok(w.classes.every(cls => !cls.isVerified() && !cls.isInitialized(null)));
  assert.ok(w.requests.every(request => request.explicit === false));
});

for (const kind of ['no-members', 'unlisted-member', 'other-package', 'other-defining-loader']) {
  test('invalid nest host falls back to self: ' + kind, async () => {
    const w = world(), loader = w.loader(), hostLoader = kind === 'other-defining-loader' ? w.loader() : loader;
    const hostName = kind === 'other-package' ? 'q/Host' : 'p/Host';
    const leader = w.define({name: hostName,
      nestMembers: kind === 'no-members' ? null : kind === 'unlisted-member' ? ['p/Other'] : ['p/Member']}, hostLoader);
    if (loader !== hostLoader) loader.addClass(leader.getInternalName(), leader);
    const value = w.define({name: 'p/Member', nestHost: hostName}, loader);
    w.passive();
    assert.equal(await host(value), value);
    assert.equal(access.getKnownNestHost(value), value);
    assert.equal(value.isNestmateOf(leader), false);
    assert.equal(await member(value, leader, 2), false);
  });
}

test('separate valid nests with identical binary names are not nestmates', async () => {
  const w = world(), aLoader = w.loader(), bLoader = w.loader();
  const aHost = w.define({name: 'p/Host', nestMembers: ['p/Member']}, aLoader);
  const bHost = w.define({name: 'p/Host', nestMembers: ['p/Member']}, bLoader);
  const a = w.define({name: 'p/Member', nestHost: 'p/Host'}, aLoader);
  const b = w.define({name: 'p/Member', nestHost: 'p/Host'}, bLoader);
  w.passive();
  assert.equal(await host(a), aHost);
  assert.equal(await host(b), bHost);
  assert.equal(a.isNestmateOf(b), false);
  assert.equal(await member(a, b, 2), false);
});

test('a missing host is swallowed and self fallback remains cached after later publication', async () => {
  const w = world(), loader = w.loader(), value = w.define({name: 'p/Member', nestHost: 'p/LateHost'}, loader);
  w.passive();
  assert.equal(await host(value), value);
  const count = w.requests.length;
  w.define({name: 'p/LateHost', nestMembers: ['p/Member']}, loader);
  assert.equal(await host(value), value);
  assert.equal(w.requests.length, count);
  assert.deepEqual(Object.keys(loader.loadClassLocks.locks), []);
});

test('a swallowed nest lookup error still belongs to the same ordinary Class CP reference', async () => {
  const w = world(), loader = w.loader(), value = w.define({name: 'p/Member', nestHost: 'p/Missing'}, loader);
  const original = throwable('Ljava/lang/NoClassDefFoundError;', w.bootstrap);
  loader._loadClass = (owner, name, callback) => { owner.throwException(original); callback(null); };
  w.passive();
  assert.equal(await host(value), value);
  const owner = thread(), results = [], count = w.requests.length;
  value.getNestHostReference().resolveMetadata(owner, loader, value, status => results.push(status), false);
  await until(() => results.length > 0, owner);
  assert.deepEqual(results, [false]);
  assert.deepEqual(owner.errors, [original]);
  assert.equal(w.requests.length, count, 'Ordinary resolution must not retry the failed host CP entry');
});

test('Java loader exception frames are consumed only by the nest-host boundary', async () => {
  const w = world(), loader = w.loader(), value = w.define({name: 'p/Member', nestHost: 'p/Missing'}, loader);
  const failure = throwable('Ljava/lang/LinkageError;', w.bootstrap);
  loader._loadClass = (owner, name, callback) => {
    owner.stack.push({type: StackFrameType.NATIVE, scheduleException: () => false});
    owner.throwException(failure);
    callback(null);
  };
  w.passive();
  assert.equal(await host(value), value);
  assert.deepEqual(Object.keys(loader.loadClassLocks.locks), []);
});

test('private access determines the referring host before the declaring host', async () => {
  const w = world(), loader = w.loader();
  const caller = w.define({name: 'p/Caller', nestHost: 'p/CallerHost'}, loader);
  const declaring = w.define({name: 'p/Declaring', nestHost: 'p/DeclaringHost'}, loader);
  w.passive();
  assert.equal(await member(caller, declaring, 2), false);
  assert.deepEqual(w.requests.map(request => request.name), ['Lp/CallerHost;', 'Lp/DeclaringHost;']);
});

for (const outcome of ['success', 'failure']) {
  test('pending nest ' + outcome + ' completes same-thread and other-thread waiters exactly once', async () => {
    const w = world(), loader = w.loader(), first = thread(), second = thread(), results = [];
    const value = w.define({name: 'p/Member', nestHost: 'p/Host'}, loader);
    const leader = w.define({name: 'p/Host', nestMembers: ['p/Member']}, loader, false);
    let finish;
    loader._loadClass = (owner, name, callback) => { finish = () => {
      if (outcome === 'success') { loader.addClass(name, leader); callback(leader); }
      else { owner.throwException(throwable('Ljava/lang/NoClassDefFoundError;', w.bootstrap)); callback(null); }
    }; };
    w.passive();
    access.resolveNestHost(first, value, result => results.push(['first', result]));
    access.resolveNestHost(first, value, result => results.push(['same-thread', result]));
    access.resolveNestHost(second, value, result => results.push(['other-thread', result]));
    assert.deepEqual(results, []);
    assert.equal(second.status, ThreadStatus.ASYNC_WAITING);
    await until(() => finish !== undefined, first, second);
    finish();
    await until(() => results.length === 3, first, second);
    assert.deepEqual(results, ['first', 'same-thread', 'other-thread'].map(name => [name, outcome === 'success' ? leader : value]));
    assert.deepEqual(first.errors, []);
    assert.deepEqual(second.errors, []);
    assert.equal(first.stack.length, 1);
    assert.equal(second.stack.length, 1);
    assert.equal(w.requests.length, 1);
    assert.deepEqual(Object.keys(loader.loadClassLocks.locks), []);
    assert.equal(await host(value), outcome === 'success' ? leader : value);
    assert.equal(w.requests.length, 1);
  });
}

test('package and protected access do not confuse same-spelled packages from different loaders', async () => {
  const w = world(), a = w.loader(), b = w.loader();
  const declaring = w.define({name: 'p/Owner'}, a), peer = w.define({name: 'p/Peer'}, a);
  const foreign = w.define({name: 'p/Foreign'}, b);
  w.passive();
  assert.equal(await member(peer, declaring, 0), true);
  assert.equal(await member(foreign, declaring, 0), false);
  assert.equal(await member(peer, declaring, 4), true);
  assert.equal(await member(foreign, declaring, 4), false);
  assert.equal(await member(foreign, declaring, 1), true);
  assert.deepEqual(w.requests, []);
});

test('protected instance access also checks the symbolic owner ancestry, unlike static access', async () => {
  const w = world(), loader = w.loader();
  const declaring = w.define({name: 'p/Base'}, loader);
  const caller = w.define({name: 'q/Child', parent: 'p/Base'}, loader);
  const descendant = w.define({name: 'r/Grandchild', parent: 'q/Child'}, loader);
  const sibling = w.define({name: 'r/Sibling', parent: 'p/Base'}, loader);
  for (const cls of [declaring, caller, descendant, sibling]) assert.equal(cls.tryToResolveHierarchy(), true);
  w.passive();
  assert.equal(await member(caller, declaring, 4, declaring), true);
  assert.equal(await member(caller, declaring, 4, caller), true);
  assert.equal(await member(caller, declaring, 4, descendant), true);
  assert.equal(await member(caller, declaring, 4, sibling), false);
  assert.equal(await member(caller, declaring, 12, sibling), true);
  assert.deepEqual(w.requests, []);
});

test('ordinary access grants no authority to Lambda or MagicAccessor name lookalikes', async () => {
  const w = world(), loader = w.loader();
  const declaring = w.define({name: 'p/Owner'}, loader);
  const lambda = w.define({name: 'p/Owner$$Lambda$Forged'}, loader);
  const magic = w.define({name: 'sun/reflect/MagicAccessorImpl'}, loader);
  w.passive();
  assert.equal(await member(lambda, declaring, 2), false);
  assert.equal(await member(magic, declaring, 2), false);
  assert.deepEqual(w.requests, []);
});

test('host class access denial is swallowed by nest determination but remains sticky in its CP entry', async () => {
  const w = world(), loader = w.loader();
  w.define({name: 'q/HiddenHost', flags: 0x20, nestMembers: ['p/Member']}, loader);
  const value = w.define({name: 'p/Member', nestHost: 'q/HiddenHost'}, loader);
  w.passive();
  assert.equal(await host(value), value);
  const owner = thread(), results = [], count = w.requests.length;
  value.getNestHostReference().resolveMetadata(owner, loader, value, status => results.push(status), false);
  await until(() => results.length > 0, owner);
  assert.deepEqual(results, [false]);
  assert.equal(owner.errors.length, 1);
  assert.equal(owner.errors[0].getClass().getInternalName(), 'Ljava/lang/IllegalAccessError;');
  assert.equal(w.requests.length, count);
});

test('bootstrap nest resolution without a Java thread still uses only host metadata', async () => {
  const w = world();
  const leader = w.define({name: 'p/Host', flags: 0x20, nestMembers: ['p/Member'], invalidBody: true});
  const value = w.define({name: 'p/Member', nestHost: 'p/Host'}), results = [];
  w.passive();
  access.resolveNestHost(null, value, resolved => results.push(resolved));
  await until(() => results.length > 0);
  assert.deepEqual(results, [leader]);
  assert.equal(access.getKnownNestHost(value), leader);
});

test('class-reference array admission resolves only array metadata before checking its reference leaf', async () => {
  for (const publicLeaf of [true, false]) {
    const w = world(), loader = w.loader(), caller = w.define({name: 'p/Caller'}, loader);
    const leaf = w.define({name: 'q/Leaf', flags: publicLeaf ? 0x21 : 0x20, invalidBody: true}, loader);
    const reference = new ClassReference('[[Lq/Leaf;'), owner = thread(), results = [];
    reference.setOwner(caller);
    w.passive();
    reference.resolveMetadata(owner, loader, caller, success => results.push(success), false);
    await until(() => results.length > 0, owner);
    assert.deepEqual(results, [publicLeaf]);
    if (publicLeaf) {
      assert.deepEqual(owner.errors, []);
      assert.equal(reference.cls.getComponentClass().getComponentClass(), leaf);
    } else {
      assert.equal(owner.errors.length, 1);
      assert.equal(owner.errors[0].getClass().getInternalName(), 'Ljava/lang/IllegalAccessError;');
    }
    assert.equal(leaf.isVerified(), false);
    assert.equal(leaf.isInitialized(null), false);
  }
});

async function members(cls, owner = thread(cls.getLoader().bootstrap)) {
  const results = [];
  access.resolveNestMembers(owner, cls, value => results.push(value));
  await until(() => results.length > 0, owner);
  assert.equal(results.length, 1);
  assert.deepEqual(owner.errors, []);
  assert.equal(owner.stack.length, 1);
  return results[0];
}

test('nest enumeration starts with the actual host and filters missing, mismatched, and non-reference members', async () => {
  const w = world(), loader = w.loader();
  const leader = w.define({name: 'p/Host', invalidBody: true,
    nestMembers: ['p/A', 'p/Different', 'p/Plain', 'p/Missing', '[Lp/A;']}, loader);
  const a = w.define({name: 'p/A', nestHost: 'p/Host', invalidBody: true}, loader);
  w.define({name: 'p/OtherHost', nestMembers: ['p/Different']}, loader);
  w.define({name: 'p/Different', nestHost: 'p/OtherHost'}, loader);
  w.define({name: 'p/Plain'}, loader);
  w.define({name: 'p/Unlisted', nestHost: 'p/Host'}, loader);
  w.passive();
  assert.deepEqual(await members(a), [leader, a]);
  assert.equal(w.requests.some(request => request.name === 'Lp/Unlisted;'), false);
  assert.ok(w.requests.every(request => request.explicit === false));
  assert.ok(w.classes.every(cls => !cls.isVerified() && !cls.isInitialized(null)));
  const count = w.requests.filter(request => request.name === 'Lp/Missing;').length;
  assert.deepEqual(await members(leader), [leader, a]);
  assert.equal(w.requests.filter(request => request.name === 'Lp/Missing;').length, count);
});

test('nest enumeration filters a delegated same-name member from another defining loader', async () => {
  const w = world(), loader = w.loader(), other = w.loader();
  const leader = w.define({name: 'p/Host', nestMembers: ['p/Member']}, loader);
  const otherHost = w.define({name: 'p/Host', nestMembers: ['p/Member']}, other);
  const otherMember = w.define({name: 'p/Member', nestHost: 'p/Host'}, other);
  loader.addClass(otherMember.getInternalName(), otherMember);
  w.passive();
  assert.deepEqual(await members(leader), [leader]);
  assert.equal(access.getKnownNestHost(otherMember), otherHost);
});

test('nest enumeration retains the actual member CP failure for later ordinary use', async () => {
  const w = world(), loader = w.loader(), leader = w.define({name: 'p/Host', nestMembers: ['p/Missing']}, loader);
  const failure = throwable('Ljava/lang/NoClassDefFoundError;', w.bootstrap);
  loader._loadClass = (owner, name, callback) => { owner.throwException(failure); callback(null); };
  w.passive();
  assert.deepEqual(await members(leader), [leader]);
  const owner = thread(), results = [], reference = leader.getNestMemberReferences()[0], count = w.requests.length;
  reference.resolveMetadata(owner, loader, leader, success => results.push(success), false);
  await until(() => results.length > 0, owner);
  assert.deepEqual(results, [false]);
  assert.deepEqual(owner.errors, [failure]);
  assert.equal(w.requests.length, count);
});

test('nest enumeration returns a singleton after the original host falls back to self', async () => {
  const w = world(), loader = w.loader(), value = w.define({name: 'p/Member', nestHost: 'p/Missing'}, loader);
  w.passive();
  assert.deepEqual(await members(value), [value]);
  assert.equal(w.requests.length, 1);
});

test('nest enumeration rethrows the exact bootstrap VirtualMachineError and never returns a partial list', async () => {
  const w = world(), loader = w.loader();
  const vme = w.define({name: 'java/lang/VirtualMachineError'});
  const oom = w.define({name: 'java/lang/OutOfMemoryError', parent: 'java/lang/VirtualMachineError'});
  assert.equal(oom.tryToResolveHierarchy(), true);
  assert.equal(oom.isSubclass(vme), true);
  const leader = w.define({name: 'p/Host', nestMembers: ['p/Late', 'p/Unvisited']}, loader);
  const late = w.define({name: 'p/Late', nestHost: 'p/Host'}, loader, false);
  const failure = {getClass: () => oom};
  loader._loadClass = (owner, name, callback) => { owner.throwException(failure); callback(null); };
  w.passive();
  const owner = thread(w.bootstrap), results = [];
  access.resolveNestMembers(owner, leader, value => results.push(value));
  await until(() => results.length > 0, owner);
  assert.deepEqual(results, [null]);
  assert.deepEqual(owner.errors, [failure]);
  assert.equal(owner.stack.length, 1);
  assert.deepEqual(w.requests.map(request => request.name), ['Lp/Late;']);
  // Unlike a LinkageError, a VME must not poison the Class CP entry. Recovery
  // reruns member resolution; the caller's original VME remains untouched.
  loader._loadClass = (current, name, callback) => {
    if (name === late.getInternalName()) { loader.addClass(name, late); callback(late); }
    else { current.throwNewException('Ljava/lang/NoClassDefFoundError;', name); callback(null); }
  };
  assert.deepEqual(await members(leader), [leader, late]);
  assert.equal(w.requests.filter(request => request.name === 'Lp/Late;').length, 2);
});

test('nest enumeration does not mistake a foreign-loader VirtualMachineError spelling for bootstrap identity', async () => {
  const w = world(), loader = w.loader(), other = w.loader();
  w.define({name: 'java/lang/VirtualMachineError'});
  const lookalike = w.define({name: 'java/lang/VirtualMachineError'}, other);
  const leader = w.define({name: 'p/Host', nestMembers: ['p/Missing']}, loader);
  const failure = {getClass: () => lookalike};
  loader._loadClass = (owner, name, callback) => { owner.throwException(failure); callback(null); };
  w.passive();
  assert.deepEqual(await members(leader), [leader]);
});

test('cached nest enumeration handles repeated CP entries without a recursive callback stack', async () => {
  const w = world(), loader = w.loader(), copies = 4096;
  const leader = w.define({name: 'p/Host', nestMembers: Array(copies).fill('p/Member')}, loader);
  const value = w.define({name: 'p/Member', nestHost: 'p/Host'}, loader);
  w.passive();
  const first = await members(leader), second = await members(leader);
  assert.equal(first.length, copies + 1);
  assert.equal(first[0], leader);
  assert.ok(first.slice(1).every(member => member === value));
  assert.deepEqual(second, first);
  assert.notEqual(second, first, 'Each enumeration result is independently owned');
});

test('a foreign-loader LinkageError spelling is filtered without poisoning a member CP reference', async () => {
  const w = world(), loader = w.loader(), other = w.loader();
  const lookalike = w.define({name: 'java/lang/LinkageError'}, other);
  const leader = w.define({name: 'p/Host', nestMembers: ['p/Late']}, loader);
  const late = w.define({name: 'p/Late', nestHost: 'p/Host'}, loader, false);
  loader._loadClass = (owner, name, callback) => { owner.throwException({getClass: () => lookalike}); callback(null); };
  w.passive();
  assert.deepEqual(await members(leader), [leader]);
  loader._loadClass = (owner, name, callback) => { loader.addClass(name, late); callback(late); };
  assert.deepEqual(await members(leader), [leader, late]);
  assert.equal(w.requests.filter(request => request.name === late.getInternalName()).length, 2);
});

test('a host VirtualMachineError propagates exactly and leaves its determination retryable', async () => {
  const w = world(), loader = w.loader(), failure = virtualMachineFailure(w);
  const value = w.define({name: 'p/Member', nestHost: 'p/Host'}, loader);
  const leader = w.define({name: 'p/Host', nestMembers: ['p/Member']}, loader, false);
  loader._loadClass = (owner, name, callback) => { owner.throwException(failure); callback(null); };
  w.passive();
  const owner = thread(w.bootstrap), results = [];
  access.resolveNestHost(owner, value, result => results.push(result));
  await until(() => results.length > 0, owner);
  assert.deepEqual(results, [null]);
  assert.deepEqual(owner.errors, [failure]);
  assert.equal(owner.stack.length, 1);
  assert.equal(access.getKnownNestHost(value), null, 'A VME is not a SELF determination');
  assert.deepEqual(Object.keys(loader.loadClassLocks.locks), []);
  loader._loadClass = (current, name, callback) => { loader.addClass(name, leader); callback(leader); };
  assert.equal(await host(value), leader);
  assert.equal(w.requests.length, 2);
});

test('a pending host VirtualMachineError reaches every waiting thread once with null completions', async () => {
  const w = world(), loader = w.loader(), failure = virtualMachineFailure(w);
  const value = w.define({name: 'p/Member', nestHost: 'p/Host'}, loader);
  const first = thread(w.bootstrap), second = thread(w.bootstrap), results = [];
  let finish;
  loader._loadClass = (owner, name, callback) => { finish = () => { owner.throwException(failure); callback(null); }; };
  w.passive();
  access.resolveNestHost(first, value, result => results.push(['first', result]));
  access.resolveNestHost(first, value, result => results.push(['same-thread', result]));
  access.resolveNestHost(second, value, result => results.push(['other-thread', result]));
  await until(() => finish !== undefined, first, second);
  assert.equal(second.status, ThreadStatus.ASYNC_WAITING);
  finish();
  await until(() => results.length === 3, first, second);
  assert.deepEqual(results, [['first', null], ['same-thread', null], ['other-thread', null]]);
  assert.deepEqual(first.errors, [failure]);
  assert.deepEqual(second.errors, [failure]);
  assert.equal(first.stack.length, 1);
  assert.equal(second.stack.length, 1);
  assert.equal(access.getKnownNestHost(value), null);
  assert.deepEqual(Object.keys(loader.loadClassLocks.locks), []);
});

test('a foreign-loader VirtualMachineError name cannot prevent normal host SELF fallback', async () => {
  const w = world(), loader = w.loader(), other = w.loader();
  virtualMachineFailure(w);
  const lookalike = w.define({name: 'java/lang/VirtualMachineError'}, other);
  const value = w.define({name: 'p/Member', nestHost: 'p/Host'}, loader);
  loader._loadClass = (owner, name, callback) => { owner.throwException({getClass: () => lookalike}); callback(null); };
  w.passive();
  assert.equal(await host(value), value);
  assert.equal(access.getKnownNestHost(value), value);
  assert.equal(await host(value), value);
  assert.equal(w.requests.length, 1);
});

for (const failing of ['caller', 'declaring']) {
  test('member access preserves a ' + failing + ' host VME instead of reporting access denial', async () => {
    const w = world(), loader = w.loader(), failure = virtualMachineFailure(w);
    const caller = w.define({name: 'p/Caller', nestHost: 'p/CallerHost'}, loader);
    const declaring = w.define({name: 'p/Declaring', nestHost: 'p/DeclaringHost'}, loader);
    if (failing === 'declaring') w.define({name: 'p/CallerHost', nestMembers: ['p/Caller']}, loader);
    loader._loadClass = (owner, name, callback) => { owner.throwException(failure); callback(null); };
    w.passive();
    const owner = thread(w.bootstrap), results = [];
    access.resolveMemberAccess(owner, caller, declaring, new Flags(2), declaring, allowed => results.push(allowed));
    await until(() => results.length > 0, owner);
    assert.deepEqual(results, [null]);
    assert.deepEqual(owner.errors, [failure]);
    assert.equal(owner.stack.length, 1);
    assert.deepEqual(w.requests.map(request => request.name), failing === 'caller' ? ['Lp/CallerHost;'] :
      ['Lp/CallerHost;', 'Lp/DeclaringHost;']);
  });
}

for (const failing of ['initial-host', 'member-host']) {
  test('nest enumeration preserves ' + failing + ' VME without returning a partial result', async () => {
    const w = world(), loader = w.loader(), failure = virtualMachineFailure(w);
    let value;
    if (failing === 'initial-host') value = w.define({name: 'p/Member', nestHost: 'p/Host'}, loader);
    else {
      value = w.define({name: 'p/Host', nestMembers: ['p/Member']}, loader);
      w.define({name: 'p/Member', nestHost: 'p/OtherHost'}, loader);
    }
    loader._loadClass = (owner, name, callback) => { owner.throwException(failure); callback(null); };
    w.passive();
    const owner = thread(w.bootstrap), results = [];
    access.resolveNestMembers(owner, value, result => results.push(result));
    await until(() => results.length > 0, owner);
    assert.deepEqual(results, [null]);
    assert.deepEqual(owner.errors, [failure]);
    assert.equal(owner.stack.length, 1);
  });
}
