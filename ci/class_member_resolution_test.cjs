'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const ts = require('typescript');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const sourceModules = new Set(['ClassData', 'ClassLoader', 'ConstantPool', 'threading', 'methods',
  'ClassVerification', 'ClassPreparation', 'LoadingConstraints', 'BytecodeVerifier', 'BytecodeTypeVerifier',
  'VerificationRelations', 'GeneratedAdapters', 'LambdaAdapters', 'ReflectionAdapters']);
const cache = new Map();
function load(name) {
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(path.join(runtime, 'src', name + '.js'));
  if (cache.has(name)) return cache.get(name).exports;
  const filename = path.join(runtime, 'src', name + '.js'), loaded = new Module(filename, module);
  cache.set(name, loaded);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = id => {
    const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(name), id));
    return id.startsWith('.') && sourceModules.has(dependency) ? load(dependency) : original(id);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', name + '.ts'), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS}
  }).outputText, filename);
  return loaded.exports;
}
const {ReferenceClassData} = load('ClassData');
const {ClassLoader} = load('ClassLoader');
const {FieldReference, MethodReference, InterfaceMethodReference} = load('ConstantPool');
const u2 = value => { const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes; };
const u4 = value => { const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes; };

// Constructed, parsed major-65 metadata isolates declaration lookup and the
// actual CP resolver. These are not genuine javac, execution or host evidence.
// Bodies are trivial and never invoked; all hierarchy identities are real.
function classBytes({name, parent = 'java/lang/Object', interfaces = [], flags = 0x21,
  fields = [], methods = [], references = []}) {
  const pool = [], indices = new Map();
  function entry(key, make) {
    if (!indices.has(key)) {
      const bytes = make();
      pool.push(bytes);
      indices.set(key, pool.length);
    }
    return indices.get(key);
  }
  const utf = text => entry('utf:' + text,
    () => Buffer.concat([Buffer.from([1]), u2(Buffer.byteLength(text)), Buffer.from(text)]));
  const cls = text => entry('class:' + text, () => Buffer.concat([Buffer.from([7]), u2(utf(text))]));
  const nat = (name, descriptor) => entry('nat:' + name + descriptor,
    () => Buffer.concat([Buffer.from([12]), u2(utf(name)), u2(utf(descriptor))]));
  const self = cls(name), superclass = parent === null ? 0 : cls(parent), interfaceIndices = interfaces.map(cls);
  const encodedFields = fields.map(field => Buffer.concat([
    u2(field.flags ?? 1), u2(utf(field.name)), u2(utf(field.descriptor)), u2(0)]));
  const encodedMethods = methods.map(method => {
    const flags = method.flags ?? 1, nameIndex = utf(method.name), descriptorIndex = utf(method.descriptor);
    assert.equal(method.descriptor, '()V', 'Unit methods need only a descriptor-kind control');
    if (flags & 0x400) return Buffer.concat([u2(flags), u2(nameIndex), u2(descriptorIndex), u2(0)]);
    const body = Buffer.concat([u2(0), u2(flags & 8 ? 0 : 1), u4(1), Buffer.from([0xb1]), u2(0), u2(0)]);
    return Buffer.concat([u2(flags), u2(nameIndex), u2(descriptorIndex), u2(1), u2(utf('Code')), u4(body.length), body]);
  });
  references.forEach(ref => entry('ref:' + ref.tag + ':' + ref.owner + '/' + ref.name + ref.descriptor,
    () => Buffer.concat([Buffer.from([ref.tag]), u2(cls(ref.owner)), u2(nat(ref.name, ref.descriptor))])));
  return Buffer.concat([Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0, 0]), u2(65), u2(pool.length + 1), ...pool,
    u2(flags), u2(self), u2(superclass), u2(interfaceIndices.length), ...interfaceIndices.map(u2),
    u2(encodedFields.length), ...encodedFields, u2(encodedMethods.length), ...encodedMethods, u2(0)]);
}

function world() {
  const bootstrap = new ClassLoader(null);
  bootstrap.bootstrap = bootstrap;
  bootstrap.getLoaderObject = () => null;
  bootstrap._loadClass = () => assert.fail('A metadata resolution unit must not load extra classes');
  function define(spec) {
    const cls = new ReferenceClassData(classBytes(spec), null, bootstrap);
    bootstrap.addClass(cls.getInternalName(), cls);
    assert.equal(cls.tryToResolve(), true, 'The controlled metadata fully links before CP member lookup');
    return cls;
  }
  const object = define({name: 'java/lang/Object', parent: null});
  function reference(tag, owner, name, descriptor) {
    const caller = define({name: 'callers/Caller' + Object.keys(bootstrap.loadedClasses).length,
      references: [{tag, owner: owner.getInternalName().slice(1, -1), name, descriptor}]});
    const type = tag === 9 ? FieldReference : tag === 10 ? MethodReference : InterfaceMethodReference;
    let result;
    caller.constantPool.each((index, item) => { if (item instanceof type) result = item; });
    assert.ok(result);
    assert.equal(result.classInfo.tryResolve(bootstrap), true);
    return {caller, result};
  }
  async function resolve(pair) {
    const errors = [], thread = {
      currentMethod: () => null,
      getBsCl: () => bootstrap,
      getJVM: () => ({shouldDumpCompiledCode: () => false}),
      throwNewException(name, message) { errors.push({name, message}); }
    };
    let callbacks = 0;
    const success = await new Promise(done => pair.result.resolve(thread, bootstrap, pair.caller,
      value => { callbacks++; done(value); }));
    assert.equal(callbacks, 1);
    return {success, errors};
  }
  return {bootstrap, object, define, reference, resolve};
}

