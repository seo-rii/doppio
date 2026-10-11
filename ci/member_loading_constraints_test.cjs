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
  'VerificationRelations', 'ReflectionAdapters', 'GeneratedAdapters', 'LambdaAdapters', 'SymbolicResolution', 'ClassAccess', 'util']);
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
const {ReferenceClassData} = load('ClassData');
const {ClassLoader} = load('ClassLoader');
const {FieldReference, MethodReference, InterfaceMethodReference} = load('ConstantPool');
const {getLoadingConstraints} = load('LoadingConstraints');
const {getTypes} = require(path.join(runtime, 'src/util'));
const TOKEN = 'Lcontract/Token;';
const u2 = value => { const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes; };
const u4 = value => { const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes; };

// Controlled parsed major-65 binaries isolate the production constant-pool
// resolver, ClassData/ClassPreparation and ClassLoader registry. These are not
// javac output or native/browser evidence. Only the thread's error sink and
// unavailable Java loader body are controlled; declaration lookup and linking
// are real, and no member target is executed.
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
  const utf = text => entry('utf:' + text, () => Buffer.concat([Buffer.from([1]), u2(Buffer.byteLength(text)), Buffer.from(text)]));
  const cls = text => entry('class:' + text, () => Buffer.concat([Buffer.from([7]), u2(utf(text))]));
  const nat = (name, descriptor) => entry('nat:' + name + descriptor,
    () => Buffer.concat([Buffer.from([12]), u2(utf(name)), u2(utf(descriptor))]));
  const self = cls(name), superclass = parent === null ? 0 : cls(parent), interfaceIndices = interfaces.map(cls);
  const encodedFields = fields.map(field => Buffer.concat([
    u2(field.flags), u2(utf(field.name)), u2(utf(field.descriptor)), u2(0)]));
  const encodedMethods = methods.map(method => {
    const nameIndex = utf(method.name), descriptorIndex = utf(method.descriptor);
    if (method.flags & 0x400) return Buffer.concat([u2(method.flags), u2(nameIndex), u2(descriptorIndex), u2(0)]);
    const types = getTypes(method.descriptor), result = types.at(-1);
    const code = Buffer.from(result === 'V' ? [0xb1] : result === 'J' ? [9, 0xad] : result === 'D' ? [14, 0xaf] :
      result === 'F' ? [11, 0xae] : result[0] === 'L' || result[0] === '[' ? [1, 0xb0] : [3, 0xac]);
    const locals = (method.flags & 8 ? 0 : 1) + types.slice(0, -1)
      .reduce((count, type) => count + (type === 'J' || type === 'D' ? 2 : 1), 0);
    const body = Buffer.concat([u2(2), u2(locals), u4(code.length), code, u2(0), u2(0)]);
    return Buffer.concat([u2(method.flags), u2(nameIndex), u2(descriptorIndex), u2(1), u2(utf('Code')), u4(body.length), body]);
  });
  for (const ref of references) entry('ref:' + ref.tag + ':' + ref.owner + '/' + ref.name + ref.descriptor,
    () => Buffer.concat([Buffer.from([ref.tag]), u2(cls(ref.owner)), u2(nat(ref.name, ref.descriptor))]));
  return Buffer.concat([Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0, 0]), u2(65), u2(pool.length + 1), ...pool,
    u2(flags), u2(self), u2(superclass), u2(interfaceIndices.length), ...interfaceIndices.map(u2),
    u2(encodedFields.length), ...encodedFields, u2(encodedMethods.length), ...encodedMethods, u2(0)]);
}

