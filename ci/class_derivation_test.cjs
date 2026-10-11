'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const ts = require('typescript');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const sourceModules = new Set(['ClassData', 'ClassLoader', 'ConstantPool', 'threading', 'methods',
  'ClassVerification', 'ClassPreparation', 'LoadingConstraints', 'BytecodeVerifier', 'BytecodeTypeVerifier', 'VerificationRelations',
  'GeneratedAdapters', 'LambdaAdapters', 'ReflectionAdapters']);
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
    compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS}
  }).outputText, filename);
  return loaded.exports;
}
const {ReferenceClassData, ArrayClassData, PrimitiveClassData} = load('ClassData');
const u2 = value => { const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes; };
const u4 = value => { const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes; };

// These controlled class files exercise the actual parser and hierarchy APIs.
// Genuine separately compiled evolution and native taxonomy live in the B4a
// corpus; these units do not claim synthetic fixtures are javac output.
function classBytes({name, superclass = 'java/lang/Object', interfaces = [], flags = 0x21,
    invalidBody = false}) {
  const entries = [], names = new Map();
  function utf(text) {
    const key = 'utf:' + text;
    if (!names.has(key)) {
      const bytes = Buffer.from(text);
      entries.push(Buffer.concat([Buffer.from([1]), u2(bytes.length), bytes]));
      names.set(key, entries.length);
    }
    return names.get(key);
  }
  function cls(text) {
    const key = 'class:' + text;
    if (!names.has(key)) {
      const nameIndex = utf(text);
      entries.push(Buffer.concat([Buffer.from([7]), u2(nameIndex)]));
      names.set(key, entries.length);
    }
    return names.get(key);
  }
  const self = cls(name), parent = superclass === null ? 0 : cls(superclass);
  const parentInterfaces = interfaces.map(cls), methods = [];
  if (invalidBody) {
    const methodName = utf('invalid'), descriptor = utf('()I'), codeName = utf('Code');
    const payload = Buffer.concat([u2(0), u2(0), u4(1), Buffer.from([0xb1]), u2(0), u2(0)]);
    methods.push(Buffer.concat([u2(9), u2(methodName), u2(descriptor), u2(1),
      u2(codeName), u4(payload.length), payload]));
  }
  return Buffer.concat([Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0, 0]), u2(65),
    u2(entries.length + 1), ...entries, u2(flags), u2(self), u2(parent),
    u2(parentInterfaces.length), ...parentInterfaces.map(u2), u2(0),
    u2(methods.length), ...methods, u2(0)]);
}

function world() {
  const classes = [], requests = [];
  function loader(parent = null) {
    const loaded = new Map(), value = {
      loaded, bootstrap: parent === null ? null : parent.bootstrap,
      getLoaderObject: () => parent === null ? null : value,
      getLoadedClass: name => loaded.get(name) || (parent === null ? null : parent.getLoadedClass(name)),
      loadClass(thread, name, callback, explicit, ancestors) {
        requests.push({loader: value, name, explicit, ancestors});
        const cls = value.getLoadedClass(name);
        if (cls === null && thread !== null) thread.throwNewException('Ljava/lang/NoClassDefFoundError;', name);
        callback(cls);
      }
    };
    if (parent === null) value.bootstrap = value;
    return value;
  }
  const bootstrap = loader();
  function define(spec, owner = bootstrap) {
    const cls = new ReferenceClassData(classBytes(spec), null, owner);
    owner.loaded.set(cls.getInternalName(), cls);
    classes.push(cls);
    return cls;
  }
  const object = define({name: 'java/lang/Object', superclass: null});
  return {bootstrap, object, loader, define, classes, requests};
}

function metadataOnly(classes) {
  const saved = [];
  for (const cls of classes) {
    for (const [owner, name] of [[cls.verification, 'tryToVerify'], [cls.verification, 'verify'],
      [cls, 'initialize'], [cls, 'tryToInitialize']]) {
      saved.push([owner, name, owner[name]]);
      owner[name] = () => assert.fail('Hierarchy derivation called ' + cls.getInternalName() + '.' + name);
    }
  }
  return () => { for (const [owner, name, original] of saved) owner[name] = original; };
}

