'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.join(root, 'build/release-cli');
const {ReferenceClassData, ArrayClassData, PrimitiveClassData, ClassData} = require(path.join(runtime, 'src/ClassData'));
const {ClassLoader} = require(path.join(runtime, 'src/ClassLoader'));
const util = require(path.join(runtime, 'src/util'));

// Actual source native functions and actual parsed ClassData identities with
// controlled heap/thread boundaries. These synthetic units are not original
// javac21/25 or native/Node/Chromium execution evidence.
const filename = path.join(root, 'src/natives/java_lang_constant.ts');
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.require = id => {
  if (id === '../doppiojvm') return {VM: {ClassFile: {ReferenceClassData, ClassData}, Util: util}};
  return assert.fail('Unexpected nominal native dependency: ' + id);
};
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS, ignoreDeprecations: '6.0'},
  reportDiagnostics: true
});
assert.deepEqual(compiled.diagnostics, []);
loaded._compile(compiled.outputText, filename);
const natives = loaded.exports.default();
const helper = natives['java/lang/invoke/DoppioNominalConstants'];
const varHandleFilename = path.join(root, 'src/natives/java_lang_invoke.ts');
const varHandleModule = new Module(varHandleFilename, module);
varHandleModule.filename = varHandleFilename;
varHandleModule.require = id => {
  if (id === '../doppiojvm') return {VM: {ClassFile: {ReferenceClassData, ArrayClassData},
    Enums: {ThreadStatus: require(path.join(runtime, 'src/enums')).ThreadStatus},
    Util: {...util, initString(bootstrap, value) {
      return {getClass: () => bootstrap.getLoadedClass('Ljava/lang/String;'), toString: () => value};
    }}}};
  if (id === '../VarHandleStorage') return require(path.join(runtime, 'src/VarHandleStorage'));
  return assert.fail('Unexpected nominal VarHandle dependency: ' + id);
};
const varHandleCompiled = ts.transpileModule(fs.readFileSync(varHandleFilename, 'utf8'), {
  compilerOptions: {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS, ignoreDeprecations: '6.0'},
  reportDiagnostics: true
});
assert.deepEqual(varHandleCompiled.diagnostics, []);
varHandleModule._compile(varHandleCompiled.outputText, varHandleFilename);
const varHandleHelper = varHandleModule.exports.default()['java/lang/invoke/DoppioVarHandles'];
const varHandleSignatures = {
  kind: 'nominalKind(Ljava/lang/invoke/VarHandle;)I',
  owner: 'nominalOwner(Ljava/lang/invoke/VarHandle;)Ljava/lang/Class;',
  name: 'nominalName(Ljava/lang/invoke/VarHandle;)Ljava/lang/String;',
  capture: 'captureField(Ljava/lang/invoke/VarHandle;Ljava/lang/Class;Ljava/lang/String;Ljava/lang/Class;Z)V',
  array: 'captureArray(Ljava/lang/invoke/VarHandle;Ljava/lang/Class;)V',
  copy: 'copyStorage(Ljava/lang/invoke/VarHandle;Ljava/lang/invoke/VarHandle;)V'
};
const signatures = {
  reference: 'referenceKind(Ljava/lang/invoke/MethodHandle;)I',
  owner: 'declaringClass(Ljava/lang/invoke/MethodHandle;)Ljava/lang/Class;',
  name: 'memberName(Ljava/lang/invoke/MethodHandle;)Ljava/lang/String;',
  descriptor: 'memberDescriptor(Ljava/lang/invoke/MethodHandle;)Ljava/lang/String;'
};
const memberPrefix = 'java/lang/invoke/MemberName/';
const handleMember = 'java/lang/invoke/DirectMethodHandle/member';
const u2 = value => { const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes; };
const u4 = value => { const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes; };
function classBytes(name, parent = 'java/lang/Object', flags = 0x21, fields = []) {
  const entries = [];
  const utf = value => {
    const bytes = Buffer.from(value); entries.push(Buffer.concat([Buffer.from([1]), u2(bytes.length), bytes]));
    return entries.length;
  };
  const cls = value => { const index = utf(value); entries.push(Buffer.concat([Buffer.from([7]), u2(index)])); return entries.length; };
  const self = cls(name), superClass = parent === null ? 0 : cls(parent);
  const members = fields.map(field => Buffer.concat([u2(field.flags), u2(utf(field.name)), u2(utf(field.descriptor)), u2(0)]));
  return Buffer.concat([u4(0xcafebabe), u2(0), u2(52), u2(entries.length + 1), ...entries,
    u2(flags), u2(self), u2(superClass), u2(0), u2(members.length), ...members, u2(0), u2(0)]);
}
function world() {
  const bootstrap = new ClassLoader(null), interned = [], errors = [];
  bootstrap.bootstrap = bootstrap;
  bootstrap.getLoaderObject = () => null;
  bootstrap._loadClass = () => assert.fail('Nominal metadata performs class loading');
  bootstrap.resolveClass = bootstrap.initializeClass = () => assert.fail('Nominal metadata resolves or initializes a class');
  const parse = (name, parent = null, loader = bootstrap, flags = 0x21, fields = []) => {
    const cls = new ReferenceClassData(classBytes(name, parent && parent.getInternalName().slice(1, -1), flags, fields), null, loader);
    cls.setResolved(parent, []);
    loader.addClass(cls.getInternalName(), cls);
    return cls;
  };
  const object = parse('java/lang/Object');
  const classClass = parse('java/lang/Class', object);
  const stringClass = parse('java/lang/String', object);
  const methodTypeClass = parse('java/lang/invoke/MethodType', object);
  const memberClass = parse('java/lang/invoke/MemberName', object);
  const methodHandleClass = parse('java/lang/invoke/MethodHandle', object, bootstrap, 0x421);
  const directClass = parse('java/lang/invoke/DirectMethodHandle', methodHandleClass);
  const accessorClass = parse('java/lang/invoke/DirectMethodHandle$Accessor', directClass);
  const constructorClass = parse('java/lang/invoke/DirectMethodHandle$Constructor', directClass);
  const boundClass = parse('java/lang/invoke/BoundMethodHandle', methodHandleClass);
  const foreign = new ClassLoader(bootstrap);
  foreign.bootstrap = bootstrap;
  foreign.getLoaderObject = () => null;
  foreign._loadClass = () => assert.fail('Nominal metadata performs foreign name lookup');
  foreign.resolveClass = foreign.initializeClass = () => assert.fail('Nominal metadata links foreign identities');
  const owner = parse('scope/Owner', object, foreign);
  const mirror = cls => ({$cls: cls, getClass: () => classClass});
  const text = value => ({getClass: () => stringClass, toString: () => value});
  const methodType = (result, parameters) => ({getClass: () => methodTypeClass,
    'java/lang/invoke/MethodType/rtype': mirror(result),
    'java/lang/invoke/MethodType/ptypes': {array: parameters.map(mirror)},
    toString: () => assert.fail('Do not trust a toString or descriptor supplied by a handle')});
  const thread = {getBsCl: () => bootstrap,
    getJVM: () => ({internString(value) { interned.push(value); return text(value); }}),
    throwNewException(type, message) { errors.push({type, message}); },
    setStatus() { assert.fail('Read-only nominal metadata does not yield'); },
    asyncReturn() { assert.fail('Read-only nominal metadata does not schedule Java invocation'); }};
  const primitives = new Map();
  const primitive = name => {
    if (!primitives.has(name)) primitives.set(name, new PrimitiveClassData(name, bootstrap));
    return primitives.get(name);
  };
  bootstrap.getPrimitiveClass = primitive;
  function handle(referenceKind = 6, {declaring = owner, kind, name = 'wide', valueType,
      result = primitive('J'), parameters = [primitive('J')], handleClass} = {}) {
    const memberKind = kind || (referenceKind <= 4 ? 0x40000 : referenceKind === 8 ? 0x20000 : 0x10000);
    const member = {getClass: () => memberClass,
      [memberPrefix + 'flags']: memberKind | (referenceKind << 24),
      [memberPrefix + 'resolution']: null,
      [memberPrefix + 'clazz']: mirror(declaring),
      [memberPrefix + 'name']: text(referenceKind === 8 ? '<init>' : name),
      [memberPrefix + 'type']: referenceKind <= 4 ? mirror(valueType || primitive('J')) :
        methodType(referenceKind === 8 ? primitive('V') : result, parameters)};
    return {getClass: () => handleClass || (referenceKind <= 4 ? accessorClass : referenceKind === 8 ? constructorClass : directClass),
      [handleMember]: member};
  }
  return {bootstrap, foreign, thread, errors, interned, object, classClass, stringClass, methodTypeClass,
    memberClass, methodHandleClass, directClass, accessorClass, constructorClass, boundClass, owner,
    parse, mirror, text, methodType, primitive, handle};
}
function query(w, handle, name) { return helper[signatures[name]](w.thread, handle); }
function empty(w, handle) {
  assert.equal(query(w, handle, 'reference'), 0);
  assert.equal(query(w, handle, 'owner'), null);
  assert.equal(query(w, handle, 'name'), null);
  assert.equal(query(w, handle, 'descriptor'), null);
}