function world() {
  const bootstrap = new ClassLoader(null), tokenClasses = [], requests = [];
  bootstrap.bootstrap = bootstrap;
  bootstrap.getLoaderObject = () => null;
  const constraints = getLoadingConstraints(bootstrap);
  function guardLoader(value) {
    for (const operation of ['loadClass', 'resolveClass', 'initializeClass', 'getResolvedClass', 'getInitializedClass']) {
      const original = value[operation];
      value[operation] = function(...args) {
        const name = args[typeof args[0] === 'string' ? 0 : 1];
        if (typeof name === 'string' && name.replace(/^\[+/, '') === TOKEN) {
          requests.push({operation, name});
          assert.fail('Member resolution eagerly requested descriptor class through ' + operation);
        }
        return original.apply(this, args);
      };
    }
    value._loadClass = () => assert.fail('All non-descriptor metadata must already be published');
    return value;
  }
  function parsed(spec, owner = bootstrap, publish = true) {
    const cls = new ReferenceClassData(classBytes(spec), null, owner);
    assert.equal(cls.majorVersion, 65);
    if (cls.getInternalName() === TOKEN) {
      tokenClasses.push(cls);
      for (const operation of ['resolve', 'tryToResolve', 'initialize', 'tryToInitialize', 'getConstructor']) {
        cls[operation] = () => assert.fail('Member resolution actively linked or initialized Token: ' + operation);
      }
      for (const operation of ['verify', 'tryToVerify']) {
        cls.verification[operation] = () => assert.fail('Member resolution verified Token: ' + operation);
      }
    }
    if (publish) owner.addClass(cls.getInternalName(), cls);
    return cls;
  }
  const object = parsed({name: 'java/lang/Object', parent: null});
  assert.equal(object.tryToResolve(), true);
  guardLoader(bootstrap);
  function loader() {
    const value = new ClassLoader(bootstrap);
    value.getLoaderObject = () => value;
    value.addClass(object.getInternalName(), object);
    return guardLoader(value);
  }
  function passiveTokens() {
    assert.deepEqual(requests, [], 'Descriptor constraints perform no class load or active lookup');
    for (const cls of tokenClasses) {
      assert.equal(cls.isVerified(), false);
      assert.equal(cls.isPrepared(), false);
      assert.equal(cls.isHierarchyResolved(), false);
      assert.equal(cls.isInitialized(null), false);
    }
  }
  return {bootstrap, constraints, loader, parsed, passiveTokens};
}

function fixture(kind, descriptor, relation = 'shared') {
  const w = world(), a = w.loader(), b = w.loader(), c = w.loader();
  let tokenA, tokenB;
  if (relation !== 'unbound') {
    tokenA = w.parsed({name: 'contract/Token'}, a);
    tokenB = w.parsed({name: 'contract/Token'}, b);
    c.addClass(TOKEN, relation === 'shared' ? tokenA : tokenB);
    assert.notEqual(tokenA, tokenB);
    assert.equal(c.getLoadedClass(TOKEN), relation === 'shared' ? a.getLoadedClass(TOKEN) : b.getLoadedClass(TOKEN));
  }
  const name = kind === 'field' ? 'value' : 'exchange';
  const base = w.parsed({name: 'parents/BaseA', flags: kind === 'interface' ? 0x601 : 0x21,
    fields: kind === 'field' ? [{name, descriptor, flags: 9}] : [],
    methods: kind === 'field' ? [] : [{name, descriptor, flags: kind === 'static' ? 9 : 0x401}]}, a);
  b.addClass(base.getInternalName(), base);
  const symbolic = w.parsed({name: 'symbolic/SubB', flags: kind === 'interface' ? 0x601 : 0x21,
    parent: kind === 'interface' ? 'java/lang/Object' : 'parents/BaseA',
    interfaces: kind === 'interface' ? ['parents/BaseA'] : []}, b);
  c.addClass(symbolic.getInternalName(), symbolic);
  const caller = w.parsed({name: 'callers/CallerC', references: [{tag: kind === 'field' ? 9 : kind === 'static' ? 10 : 11,
    owner: 'symbolic/SubB', name, descriptor}]}, c);
  for (const cls of [base, symbolic, caller]) {
    assert.equal(cls.tryToResolve(), true, 'Controlled owner metadata fully verifies and prepares');
    assert.equal(cls.isPrepared(), true);
  }
  const type = kind === 'field' ? FieldReference : kind === 'static' ? MethodReference : InterfaceMethodReference;
  const references = [];
  caller.constantPool.each((index, item) => { if (item instanceof type) references.push(item); });
  assert.equal(references.length, 1);
  const reference = references[0];
  assert.equal(reference.classInfo.name, symbolic.getInternalName());
  assert.equal(reference.classInfo.tryResolve(c), true, 'Resolve the actual parsed symbolic ClassReference');
  const declaration = kind === 'field' ? symbolic.fieldLookup(name) : symbolic.methodLookup(name + descriptor);
  assert.equal(declaration.cls, base, 'Production lookup must return the inherited declaration owned by A');
  w.passiveTokens();
  return {...w, a, b, c, base, symbolic, caller, reference, declaration};
}

function resolve(h) {
  const errors = [], callbacks = [];
  const thread = {getBsCl: () => h.bootstrap, getJVM: () => ({shouldDumpCompiledCode: () => false}),
    currentMethod: () => null, throwNewException(name, message) { errors.push({name, message}); }};
  h.reference.resolve(thread, h.c, h.caller, result => callbacks.push(result));
  assert.equal(callbacks.length, 1, 'An already-linked symbolic owner resolves synchronously and exactly once');
  h.passiveTokens();
  return {success: callbacks[0], errors};
}

const descriptors = {
  field: [TOKEN, '[' + TOKEN, '[[' + TOKEN],
  static: ['(' + TOKEN + ')V', '([' + TOKEN + ')V', '([[' + TOKEN + ')V', '()' + TOKEN],
  interface: ['(' + TOKEN + ')V', '([' + TOKEN + ')V', '([[' + TOKEN + ')V', '()' + TOKEN]
};
for (const [kind, signatures] of Object.entries(descriptors)) {
  for (const descriptor of signatures) {
    test(kind + ' inherited declaration permits C/A shared Token with independent B: ' + descriptor, () => {
      const h = fixture(kind, descriptor), result = resolve(h);
      assert.equal(result.success, true);
      assert.deepEqual(result.errors, []);
      assert.equal(h.reference[kind === 'field' ? 'field' : 'method'], h.declaration);
      assert.equal(h.reference.isResolved(), true);
    });
    test(kind + ' inherited declaration rejects C/B shared Token with distinct A before CP publication: ' + descriptor, () => {
      const h = fixture(kind, descriptor, 'distinct'), result = resolve(h);
      assert.equal(result.success, false, 'Actual declaration owner A, not intermediary B, constrains caller C');
      assert.equal(result.errors.length, 1);
      assert.equal(result.errors[0].name, 'Ljava/lang/LinkageError;');
      assert.equal(h.reference[kind === 'field' ? 'field' : 'method'], null);
      assert.equal(h.reference.isResolved(), false);
      if (kind === 'field') {
        assert.equal(h.reference.fullFieldName, null);
        assert.equal(h.reference.fieldOwnerConstructor, null);
      } else {
        assert.equal(h.reference.fullSignature, null);
        assert.equal(h.reference.jsConstructor, null);
      }
      assert.equal(h.reference.classInfo.cls, h.symbolic, 'Failure retains correctly resolved symbolic class metadata');
      assert.equal(h.c.getLoadedClass(TOKEN), h.b.getLoadedClass(TOKEN), 'A rejected edge must not replace initiating identity');
    });
  }
  test(kind + ' late descriptor identities constrain A/C without eagerly loading Token or constraining B', () => {
    const descriptor = kind === 'field' ? '[[' + TOKEN : '()[[' + TOKEN;
    const h = fixture(kind, descriptor, 'unbound'), result = resolve(h);
    assert.equal(result.success, true);
    assert.deepEqual(result.errors, []);
    for (const loader of [h.a, h.b, h.c]) assert.equal(loader.getLoadedClass(TOKEN), null);
    const accepted = h.parsed({name: 'contract/Token'}, h.a);
    const unrelated = h.parsed({name: 'contract/Token'}, h.b);
    const rejected = h.parsed({name: 'contract/Token'}, h.c, false);
    assert.throws(() => h.c.addClass(TOKEN, rejected), /initiating-loader constraint violation/,
      'The actual addClass publication path must observe the deferred A/C edge');
    assert.equal(h.c.getLoadedClass(TOKEN), null, 'Rejected late identity is not published');
    h.c.addClass(TOKEN, accepted);
    assert.equal(h.c.getLoadedClass(TOKEN), accepted);
    assert.equal(h.b.getLoadedClass(TOKEN), unrelated, 'Symbolic B has its own unconstrained leaf identity');
    h.passiveTokens();
  });
  test(kind + ' primitive and primitive-array descriptor leaves impose no reference identity constraint', () => {
    for (const descriptor of kind === 'field' ? ['I', '[J', '[[D'] : ['(I[J[[D)V', '()[[I', '()J']) {
      const h = fixture(kind, descriptor, 'distinct'), imposed = [];
      const original = h.constraints.impose.bind(h.constraints);
      h.constraints.impose = (...args) => { imposed.push(args); return original(...args); };
      const result = resolve(h);
      assert.equal(result.success, true);
      assert.deepEqual(result.errors, []);
      assert.deepEqual(imposed, [], 'Primitive leaves cannot create registry reference edges');
      assert.equal(h.reference[kind === 'field' ? 'field' : 'method'], h.declaration);
    }
  });
}