async function derive(cls, explicit = true) {
  const thread = {errors: [], throwNewException(name, message) { this.errors.push({name, message}); }};
  let callbacks = 0;
  const result = await new Promise(resolve => cls.resolveHierarchy(thread, value => {
    callbacks++;
    resolve(value);
  }, explicit));
  assert.equal(callbacks, 1, 'hierarchy completion must be delivered once');
  return {result, errors: thread.errors};
}

async function rejected(cls, expected) {
  assert.equal(cls.tryToResolveHierarchy(), false, 'synchronous hierarchy admission must reject');
  assert.equal(cls.isHierarchyResolved(), false);
  const {result, errors} = await derive(cls);
  assert.equal(result, null);
  assert.deepEqual(errors.map(error => error.name), [expected]);
  assert.equal(cls.isHierarchyResolved(), false, 'failed derivation must not publish hierarchy tables');
  assert.equal(cls.isVerified(), false);
  assert.equal(cls.isInitialized(null), false);
  assert.equal(cls.getSuperClass(), null);
  assert.equal(cls.getInterfaces(), null);
}

test('hierarchy admission does not verify, initialize, or publish resolved constant-pool parents', {timeout: 2000}, async () => {
  for (const asynchronous of [false, true]) {
    const w = world(), owner = w.loader(w.bootstrap);
    const parent = w.define({name: 'sample/Parent', invalidBody: true}, owner);
    const iface = w.define({name: 'sample/Role', flags: 0x601}, owner);
    const child = w.define({name: 'sample/Child', superclass: 'sample/Parent',
      interfaces: ['sample/Role'], invalidBody: true}, owner);
    const restore = metadataOnly(w.classes);
    if (asynchronous) {
      const result = await derive(child, false);
      assert.equal(result.result, child);
      assert.deepEqual(result.errors, []);
      assert.ok(w.requests.every(request => request.explicit === false));
    } else {
      assert.equal(child.tryToResolveHierarchy(), true);
      assert.deepEqual(w.requests, []);
    }
    for (const cls of w.classes) {
      assert.equal(cls.isHierarchyResolved(), true);
      assert.equal(cls.isVerified(), false);
      assert.equal(cls.isResolved(), false);
      assert.equal(cls.isInitialized(null), false);
    }
    assert.equal(child.getSuperClass(), parent);
    assert.deepEqual(child.getInterfaces(), [iface]);
    assert.equal(child.getSuperClassReference().cls, null);
    assert.equal(child.getInterfaceClassReferences()[0].cls, null);
    restore();
    assert.equal(child.tryToResolve(), false, 'separate full linking still rejects invalid bytecode');
    assert.equal(parent.verification.failure.javaClassName, 'Ljava/lang/VerifyError;');
  }
});

test('superclass/interface kind and final-superclass errors reject both hierarchy paths', {timeout: 2000}, async () => {
  for (const kind of ['interface-superclass', 'class-superinterface', 'final-superclass']) {
    const w = world();
    w.define({name: 'sample/Parent', flags: kind === 'interface-superclass' ? 0x601 :
      kind === 'final-superclass' ? 0x31 : 0x21});
    const child = w.define({name: 'sample/Child',
      superclass: kind === 'class-superinterface' ? 'java/lang/Object' : 'sample/Parent',
      interfaces: kind === 'class-superinterface' ? ['sample/Parent'] : []});
    metadataOnly(w.classes);
    await rejected(child, 'Ljava/lang/IncompatibleClassChangeError;');
  }
});

test('a failing superclass is checked before any direct superinterface is loaded', {timeout: 2000}, async () => {
  const w = world();
  w.define({name: 'sample/Final', flags: 0x31});
  const child = w.define({name: 'sample/Child', superclass: 'sample/Final', interfaces: ['missing/Role']});
  await rejected(child, 'Ljava/lang/IncompatibleClassChangeError;');
  assert.equal(w.requests.some(request => request.name === 'Lmissing/Role;'), false);
});

test('a shared superclass and superinterface constant retains its distinct header roles', {timeout: 2000}, async () => {
  const w = world();
  w.define({name: 'sample/Parent'});
  const child = w.define({name: 'sample/Child', superclass: 'sample/Parent', interfaces: ['sample/Parent']});
  assert.equal(child.getSuperClassReference(), child.getInterfaceClassReferences()[0],
    'fixture must use the same constant-pool Class entry in both header positions');
  metadataOnly(w.classes);
  await rejected(child, 'Ljava/lang/IncompatibleClassChangeError;');
});

