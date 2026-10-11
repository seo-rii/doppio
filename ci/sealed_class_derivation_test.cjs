'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const sourceModules = new Set(['ClassData', 'ClassLoader', 'ConstantPool', 'threading', 'methods',
  'ClassVerification', 'ClassPreparation', 'LoadingConstraints', 'BytecodeVerifier', 'BytecodeTypeVerifier',
  'VerificationRelations', 'GeneratedAdapters', 'LambdaAdapters', 'ReflectionAdapters', 'SymbolicResolution',
  'ClassAccess', 'util']);
const cache = new Map();
function load(name) {
  const filename = path.join(runtime, 'src', name + '.js');
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(filename);
  if (cache.has(name)) return cache.get(name).exports;
  const loaded = new Module(filename, module); cache.set(name, loaded);
  loaded.filename = filename; loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = id => id.startsWith('./') && sourceModules.has(id.slice(2)) ? load(id.slice(2)) : original(id);
  loaded._compile(require('typescript').transpileModule(
    fs.readFileSync(path.join(__dirname, '../src', name + '.ts'), 'utf8'), {
      compilerOptions: {target: 1, module: 1, ignoreDeprecations: '6.0'}
    }).outputText, filename);
  return loaded.exports;
}
const {ReferenceClassData} = load('ClassData');
const u2 = value => { const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes; };
const u4 = value => { const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes; };

// Controlled parsed metadata, not javac/native/browser evidence. The genuine
// B7 corpus separately exercises definition/public API error fidelity.
function classBytes({name, superclass = 'java/lang/Object', interfaces = [], flags = 0x21,
    permits = null, major = 65, permittedPayload}) {
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
      const index = utf(text); entries.push(Buffer.concat([Buffer.from([7]), u2(index)]));
      indices.set(key, entries.length);
    }
    return indices.get(key);
  }
  const self = cls(name), parent = superclass === null ? 0 : cls(superclass), parents = interfaces.map(cls), attrs = [];
  if (permits !== null) {
    const attrName = utf('PermittedSubclasses'), values = permits.map(cls);
    const body = permittedPayload || Buffer.concat([u2(values.length), ...values.map(u2)]);
    attrs.push(Buffer.concat([u2(attrName), u4(body.length), body]));
  }
  return Buffer.concat([u4(0xcafebabe), u2(0), u2(major), u2(entries.length + 1), ...entries,
    u2(flags), u2(self), u2(parent), u2(parents.length), ...parents.map(u2),
    u2(0), u2(0), u2(attrs.length), ...attrs]);
}
function world() {
  const classes = [], requests = [];
  function loader(parent = null) {
    const loaded = new Map(), value = {
      loaded, bootstrap: parent === null ? null : parent.bootstrap,
      getLoaderObject: () => parent === null ? null : value,
      getLoadedClass: name => loaded.get(name) || (parent === null ? null : parent.getLoadedClass(name)),
      loadClass(thread, name, callback, explicit) {
        requests.push({loader: value, name, explicit});
        const cls = this.getLoadedClass(name);
        if (cls === null && thread !== null) thread.throwNewException('Ljava/lang/NoClassDefFoundError;', name);
        setImmediate(() => callback(cls));
      }
    };
    if (parent === null) value.bootstrap = value;
    return value;
  }
  const bootstrap = loader();
  function define(spec, owner = bootstrap) {
    const cls = new ReferenceClassData(classBytes(spec), null, owner);
    owner.loaded.set(cls.getInternalName(), cls); classes.push(cls);
    return cls;
  }
  const object = define({name: 'java/lang/Object', superclass: null});
  function passive() {
    for (const cls of classes) {
      for (const method of ['resolve', 'tryToResolve', 'initialize', 'tryToInitialize', 'getConstructor'])
        cls[method] = () => assert.fail('Sealed hierarchy performed active operation ' + method);
      for (const method of ['verify', 'tryToVerify'])
        cls.verification[method] = () => assert.fail('Sealed hierarchy performed verification');
    }
  }
  return {bootstrap, object, classes, requests, loader, define, passive};
}
async function derive(cls) {
  const thread = {errors: [], throwNewException(name, message) { this.errors.push({name, message}); }};
  let calls = 0;
  const result = await new Promise(resolve => cls.resolveHierarchy(thread, value => { calls++; resolve(value); }, false));
  assert.equal(calls, 1); return {result, errors: thread.errors};
}
async function admission(w, child, accepted) {
  w.passive();
  assert.equal(child.tryToResolveHierarchy(), accepted, 'Synchronous sealed hierarchy policy');
  const result = await derive(child);
  assert.equal(result.result, accepted ? child : null, 'Asynchronous sealed hierarchy policy');
  assert.deepEqual(result.errors.map(error => error.name), accepted ? [] : ['Ljava/lang/IncompatibleClassChangeError;']);
  assert.equal(child.isHierarchyResolved(), accepted);
  assert.equal(child.isVerified(), false); assert.equal(child.isResolved(), false);
  assert.equal(child.getSuperClassReference().cls, null, 'No CP parent success is published by raw hierarchy loading');
  assert.ok(child.getInterfaceClassReferences().every(ref => ref.cls === null));
}
function childSpec(isInterface, name, flags = 0x31) {
  return {name, flags, superclass: isInterface ? 'java/lang/Object' : 'p/Parent',
    interfaces: isInterface ? ['p/Parent'] : []};
}