test('native creator publishes only the fixed four read-only private helper signatures', () => {
  assert.deepEqual(Object.keys(natives), ['java/lang/invoke/DoppioNominalConstants']);
  assert.deepEqual(Object.keys(helper).sort(), Object.values(signatures).sort());
  assert.equal(Object.values(signatures).some(value => value.includes('Lookup') || value.includes('MemberName;')), false);
});

test('all fixed hooks reject a null MethodHandle with the Java NullPointerException family', () => {
  const w = world();
  for (const signature of Object.values(signatures)) helper[signature](w.thread, null);
  assert.equal(w.errors.length, 4);
  assert.ok(w.errors.every(error => error.type === 'Ljava/lang/NullPointerException;'));
  assert.deepEqual(w.interned, []);
});

for (let referenceKind = 1; referenceKind <= 9; referenceKind++) {
  test('canonical held direct member reference kind ' + referenceKind + ' retains owner/name/type identity', () => {
    const w = world(), handle = w.handle(referenceKind), member = handle[handleMember];
    assert.equal(query(w, handle, 'reference'), referenceKind);
    assert.ok(query(w, handle, 'owner') === member[memberPrefix + 'clazz']);
    assert.ok(query(w, handle, 'name') === member[memberPrefix + 'name']);
    assert.equal(query(w, handle, 'descriptor').toString(), referenceKind <= 4 ? 'J' : referenceKind === 8 ? '(J)V' : '(J)J');
    assert.equal(member[memberPrefix + 'flags'] >>> 24, referenceKind, 'Never rewrite captured member flags');
    assert.deepEqual(w.errors, []);
  });
}