test('package-private superclass and interface access uses both package and defining loader', {timeout: 2000}, async () => {
  for (const isInterface of [false, true]) {
    for (const arrangement of ['same-runtime-package', 'foreign-package', 'foreign-loader', 'public-foreign-loader']) {
      const w = world(), parentLoader = w.loader(w.bootstrap);
      const differentLoader = arrangement.endsWith('foreign-loader');
      const childLoader = differentLoader ? w.loader(parentLoader) : parentLoader;
      const flags = (isInterface ? 0x600 : 0x20) | (arrangement === 'public-foreign-loader' ? 1 : 0);
      const parent = w.define({name: 'sample/Parent', flags}, parentLoader);
      const name = arrangement === 'foreign-package' ? 'other/Child' : 'sample/Child';
      const childSpec = {name, superclass: isInterface ? 'java/lang/Object' : 'sample/Parent',
        interfaces: isInterface ? ['sample/Parent'] : []};
      const child = w.define(childSpec, childLoader);
      metadataOnly(w.classes);
      if (arrangement === 'same-runtime-package' || arrangement === 'public-foreign-loader') {
        assert.equal(child.tryToResolveHierarchy(), true);
        const {result, errors} = await derive(child);
        assert.equal(result, child);
        assert.deepEqual(errors, []);
        assert.equal(isInterface ? child.getInterfaces()[0] : child.getSuperClass(), parent);
        const asyncChild = w.define({...childSpec, name: name + 'Async'}, childLoader);
        metadataOnly([asyncChild]);
        const asyncResult = await derive(asyncChild);
        assert.equal(asyncResult.result, asyncChild);
        assert.deepEqual(asyncResult.errors, []);
        assert.equal(isInterface ? asyncChild.getInterfaces()[0] : asyncChild.getSuperClass(), parent);
        assert.equal(asyncChild.isVerified(), false);
        assert.equal(asyncChild.isInitialized(null), false);
      } else {
        await rejected(child, 'Ljava/lang/IllegalAccessError;');
      }
    }
  }
});

test('same-named interface and class identities do not cross defining loaders', () => {
  const w = world(), leftLoader = w.loader(w.bootstrap), rightLoader = w.loader(w.bootstrap);
  function family(owner) {
    const role = w.define({name: 'sample/Role', flags: 0x601}, owner);
    const inherited = w.define({name: 'sample/Inherited', flags: 0x601, interfaces: ['sample/Role']}, owner);
    const parent = w.define({name: 'sample/Parent', interfaces: ['sample/Inherited']}, owner);
    const child = w.define({name: 'sample/Child', superclass: 'sample/Parent'}, owner);
    assert.equal(child.tryToResolveHierarchy(), true);
    return {role, inherited, parent, child};
  }
  const left = family(leftLoader), right = family(rightLoader);
  for (const key of Object.keys(left)) {
    assert.notEqual(left[key], right[key]);
    assert.equal(left[key].getInternalName(), right[key].getInternalName());
    assert.equal(left[key].isCastable(left[key]), true);
    assert.equal(left[key].isCastable(right[key]), false, key + ' identity crossed defining loaders');
    assert.equal(right[key].isCastable(left[key]), false);
  }
  for (const source of [left.inherited, left.parent, left.child]) {
    assert.equal(source.isCastable(left.role), true);
    assert.equal(source.isCastable(right.role), false);
  }
  assert.equal(left.child.isCastable(left.parent), true);
  assert.equal(left.child.isCastable(right.parent), false);
  assert.equal(left.role.isCastable(w.object), true);
  for (const cls of w.classes) assert.equal(cls.isVerified(), false);
});