test('sealed metadata distinguishes absent attribute from a present zero-entry attribute', () => {
  const w = world(), ordinary = w.define({name: 'p/Ordinary'}), empty = w.define({name: 'p/Empty', permits: []});
  assert.equal(ordinary.isSealed(), false); assert.equal(empty.isSealed(), true);
  assert.deepEqual(ordinary.getPermittedSubclassNames(), []); assert.deepEqual(empty.getPermittedSubclassNames(), []);
  assert.equal(ordinary.isHierarchyResolved(), false); assert.equal(empty.isHierarchyResolved(), false);
});

test('final classes reject both empty and nonempty recognized PermittedSubclasses metadata', () => {
  for (const major of [61, 65, 69]) for (const permits of [[], ['p/Child']])
    assert.throws(() => new ReferenceClassData(classBytes({name: 'p/Final', flags: 0x31, permits, major}), null, world().bootstrap),
      /final.*PermittedSubclasses|PermittedSubclasses.*final/i);
});

test('major-60 future PermittedSubclasses stays opaque even with final flags and malformed inner bytes', () => {
  for (const flags of [0x21, 0x31]) {
    const w = world(), cls = w.define({name: 'p/Old', flags, permits: ['p/Child'], major: 60,
      permittedPayload: Buffer.from([0xff])});
    assert.equal(cls.isSealed(), false); assert.deepEqual(cls.getPermittedSubclassNames(), []);
    assert.equal(cls.getAttribute('PermittedSubclasses'), null); assert.equal(cls.majorVersion, 60);
  }
});

test('permitted names preserve original order and duplicate multiplicity without exposing mutable metadata', () => {
  const w = world(), cls = w.define({name: 'p/Parent', permits: ['p/Second', 'p/First', 'p/Second']});
  const original = ['Lp/Second;', 'Lp/First;', 'Lp/Second;'], first = cls.getPermittedSubclassNames();
  assert.deepEqual(first, original); first[0] = 'Lp/Forged;'; first.push('Lp/Extra;');
  assert.deepEqual(cls.getPermittedSubclassNames(), original);
});

for (const isInterface of [false, true]) {
  const kind = isInterface ? 'superinterface' : 'superclass';
  test('present empty permits rejects every direct child of sealed ' + kind, async () => {
    const w = world(), owner = w.loader(w.bootstrap);
    w.define({name: 'p/Parent', flags: isInterface ? 0x601 : 0x21, permits: []}, owner);
    await admission(w, w.define(childSpec(isInterface, 'p/Child'), owner), false);
  });
  test('sealed ' + kind + ' enforces listed names on both metadata derivation paths', async () => {
    for (const listed of [false, true]) {
      const w = world(), owner = w.loader(w.bootstrap);
      w.define({name: 'p/Parent', flags: isInterface ? 0x601 : 0x21, permits: ['p/Allowed']}, owner);
      await admission(w, w.define(childSpec(isInterface, listed ? 'p/Allowed' : 'p/Other'), owner), listed);
    }
  });
  test('sealed ' + kind + ' admits public cross-package children in the same unnamed module', async () => {
    const w = world(), owner = w.loader(w.bootstrap), parent = w.define({name: 'p/Parent',
      flags: isInterface ? 0x601 : 0x21, permits: ['q/Child']}, owner);
    const child = w.define(childSpec(isInterface, 'q/Child'), owner);
    await admission(w, child, true);
    assert.ok(isInterface ? child.getInterfaces().includes(parent) : child.getSuperClass() === parent);
  });
  test('sealed ' + kind + ' requires non-public children to share the actual runtime package', async () => {
    for (const samePackage of [false, true]) {
      const w = world(), owner = w.loader(w.bootstrap), name = samePackage ? 'p/Child' : 'q/Child';
      w.define({name: 'p/Parent', flags: isInterface ? 0x601 : 0x21, permits: [name]}, owner);
      await admission(w, w.define(childSpec(isInterface, name, 0x30), owner), samePackage);
    }
  });
  test('sealed ' + kind + ' rejects a listed child in another defining loader even with the same package spelling', async () => {
    for (const flags of [0x30, 0x31]) {
      const w = world(), parentOwner = w.loader(w.bootstrap), childOwner = w.loader(parentOwner);
      w.define({name: 'p/Parent', flags: isInterface ? 0x601 : 0x21, permits: ['p/Child']}, parentOwner);
      await admission(w, w.define(childSpec(isInterface, 'p/Child', flags), childOwner), false);
    }
  });
  test('ordinary ' + kind + ' does not acquire sealed module/package restrictions', async () => {
    const w = world(), parentOwner = w.loader(w.bootstrap), childOwner = w.loader(parentOwner);
    w.define({name: 'p/Parent', flags: isInterface ? 0x601 : 0x21}, parentOwner);
    await admission(w, w.define(childSpec(isInterface, 'q/Child', 0x30), childOwner), true);
  });
}

test('sealed admission uses a delegated parent defining identity, not its initiating-loader map', async () => {
  const w = world(), realOwner = w.loader(w.bootstrap), initiating = w.loader(w.bootstrap);
  const parent = w.define({name: 'p/Parent', permits: ['p/Child']}, realOwner);
  initiating.loaded.set(parent.getInternalName(), parent);
  await admission(w, w.define(childSpec(false, 'p/Child'), initiating), false);
  assert.equal(parent.getLoader(), realOwner);
});