test('constructor metadata maps its legacy special initializer flags without exposing or mutating the MemberName', () => {
  const w = world(), handle = w.handle(8), member = handle[handleMember];
  member[memberPrefix + 'flags'] = 0x20000 | (7 << 24);
  assert.equal(query(w, handle, 'reference'), 8);
  assert.equal(query(w, handle, 'descriptor').toString(), '(J)V');
  assert.equal(member[memberPrefix + 'flags'] >>> 24, 7);
});

test('bound and same-name foreign direct classes cannot use a forged direct member field', () => {
  const w = world();
  empty(w, w.handle(6, {handleClass: w.boundClass}));
  const foreignDirect = w.parse('java/lang/invoke/DirectMethodHandle', w.methodHandleClass, w.foreign);
  empty(w, w.handle(6, {handleClass: foreignDirect}));
  const illegalForeignSubtype = w.parse('scope/ForeignDirect', w.directClass, w.foreign);
  empty(w, w.handle(6, {handleClass: illegalForeignSubtype}));
  assert.deepEqual(w.interned, []);
  assert.deepEqual(w.errors, []);
});

test('array-owned getter metadata is not converted into a nominal class or interface member', () => {
  const w = world(), array = new ArrayClassData(w.owner.getInternalName(), w.foreign);
  array.setResolved(w.object, w.owner);
  empty(w, w.handle(1, {declaring: array}));
  assert.deepEqual(w.errors, []);
});