test('interface and array special casts require the actual bootstrap class identities', () => {
  const w = world();
  const cloneable = w.define({name: 'java/lang/Cloneable', flags: 0x601});
  const serializable = w.define({name: 'java/io/Serializable', flags: 0x601});
  const owner = w.loader(w.bootstrap), spoofLoader = w.loader(w.bootstrap);
  const role = w.define({name: 'sample/Role', flags: 0x601}, owner);
  const component = w.define({name: 'sample/Element'}, owner);
  const spoofObject = w.define({name: 'java/lang/Object', superclass: null}, spoofLoader);
  const spoofCloneable = w.define({name: 'java/lang/Cloneable', flags: 0x601}, spoofLoader);
  const spoofSerializable = w.define({name: 'java/io/Serializable', flags: 0x601}, spoofLoader);
  for (const cls of w.classes) assert.equal(cls.tryToResolveHierarchy(), true);
  const array = new ArrayClassData('Lsample/Element;', owner);
  array.setResolved(w.object, component);
  assert.equal(role.isCastable(w.object), true);
  assert.equal(role.isCastable(spoofObject), false);
  for (const target of [w.object, cloneable, serializable]) assert.equal(array.isCastable(target), true);
  for (const target of [spoofObject, spoofCloneable, spoofSerializable]) assert.equal(array.isCastable(target), false);
});

test('forged reflection accessors receive no package-private superclass capability', {timeout: 2000}, async () => {
  for (const kind of ['ConstructorAccessorImpl', 'SerializationConstructorAccessorImpl', 'MethodAccessorImpl']) {
    const w = world();
    w.define({name: 'sun/reflect/' + kind, flags: 0x420});
    const owner = w.loader(w.bootstrap);
    const candidate = w.define({name: 'sun/reflect/Generated' + kind.replace('Impl', '1'),
      superclass: 'sun/reflect/' + kind}, owner);
    metadataOnly(w.classes);
    await rejected(candidate, 'Ljava/lang/IllegalAccessError;');
  }
});

function arrayClass(w, componentType, owner = w.bootstrap) {
  const array = new ArrayClassData(componentType, owner);
  owner.loaded.set(array.getInternalName(), array);
  return array;
}

async function arrayReady(array, asynchronous) {
  if (asynchronous) {
    const thread = {errors: [], throwNewException(name, message) { this.errors.push({name, message}); }};
    let callbacks = 0;
    const result = await new Promise(resolve => array.resolve(thread, cls => {
      callbacks++;
      resolve(cls);
    }, false));
    assert.equal(result, array);
    assert.equal(callbacks, 1);
    assert.deepEqual(thread.errors, []);
  } else {
    assert.equal(array.tryToResolve(), true);
  }
  assert.equal(array.isResolved(), true);
  assert.equal(array.isInitialized(null), true, 'arrays need no component initializer');
}

async function rejectsFullLink(component, asynchronous) {
  if (asynchronous) {
    const thread = {errors: [], throwNewException(name, message) { this.errors.push({name, message}); }};
    const result = await new Promise(resolve => component.resolve(thread, resolve, false));
    assert.equal(result, null);
    assert.deepEqual(thread.errors.map(error => error.name), ['Ljava/lang/VerifyError;']);
  } else {
    assert.equal(component.tryToResolve(), false);
  }
  assert.equal(component.verification.failure.javaClassName, 'Ljava/lang/VerifyError;');
  assert.equal(component.isVerified(), false);
  assert.equal(component.isInitialized(null), false);
}

test('reference array metadata does not verify or initialize a parsed invalid component', {timeout: 2000}, async () => {
  for (const asynchronous of [false, true]) {
    for (const failedBeforeArray of [false, true]) {
      const w = world(), owner = w.loader(w.bootstrap);
      const component = w.define({name: 'sample/InvalidElement', invalidBody: true}, owner);
      assert.equal(component.tryToResolveHierarchy(), true);
      if (failedBeforeArray) await rejectsFullLink(component, asynchronous);
      const parentVerified = w.object.isVerified();
      const array = arrayClass(w, component.getInternalName(), owner);
      const restore = metadataOnly(w.classes);
      await arrayReady(array, asynchronous);
      assert.equal(array.getComponentClass(), component);
      assert.equal(array.getSuperClass(), w.object);
      assert.equal(array.isCastable(w.object), true);
      assert.equal(array.isCastable(array), true);
      assert.equal(component.isVerified(), false);
      assert.equal(component.isInitialized(null), false);
      assert.equal(w.object.isVerified(), parentVerified, 'array metadata must not fully link its bootstrap parent');
      restore();
      if (!failedBeforeArray) await rejectsFullLink(component, asynchronous);
    }
  }
});