test('a field reference requires the complete descriptor before publishing any member cache', async () => {
  const w = world(), owner = w.define({name: 'fields/Owner', fields: [{name: 'value', descriptor: 'I'}]});
  const pair = w.reference(9, owner, 'value', 'J'), result = await w.resolve(pair);
  assert.equal(result.success, false);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].name, 'Ljava/lang/NoSuchFieldError;');
  assert.equal(pair.result.field, null);
  assert.equal(pair.result.fullFieldName, null);
  assert.equal(pair.result.fieldOwnerConstructor, null);
  assert.equal(pair.result.isResolved(), false);
});

test('same-spelling child fields with another descriptor do not hide the matching superclass field', async () => {
  const w = world();
  const base = w.define({name: 'fields/Base', fields: [{name: 'value', descriptor: 'I'}]});
  const child = w.define({name: 'fields/Child', parent: 'fields/Base', fields: [{name: 'value', descriptor: 'J'}]});
  const pair = w.reference(9, child, 'value', 'I'), result = await w.resolve(pair);
  assert.equal(result.success, true);
  assert.deepEqual(result.errors, []);
  assert.ok(pair.result.field === base.getFields()[0], 'The exact declaration remains the superclass field');
  assert.ok(pair.result.field.cls === base, 'The declaration keeps its actual superclass owner');
});

test('descriptor-exact field lookup skips a mismatched first interface and retains declaration order', async () => {
  const w = world();
  const first = w.define({name: 'fields/First', flags: 0x601, fields: [{name: 'value', descriptor: 'J', flags: 0x19}]});
  const second = w.define({name: 'fields/Second', flags: 0x601, fields: [{name: 'value', descriptor: 'I', flags: 0x19}]});
  const base = w.define({name: 'fields/Base', fields: [{name: 'value', descriptor: 'I'}]});
  const child = w.define({name: 'fields/Child', parent: 'fields/Base', interfaces: ['fields/First', 'fields/Second']});
  const pair = w.reference(9, child, 'value', 'I'), result = await w.resolve(pair);
  assert.equal(result.success, true);
  assert.deepEqual(result.errors, []);
  assert.ok(pair.result.field === second.getFields()[0], 'Superinterfaces precede the superclass after exact matching');
  assert.ok(pair.result.field.cls !== first);
  assert.ok(pair.result.field.cls !== base);
});

test('the first matching direct-interface field wins without a later interface replacing it', async () => {
  const w = world();
  const first = w.define({name: 'fields/First', flags: 0x601, fields: [{name: 'value', descriptor: 'I', flags: 0x19}]});
  w.define({name: 'fields/Second', flags: 0x601, fields: [{name: 'value', descriptor: 'I', flags: 0x19}]});
  const child = w.define({name: 'fields/Child', interfaces: ['fields/First', 'fields/Second']});
  const pair = w.reference(9, child, 'value', 'I'), result = await w.resolve(pair);
  assert.equal(result.success, true);
  assert.deepEqual(result.errors, []);
  assert.ok(pair.result.field === first.getFields()[0], 'The first exact interface declaration retains identity');
});

for (const [requested, declared] of [['[I', '[[I'], ['Ljava/lang/Object;', '[Ljava/lang/Object;']]) {
  test('field reference ranks and reference shapes are exact: ' + requested + ' is not ' + declared, async () => {
    const w = world(), owner = w.define({name: 'fields/Owner', fields: [{name: 'value', descriptor: declared}]});
    const pair = w.reference(9, owner, 'value', requested), result = await w.resolve(pair);
    assert.equal(result.success, false);
    assert.equal(result.errors[0].name, 'Ljava/lang/NoSuchFieldError;');
    assert.equal(pair.result.field, null);
  });
}

for (const [tag, iface, allowed] of [[10, false, true], [10, true, false], [11, true, true], [11, false, false]]) {
  test(`${tag === 10 ? 'Methodref' : 'InterfaceMethodref'} retains the symbolic ${iface ? 'interface' : 'class'} kind`, async () => {
    const w = world(), owner = w.define({name: 'methods/Owner', flags: iface ? 0x601 : 0x21,
      methods: [{name: 'target', descriptor: '()V', flags: iface ? 0x401 : 1}]});
    const pair = w.reference(tag, owner, 'target', '()V'), result = await w.resolve(pair);
    assert.equal(result.success, allowed);
    if (allowed) {
      assert.deepEqual(result.errors, []);
      assert.ok(pair.result.method === owner.getMethods()[0]);
    } else {
      assert.equal(result.errors.length, 1);
      assert.equal(result.errors[0].name, 'Ljava/lang/IncompatibleClassChangeError;');
      assert.equal(pair.result.method, null);
      assert.equal(pair.result.fullSignature, null);
      assert.equal(pair.result.jsConstructor, null);
    }
  });
}