test('same-name foreign MemberName, MethodType, String and Class mirrors are rejected by exact bootstrap identity', () => {
  const w = world();
  for (const name of ['java/lang/invoke/MemberName', 'java/lang/invoke/MethodType', 'java/lang/String', 'java/lang/Class']) {
    const foreign = w.parse(name, w.object, w.foreign), handle = w.handle(), member = handle[handleMember];
    if (name.endsWith('/MemberName')) member.getClass = () => foreign;
    else if (name.endsWith('/MethodType')) member[memberPrefix + 'type'].getClass = () => foreign;
    else if (name.endsWith('/String')) member[memberPrefix + 'name'].getClass = () => foreign;
    else member[memberPrefix + 'clazz'].getClass = () => foreign;
    empty(w, handle);
  }
  assert.deepEqual(w.interned, []);
  assert.deepEqual(w.errors, []);
});

test('a held owner from a different loader is returned exactly without name re-resolution', () => {
  const w = world(), twin = w.parse('scope/Owner', w.object, w.bootstrap), handle = w.handle();
  assert.equal(twin.getInternalName(), w.owner.getInternalName());
  const actual = query(w, handle, 'owner');
  assert.ok(actual.$cls === w.owner && actual.$cls !== twin);
  assert.ok(actual === handle[handleMember][memberPrefix + 'clazz']);
  assert.deepEqual(w.errors, []);
});

test('held hidden owner, parameter and hidden-array identities remain visible to the Java constable rejection path', () => {
  const w = world(), hidden = new ReferenceClassData(classBytes('scope/Payload'), null, w.foreign);
  hidden.markHidden('0x1', null, false);
  hidden.setResolved(w.object, []);
  const handle = w.handle(6, {declaring: hidden});
  assert.ok(query(w, handle, 'owner').$cls === hidden);
  assert.equal(query(w, handle, 'reference'), 6);
  const array = new ArrayClassData(hidden.getInternalName(), w.foreign);
  array.setResolved(w.object, hidden);
  const parameter = w.handle(6, {parameters: [hidden, array], result: w.primitive('V')});
  assert.equal(query(w, parameter, 'descriptor').toString(),
    '(Lscope/Payload.0x1;[Lscope/Payload.0x1;)V');
  assert.ok(parameter[handleMember][memberPrefix + 'type']['java/lang/invoke/MethodType/ptypes'].array[0].$cls === hidden);
  assert.deepEqual(w.errors, []);
});

test('unresolved, malformed, wrong-kind and unsupported held member metadata produce no nominal information', () => {
  const w = world();
  for (const change of [
    member => { member[memberPrefix + 'resolution'] = {}; },
    member => { member[memberPrefix + 'name'] = null; },
    member => { member[memberPrefix + 'type'] = null; },
    member => { member[memberPrefix + 'flags'] = 0x80000 | (6 << 24); },
    member => { member[memberPrefix + 'flags'] = 0x10000 | (10 << 24); },
    member => { member[memberPrefix + 'flags'] = 0x10000 | (1 << 24); },
    member => { member[memberPrefix + 'type']['java/lang/invoke/MethodType/rtype'] = null; },
    member => { member[memberPrefix + 'type']['java/lang/invoke/MethodType/ptypes'].array = null; }
  ]) {
    const handle = w.handle(); change(handle[handleMember]); empty(w, handle);
  }
  empty(w, w.handle(1, {valueType: w.primitive('V')}));
  assert.deepEqual(w.interned, []);
  assert.deepEqual(w.errors, []);
});

test('MethodType Java descriptions check genuine return and parameter Class constables rather than descriptor text alone', () => {
  const source = fs.readFileSync(path.join(root, 'classes/modern_classlib/java/lang/invoke/DoppioNominalConstants.java'), 'utf8');
  assert.match(source, /describeClass\(type\.returnType\(\)\)/);
  assert.match(source, /type\.parameterArray\(\)/);
  assert.match(source, /describeClass\(parameters\[i\]\)/);
  assert.match(source, /describeClass\(declaringClass\)/);
  assert.match(source, /describeMethodType\(handle\.type\(\)\)/);
  assert.equal(source.includes('IMPL_LOOKUP') || source.includes('revealDirect') || source.includes('internalMemberName'), false);
  assert.equal(source.includes('toMethodDescriptorString'), false, 'Hidden components must not be reconstructed as ordinary nominal class names');
  assert.equal(/native\s+.*(?:MemberName|Lookup)/.test(source), false);
  assert.match(source, /describeClass0\(Objects\.requireNonNull\(type\)\)/);
  assert.match(source, /private static native Optional<ClassDesc> describeClass0\(Class<\?> type\)/);
});