test('rank-two reference arrays recursively prepare array components without linking the element', {timeout: 2000}, async () => {
  for (const asynchronous of [false, true]) {
    for (const failedBeforeArray of [false, true]) {
      const w = world(), owner = w.loader(w.bootstrap);
      const component = w.define({name: 'sample/InvalidRankTwoElement', invalidBody: true}, owner);
      assert.equal(component.tryToResolveHierarchy(), true);
      if (failedBeforeArray) await rejectsFullLink(component, asynchronous);
      const inner = arrayClass(w, component.getInternalName(), owner);
      const outer = arrayClass(w, inner.getInternalName(), owner);
      const objects = arrayClass(w, 'Ljava/lang/Object;');
      assert.equal(inner.isResolved(), false);
      assert.equal(outer.isResolved(), false);
      const restore = metadataOnly(w.classes);
      await arrayReady(outer, asynchronous);
      await arrayReady(objects, asynchronous);
      assert.equal(inner.isResolved(), true);
      assert.equal(inner.getComponentClass(), component);
      assert.equal(outer.getComponentClass(), inner);
      assert.equal(inner.getSuperClass(), w.object);
      assert.equal(outer.getSuperClass(), w.object);
      assert.equal(inner.isCastable(objects), true);
      assert.equal(outer.isCastable(objects), true);
      assert.equal(outer.isCastable(inner), false);
      assert.equal(component.isVerified(), false);
      assert.equal(component.isInitialized(null), false);
      restore();
      if (!failedBeforeArray) await rejectsFullLink(component, asynchronous);
    }
  }
});

test('array superclass lookup uses bootstrap identity even when its element is a foreign Object', {timeout: 2000}, async () => {
  for (const asynchronous of [false, true]) {
    const w = world(), owner = w.loader(w.bootstrap);
    // Controlled loader metadata deliberately has the same binary name in two
    // loaders: superclass and component lookup must not be keyed by name alone.
    const component = w.define({name: 'java/lang/Object', superclass: null}, owner);
    const array = arrayClass(w, 'Ljava/lang/Object;', owner);
    const restore = metadataOnly(w.classes);
    await arrayReady(array, asynchronous);
    assert.equal(array.getComponentClass(), component);
    assert.equal(array.getSuperClass(), w.object);
    assert.notEqual(array.getSuperClass(), component);
    assert.equal(array.isCastable(w.object), true);
    assert.equal(array.isCastable(component), false);
    assert.equal(component.isVerified(), false);
    assert.equal(component.isInitialized(null), false);
    restore();
  }
});

test('primitive and rank-two primitive arrays retain exact components and reference cast rules', {timeout: 2000}, async () => {
  for (const asynchronous of [false, true]) {
    const w = world();
    const cloneable = w.define({name: 'java/lang/Cloneable', flags: 0x601});
    const serializable = w.define({name: 'java/io/Serializable', flags: 0x601});
    const integer = new PrimitiveClassData('I', w.bootstrap), longer = new PrimitiveClassData('J', w.bootstrap);
    w.bootstrap.loaded.set('I', integer);
    w.bootstrap.loaded.set('J', longer);
    const ints = arrayClass(w, 'I'), longs = arrayClass(w, 'J');
    const matrix = arrayClass(w, '[I'), objects = arrayClass(w, 'Ljava/lang/Object;');
    const restore = metadataOnly(w.classes);
    await arrayReady(matrix, asynchronous);
    await arrayReady(longs, asynchronous);
    await arrayReady(objects, asynchronous);
    assert.equal(ints.isResolved(), true);
    assert.equal(ints.getComponentClass(), integer);
    assert.equal(longs.getComponentClass(), longer);
    assert.equal(matrix.getComponentClass(), ints);
    for (const array of [ints, longs, matrix]) {
      assert.equal(array.getSuperClass(), w.object);
      for (const target of [w.object, cloneable, serializable]) assert.equal(array.isCastable(target), true);
      assert.equal(array.isCastable(integer), false);
    }
    assert.equal(ints.isCastable(ints), true);
    assert.equal(ints.isCastable(longs), false);
    assert.equal(ints.isCastable(objects), false);
    assert.equal(matrix.isCastable(objects), true);
    assert.equal(matrix.isCastable(ints), false);
    assert.equal(w.object.isVerified(), false);
    restore();
  }
});