test('captured instance and static VarHandle fields project the actual parsed declaring identity, name and storage kind', () => {
  const w = world(), cell = w.parse('scope/Cell', w.object, w.foreign, 0x21,
    [{name: 'value', descriptor: 'J', flags: 1}, {name: 'shared', descriptor: 'J', flags: 9}]);
  assert.equal(cell.tryToResolve(), true, 'Link the actual parsed primitive fields before capturing their identities');
  assert.equal(cell.isInitialized(null), false);
  const owner = w.mirror(cell);
  cell.getClassObject = thread => { assert.ok(thread === w.thread); return owner; };
  for (const [name, isStatic, expectedKind] of [['value', 0, 1], ['shared', 1, 2]]) {
    const handle = {};
    varHandleHelper[varHandleSignatures.capture](w.thread, handle, owner, w.text(name), w.mirror(w.primitive('J')), isStatic);
    assert.deepEqual(w.errors, []);
    const field = cell.fieldLookup(name, 'J');
    assert.ok(handle.$varHandleCapability.field === field);
    assert.equal(varHandleHelper[varHandleSignatures.kind](w.thread, handle), expectedKind);
    assert.ok(varHandleHelper[varHandleSignatures.owner](w.thread, handle) === owner);
    assert.equal(varHandleHelper[varHandleSignatures.name](w.thread, handle).toString(), name);
    assert.equal(Object.getOwnPropertyDescriptor(handle, '$varHandleCapability').writable, false);
    const view = {};
    varHandleHelper[varHandleSignatures.copy](w.thread, handle, view);
    assert.ok(view.$varHandleCapability === handle.$varHandleCapability);
    assert.ok(varHandleHelper[varHandleSignatures.owner](w.thread, view) === owner);
    assert.equal(varHandleHelper[varHandleSignatures.kind](w.thread, view), expectedKind);
  }
  assert.equal(cell.isInitialized(null), false, 'Projection never runs a static declaration initializer');
  assert.deepEqual(w.errors, []);
});

test('captured array and copied VarHandle views preserve exact component, owner and capability identities', () => {
  const w = world(), array = new ArrayClassData(w.owner.getInternalName(), w.foreign);
  array.setResolved(w.object, w.owner);
  const owner = w.mirror(array);
  array.getClassObject = thread => { assert.ok(thread === w.thread); return owner; };
  const original = {}, copy = {};
  varHandleHelper[varHandleSignatures.array](w.thread, original, owner);
  varHandleHelper[varHandleSignatures.copy](w.thread, original, copy);
  for (const handle of [original, copy]) {
    assert.equal(varHandleHelper[varHandleSignatures.kind](w.thread, handle), 3);
    assert.ok(varHandleHelper[varHandleSignatures.owner](w.thread, handle) === owner);
    assert.equal(varHandleHelper[varHandleSignatures.name](w.thread, handle), null);
    assert.ok(handle.$varHandleCapability.arrayClass.getComponentClass() === w.owner);
  }
  assert.ok(copy.$varHandleCapability === original.$varHandleCapability);
  assert.deepEqual(w.errors, []);
});

test('absent, inherited and ambiguous VarHandle captures project no nominal metadata or authority', () => {
  const w = world(), field = {cls: w.owner, name: 'value', accessFlags: {isStatic: () => false}},
    array = new ArrayClassData(w.owner.getInternalName(), w.foreign);
  const inherited = Object.create({$varHandleCapability: {field, readonly: false}});
  for (const handle of [null, {}, inherited, {$varHandleCapability: null},
    {$varHandleCapability: {readonly: false}}, {$varHandleCapability: {field, arrayClass: array, readonly: false}}]) {
    assert.equal(varHandleHelper[varHandleSignatures.kind](w.thread, handle), 0);
    assert.equal(varHandleHelper[varHandleSignatures.owner](w.thread, handle), null);
    assert.equal(varHandleHelper[varHandleSignatures.name](w.thread, handle), null);
  }
  assert.deepEqual(w.errors, []);
  assert.deepEqual(w.interned, []);
});
