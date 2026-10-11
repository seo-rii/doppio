'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const sourceModules = new Set(['ClassData', 'ClassLoader', 'ConstantPool', 'threading', 'methods',
  'ClassVerification', 'BytecodeVerifier', 'BytecodeTypeVerifier', 'VerificationRelations',
  'GeneratedAdapters', 'LambdaAdapters', 'ReflectionAdapters', 'LoadingConstraints', 'ClassPreparation', 'opcodes', 'method_handles',
  'SymbolicResolution', 'ClassAccess', 'util']);
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
      compilerOptions: {target: 1, module: 1}
    }).outputText, filename);
  return loaded.exports;
}
const {ReferenceClassData, ArrayClassData} = load('ClassData');
const {Method} = load('methods');
const u2 = value => { const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes; };
const u4 = value => { const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes; };
const PUBLIC = 1, PRIVATE = 2, PROTECTED = 4, STATIC = 8, FINAL = 16, ABSTRACT = 0x400;
const methodSpec = (flags = PUBLIC, name = 'm', descriptor = '()V') => ({flags, name, descriptor});

// Synthetic, parsed metadata units: these bytes are deliberately constructed,
// not javac output. Hierarchies are installed explicitly and no method body is
// verified or executed. Genuine evolution, native timing and host agreement
// require the separate loading-constraint/selection corpus.
function classBytes({name, superclass, interfaces, flags, methods}) {
  const entries = [], indices = new Map();
  function entry(key, make) {
    if (indices.has(key)) return indices.get(key);
    const bytes = make(), index = entries.length + 1;
    entries.push(bytes);
    indices.set(key, index);
    return index;
  }
  const cp = {
    utf(text) { return entry('utf:' + text, () => Buffer.concat([Buffer.from([1]), u2(Buffer.byteLength(text)), Buffer.from(text)])); },
    cls(text) { return entry('class:' + text, () => Buffer.concat([Buffer.from([7]), u2(cp.utf(text))])); },
    nat(name, descriptor) { return entry('nat:' + name + descriptor, () => Buffer.concat([Buffer.from([12]), u2(cp.utf(name)), u2(cp.utf(descriptor))])); },
    method(owner, name, descriptor) { return entry('method:' + owner + '/' + name + descriptor,
      () => Buffer.concat([Buffer.from([10]), u2(cp.cls(owner)), u2(cp.nat(name, descriptor))])); }
  };
  const self = cp.cls(name), parent = superclass === null ? 0 : cp.cls(superclass);
  const interfaceIndices = interfaces.map(item => u2(cp.cls(item)));
  const encoded = methods.map(method => {
    const nameIndex = cp.utf(method.name), descriptorIndex = cp.utf(method.descriptor);
    if ((method.flags & ABSTRACT) !== 0) return Buffer.concat([
      u2(method.flags), u2(nameIndex), u2(descriptorIndex), u2(0)]);
    const returnType = method.descriptor.slice(method.descriptor.indexOf(')') + 1);
    let code = returnType === 'V' ? [0xb1] : returnType === 'J' ? [0x09, 0xad] :
      returnType === 'D' ? [0x0e, 0xaf] : returnType === 'F' ? [0x0b, 0xae] :
      returnType[0] === 'L' || returnType[0] === '[' ? [0x01, 0xb0] : [0x03, 0xac];
    if (method.name === '<init>' && superclass !== null) {
      code = [0x2a, 0xb7, ...u2(cp.method(superclass, '<init>', '()V')), 0xb1];
    }
    const payload = Buffer.concat([u2(2), u2(32), u4(code.length), Buffer.from(code), u2(0), u2(0)]);
    return Buffer.concat([u2(method.flags), u2(nameIndex), u2(descriptorIndex), u2(1),
      u2(cp.utf('Code')), u4(payload.length), payload]);
  });
  return Buffer.concat([Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0, 0, 0, 65]), u2(entries.length + 1), ...entries,
    u2(flags), u2(self), u2(parent), u2(interfaceIndices.length), ...interfaceIndices,
    u2(0), u2(encoded.length), ...encoded, u2(0)]);
}

function world() {
  const classes = [], loaders = [];
  function loader() {
    const loaded = new Map(), value = {
      getLoaderObject: () => value,
      getLoadedClass: name => loaded.get(name) || null,
      loadClass() { assert.fail('Pure method selection must not load classes'); }
    };
    value.bootstrap = loaders.length === 0 ? value : loaders[0];
    loaders.push(value);
    return {value, loaded};
  }
  const bootstrap = loader();
  let object;
  function define(name, {parent = object || null, interfaces = [], methods = [],
      iface = false, owner = bootstrap, link = true, flags = null} = {}) {
    const cls = new ReferenceClassData(classBytes({name,
      superclass: parent === null ? null : parent.getInternalName().slice(1, -1),
      interfaces: interfaces.map(value => value.getInternalName().slice(1, -1)),
      flags: flags === null ? (iface ? 0x601 : methods.some(method => (method.flags & ABSTRACT) !== 0) ? 0x421 : 0x21) : flags,
      methods}), null, owner.value);
    owner.loaded.set(cls.getInternalName(), cls);
    classes.push(cls);
    if (link) cls.setResolved(parent, interfaces);
    return cls;
  }
  object = define('java/lang/Object', {parent: null, methods: [methodSpec(PUBLIC, '<init>')]});
  return {define, loader, bootstrap, object, classes};
}
function declared(cls, signature = 'm()V') {
  const result = cls.getMethods().find(method => method.signature === signature);
  assert.ok(result, 'Fixture must declare ' + cls.getInternalName() + '.' + signature);
  return result;
}
function selected(cls, anchor, expected) {
  const result = cls.selectMethod(anchor);
  assert.equal(result.kind, 'selected');
  assert.equal(result.method, expected, 'Selection must retain the actual declaring Method object');
  return result;
}
function members(actual, expected) {
  assert.equal(actual.length, expected.length, 'No declaration is duplicated along diamond paths');
  assert.deepEqual(new Set(actual), new Set(expected));
}

test('fixtures contain parsed Method declarations with stable owner and slot identity', () => {
  const w = world(), cls = w.define('fixture/Parsed', {methods: [methodSpec(), methodSpec(PRIVATE, 'other')]});
  assert.ok(declared(cls) instanceof Method);
  assert.equal(declared(cls).cls, cls);
  assert.equal(declared(cls), cls.getMethodFromSlot(0));
  assert.equal(declared(cls, 'other()V'), cls.getMethodFromSlot(1));
  assert.equal(cls.isVerified(), false);
});

test('declared lookup works before hierarchy linking and never returns an inherited method', () => {
  const w = world(), parent = w.define('scope/Parent', {methods: [methodSpec()]});
  const child = w.define('scope/Child', {parent, link: false, methods: [methodSpec(PRIVATE, 'own')]});
  assert.equal(child.getDeclaredMethod('own()V'), declared(child, 'own()V'));
  assert.equal(child.getDeclaredMethod('m()V'), null);
  assert.equal(child.getDeclaredMethod('missing()V'), null);
  child.setResolved(parent, []);
  assert.equal(child.getDeclaredMethod('m()V'), null);
  assert.equal(child.getDeclaredMethod('own()V'), child.getMethodFromSlot(0));
});

test('override relation excludes private/static/initializer declarations on either side', () => {
  for (const [baseFlags, childFlags, name, expected] of [
    [PUBLIC, PUBLIC, 'm', true], [PROTECTED, PUBLIC, 'm', true], [0, PUBLIC, 'm', true],
    [PUBLIC, PRIVATE, 'm', false], [PRIVATE, PUBLIC, 'm', false], [PRIVATE, PRIVATE, 'm', false],
    [PUBLIC, PUBLIC | STATIC, 'm', false], [PUBLIC | STATIC, PUBLIC, 'm', false],
    [PUBLIC | STATIC, PUBLIC | STATIC, 'm', false],
    [PUBLIC, PUBLIC, '<init>', false], [STATIC, STATIC, '<clinit>', false]
  ]) {
    const w = world(), parent = w.define('scope/Base', {methods: [methodSpec(baseFlags, name)]});
    const child = w.define('scope/Child', {parent, methods: [methodSpec(childFlags, name)]});
    assert.equal(declared(child, name + '()V').canOverride(declared(parent, name + '()V')), expected,
      JSON.stringify({baseFlags, childFlags, name}));
  }
});

test('abstract and bridge instance methods participate in overrides, including final targets', () => {
  const w = world(), parent = w.define('scope/Base', {methods: [methodSpec(PUBLIC | FINAL)]});
  for (const flags of [PUBLIC | ABSTRACT, PUBLIC | 0x1040]) {
    const child = w.define('scope/Child' + flags, {parent, methods: [methodSpec(flags)]});
    // Final-method rejection consumes this relation at admission. Filtering
    // final targets here would make that separate check miss the override.
    assert.equal(declared(child).canOverride(declared(parent)), true);
  }
});

test('overrides require the complete name and descriptor including the return type', () => {
  const w = world(), parent = w.define('scope/Base', {methods: [methodSpec()]});
  const child = w.define('scope/Child', {parent, methods: [methodSpec(PUBLIC, 'other'),
    methodSpec(PUBLIC, 'm', '()I'), methodSpec(PUBLIC, 'm', '(I)V')]});
  for (const method of child.getMethods()) assert.equal(method.canOverride(declared(parent)), false);
});

test('runtime packages combine package spelling with the exact defining loader', () => {
  const w = world(), first = w.loader(), second = w.loader();
  const parent = w.define('same/Base', {owner: first, methods: [methodSpec()]});
  const packageParent = w.define('same/PackageBase', {owner: first, methods: [methodSpec(0)]});
  const same = w.define('same/Same', {owner: first, parent: packageParent, methods: [methodSpec()]});
  const foreign = w.define('same/Foreign', {owner: second, parent: packageParent, methods: [methodSpec()]});
  const publicChild = w.define('other/PublicChild', {owner: second, parent, methods: [methodSpec()]});
  assert.equal(declared(same).canOverride(declared(packageParent)), true);
  assert.equal(declared(foreign).canOverride(declared(packageParent)), false);
  assert.equal(declared(publicChild).canOverride(declared(parent)), true);
  selected(foreign, declared(packageParent), declared(packageParent));
  selected(foreign, declared(foreign), declared(foreign));
});

test('transitive package-private overriding searches beyond the nearest declaration', () => {
  const w = world(), a = w.define('p/A', {methods: [methodSpec(0)]});
  const b = w.define('p/B', {parent: a, methods: [methodSpec(PUBLIC)]});
  const c = w.define('p/C', {parent: b, methods: [methodSpec(0)]});
  const d = w.define('q/D', {parent: c, methods: [methodSpec(0)]});
  assert.equal(declared(d).canOverride(declared(a)), true);
  assert.equal(declared(d).canOverride(declared(b)), true);
  assert.equal(declared(d).canOverride(declared(c)), false);
  selected(d, declared(a), declared(d));
  selected(d, declared(c), declared(c));
  selected(d, declared(b), declared(d));
  selected(d, declared(c), declared(c)); // A signature-only cache would lose this distinction.
});

test('a same-spelling package in another loader cannot form a transitive override bridge', () => {
  const w = world(), first = w.loader(), second = w.loader();
  const a = w.define('p/A', {owner: first, methods: [methodSpec(0)]});
  const b = w.define('p/B', {owner: second, parent: a, methods: [methodSpec(PUBLIC)]});
  const c = w.define('q/C', {owner: second, parent: b, methods: [methodSpec(PUBLIC)]});
  assert.equal(declared(b).canOverride(declared(a)), false);
  assert.equal(declared(c).canOverride(declared(b)), true);
  assert.equal(declared(c).canOverride(declared(a)), false);
  selected(c, declared(a), declared(a));
});

test('a resolved private class method stays exact despite a public subclass shadow', () => {
  const w = world(), parent = w.define('scope/Base', {methods: [methodSpec(PRIVATE)]});
  const child = w.define('scope/Child', {parent, methods: [methodSpec()]});
  selected(child, declared(parent), declared(parent));
  selected(child, declared(child), declared(child));
});

test('a private subclass shadow does not displace an inherited virtual declaration', () => {
  const w = world(), parent = w.define('scope/Base', {methods: [methodSpec()]});
  const child = w.define('scope/Child', {parent, methods: [methodSpec(PRIVATE)]});
  selected(child, declared(parent), declared(parent));
  selected(child, declared(child), declared(child));
});

test('a public inherited class method can implement an interface absent from its declaring class', () => {
  const w = world(), first = w.loader(), second = w.loader(), receiverLoader = w.loader();
  const signature = 'm(Lpayload/Token;)Lpayload/Token;';
  const base = w.define('base/Base', {owner: first, methods: [methodSpec(PUBLIC, 'm', '(Lpayload/Token;)Lpayload/Token;')]});
  const iface = w.define('role/Role', {owner: second, iface: true,
    methods: [methodSpec(PUBLIC | ABSTRACT, 'm', '(Lpayload/Token;)Lpayload/Token;')]});
  const receiver = w.define('receiver/Impl', {owner: receiverLoader, parent: base, interfaces: [iface]});
  const target = declared(base, signature), anchor = declared(iface, signature);
  assert.equal(target.canOverride(anchor), true, 'Declaring Base need not implement Role');
  selected(receiver, anchor, target);
  assert.equal(target.cls.getLoader(), first.value, 'Preparation Rule 2 must use Base, not receiver, as owner');
  assert.equal(anchor.cls.getLoader(), second.value);
});

test('nearest abstract class declaration remains selected and blocks an interface default', () => {
  const w = world(), iface = w.define('scope/Role', {iface: true, methods: [methodSpec()]});
  const base = w.define('scope/Base', {methods: [methodSpec()]});
  const nearer = w.define('scope/AbstractBase', {parent: base, methods: [methodSpec(PUBLIC | ABSTRACT)]});
  const child = w.define('scope/Child', {parent: nearer, interfaces: [iface]});
  const result = selected(child, declared(iface), declared(nearer));
  assert.equal(result.method.accessFlags.isAbstract(), true);
  assert.equal(result.method.cls, nearer, 'Preparation still requires this exact declaring owner');
});

test('static class declarations are not selected instead of interface instance defaults', () => {
  const w = world(), iface = w.define('scope/Role', {iface: true, methods: [methodSpec()]});
  const child = w.define('scope/Child', {interfaces: [iface], methods: [methodSpec(PUBLIC | STATIC)]});
  selected(child, declared(iface), declared(iface));
});

test('an inherited diamond default occurs once by Method identity', () => {
  const w = world(), root = w.define('scope/Root', {iface: true, methods: [methodSpec()]});
  const left = w.define('scope/Left', {iface: true, interfaces: [root]});
  const right = w.define('scope/Right', {iface: true, interfaces: [root]});
  for (const interfaces of [[left, right], [right, left]]) {
    const child = w.define('scope/Child' + interfaces[0].getExternalName().split('.').pop(), {interfaces});
    members(child.getMaximallySpecificInterfaceMethods('m()V'), [declared(root)]);
    selected(child, declared(root), declared(root));
  }
});

test('a subinterface declaration wins independently of direct-interface order', () => {
  const w = world(), root = w.define('scope/Root', {iface: true, methods: [methodSpec()]});
  const branch = w.define('scope/Branch', {iface: true, interfaces: [root], methods: [methodSpec()]});
  const other = w.define('scope/Other', {iface: true, interfaces: [root]});
  for (const interfaces of [[branch, other], [other, branch]]) {
    const child = w.define('scope/Child' + interfaces[0].getExternalName().split('.').pop(), {interfaces});
    members(child.getMaximallySpecificInterfaceMethods('m()V'), [declared(branch)]);
    selected(child, declared(root), declared(branch));
  }
});

test('an abstract subinterface redeclaration masks its ancestor default', () => {
  const w = world(), root = w.define('scope/Root', {iface: true, methods: [methodSpec()]});
  const branch = w.define('scope/Branch', {iface: true, interfaces: [root], methods: [methodSpec(PUBLIC | ABSTRACT)]});
  const child = w.define('scope/Child', {interfaces: [root, branch]});
  members(child.getMaximallySpecificInterfaceMethods('m()V'), [declared(branch)]);
  const result = child.selectMethod(declared(root));
  assert.equal(result.kind, 'missing');
  members(result.candidates, [declared(branch)]);
});

test('one concrete maximal interface method is selected beside unrelated abstract candidates', () => {
  const w = world(), body = w.define('scope/Body', {iface: true, methods: [methodSpec()]});
  const one = w.define('scope/One', {iface: true, methods: [methodSpec(PUBLIC | ABSTRACT)]});
  const two = w.define('scope/Two', {iface: true, methods: [methodSpec(PUBLIC | ABSTRACT)]});
  for (const interfaces of [[one, body, two], [two, body, one]]) {
    const child = w.define('scope/Child' + interfaces[0].getExternalName().split('.').pop(), {interfaces});
    members(child.getMaximallySpecificInterfaceMethods('m()V'), [declared(one), declared(body), declared(two)]);
    selected(child, declared(one), declared(body));
  }
});

test('unrelated maximal defaults return a conflict without choosing the resolved interface', () => {
  const w = world(), left = w.define('scope/Left', {iface: true, methods: [methodSpec()]});
  const right = w.define('scope/Right', {iface: true, methods: [methodSpec()]});
  for (const interfaces of [[left, right], [right, left]]) {
    const child = w.define('scope/Child' + interfaces[0].getExternalName().split('.').pop(), {interfaces});
    for (const anchor of [declared(left), declared(right)]) {
      const result = child.selectMethod(anchor);
      assert.equal(result.kind, 'conflict');
      members(result.candidates, [declared(left), declared(right)]);
    }
  }
});

test('private and static interface shadows neither inherit nor hide ancestor instance defaults', () => {
  const w = world(), root = w.define('scope/Root', {iface: true, methods: [methodSpec()]});
  for (const flags of [PRIVATE, PUBLIC | STATIC]) {
    const branch = w.define('scope/Branch' + flags, {iface: true, interfaces: [root], methods: [methodSpec(flags)]});
    const child = w.define('scope/Child' + flags, {interfaces: [branch]});
    members(child.getMaximallySpecificInterfaceMethods('m()V'), [declared(root)]);
    selected(child, declared(root), declared(root));
    if (flags === PRIVATE) selected(child, declared(branch), declared(branch));
  }
});

test('all-abstract interface candidates remain missing rather than arbitrarily selected', () => {
  const w = world(), one = w.define('scope/One', {iface: true, methods: [methodSpec(PUBLIC | ABSTRACT)]});
  const two = w.define('scope/Two', {iface: true, methods: [methodSpec(PUBLIC | ABSTRACT)]});
  const child = w.define('scope/Child', {interfaces: [one, two]});
  const result = child.selectMethod(declared(one));
  assert.equal(result.kind, 'missing');
  members(result.candidates, [declared(one), declared(two)]);
});

test('same-named interface declarations from different loaders do not collapse into one diamond', () => {
  const w = world(), first = w.loader(), second = w.loader();
  const a = w.define('same/Role', {owner: first, iface: true, methods: [methodSpec()]});
  const b = w.define('same/Role', {owner: second, iface: true, methods: [methodSpec()]});
  const left = w.define('scope/Left', {iface: true, interfaces: [a]});
  const right = w.define('scope/Right', {iface: true, interfaces: [b]});
  const child = w.define('scope/Child', {interfaces: [left, right]});
  assert.notEqual(declared(a), declared(b));
  assert.equal(declared(a).fullSignature, declared(b).fullSignature);
  members(child.getMaximallySpecificInterfaceMethods('m()V'), [declared(a), declared(b)]);
  const result = child.selectMethod(declared(a));
  assert.equal(result.kind, 'conflict');
  members(result.candidates, [declared(a), declared(b)]);
});

test('pure method queries never resolve, verify, initialize or load descriptor types', () => {
  const w = world(), signature = 'm(Lmissing/Token;)Lmissing/Token;';
  const iface = w.define('scope/Role', {iface: true,
    methods: [methodSpec(PUBLIC | ABSTRACT, 'm', '(Lmissing/Token;)Lmissing/Token;')]});
  const parent = w.define('scope/Base', {methods: [methodSpec(PUBLIC, 'm', '(Lmissing/Token;)Lmissing/Token;')]});
  const child = w.define('scope/Child', {parent, interfaces: [iface]});
  for (const cls of w.classes) {
    for (const name of ['resolve', 'tryToResolve', 'initialize', 'tryToInitialize']) {
      cls[name] = () => assert.fail('Pure method query called ' + name);
    }
    cls.verification.verify = cls.verification.tryToVerify = () => assert.fail('Pure method query verified a class');
  }
  assert.equal(child.getDeclaredMethod(signature), null);
  assert.equal(declared(parent, signature).canOverride(declared(iface, signature)), true);
  selected(child, declared(iface, signature), declared(parent, signature));
  members(child.getMaximallySpecificInterfaceMethods(signature), [declared(iface, signature)]);
});

test('symbolic lookup excludes inherited initializers and private/static interface declarations', () => {
  const w = world(), parent = w.define('scope/Base', {methods: [methodSpec(PUBLIC, '<init>')]});
  const iface = w.define('scope/Role', {iface: true,
    methods: [methodSpec(PRIVATE, 'privateBody'), methodSpec(PUBLIC | STATIC, 'staticBody')]});
  const child = w.define('scope/Child', {parent, interfaces: [iface]});
  assert.equal(child.methodLookup('<init>()V'), null);
  assert.equal(child.methodLookup('privateBody()V'), null);
  assert.equal(child.methodLookup('staticBody()V'), null);
  assert.equal(iface.methodLookup('privateBody()V'), declared(iface, 'privateBody()V'));
  assert.equal(iface.methodLookup('staticBody()V'), declared(iface, 'staticBody()V'));
});

test('VM indices retain distinct declaration anchors for transitive override selection', () => {
  const w = world(), a = w.define('p/A', {methods: [methodSpec(0)]});
  const b = w.define('p/B', {parent: a, methods: [methodSpec(PUBLIC)]});
  const c = w.define('p/C', {parent: b, methods: [methodSpec(0)]});
  const d = w.define('q/D', {parent: c, methods: [methodSpec(0), methodSpec(PRIVATE, 'privateBody')]});
  const aIndex = d.getVMIndexForMethod(declared(a)), cIndex = d.getVMIndexForMethod(declared(c));
  assert.ok(aIndex >= 0 && cIndex >= 0);
  assert.notEqual(aIndex, cIndex);
  assert.equal(d.getMethodFromVMIndex(aIndex), declared(d));
  assert.equal(d.getMethodFromVMIndex(cIndex), declared(c));
  assert.equal(d.getMethodFromVMIndex(d.getVMIndexForMethod(declared(d, 'privateBody()V'))),
    declared(d, 'privateBody()V'));
});

test('private instance VM indices retain distinct declaration identities without virtual overrides', () => {
  const w = world(), base = w.define('scope/PrivateBase', {methods: [methodSpec(PRIVATE)]});
  const child = w.define('scope/PrivateChild', {parent: base, methods: [methodSpec(PRIVATE)]});
  const shadow = w.define('scope/PublicShadow', {parent: child, methods: [methodSpec(PUBLIC)]});
  const baseMethod = declared(base), childMethod = declared(child), shadowMethod = declared(shadow);
  const baseIndex = base.getVMIndexForMethod(baseMethod), childIndex = child.getVMIndexForMethod(childMethod);
  assert.ok(baseIndex >= 0 && childIndex >= 0);
  assert.notEqual(baseIndex, childIndex);
  for (const cls of [base, child, shadow]) assert.equal(cls.getMethodFromVMIndex(baseIndex), baseMethod);
  assert.equal(shadow.getMethodFromVMIndex(childIndex), childMethod);
  assert.equal(shadow.getMethodFromVMIndex(shadow.getVMIndexForMethod(shadowMethod)), shadowMethod);
  assert.equal(childMethod.canOverride(baseMethod), false);
  assert.equal(shadowMethod.canOverride(baseMethod), false);
  const excluded = w.define('scope/NonInstance', {methods: [methodSpec(PRIVATE | STATIC), methodSpec(PUBLIC, '<init>')]});
  assert.equal(excluded.getVMIndexForMethod(declared(excluded)), -1);
  assert.equal(excluded.getVMIndexForMethod(declared(excluded, '<init>()V')), -1);
});

test('private MemberName refresh preserves access flags and a valid index before exact bridge invocation', () => {
  const w = world(), base = w.define('scope/PrivateHandleBase', {methods: [methodSpec(PRIVATE)]});
  const child = w.define('scope/PrivateHandleChild', {parent: base, methods: [methodSpec(PUBLIC)]});
  const flags = (5 << 24) | 0x10000 | PRIVATE, member = {
    'java/lang/invoke/MemberName/flags': flags,
    'java/lang/invoke/MemberName/clazz': {$cls: base},
    'java/lang/invoke/MemberName/name': {toString: () => 'm'},
    'java/lang/invoke/MemberName/type': {toString: () => '()V'}
  };
  const owner = invocationThread(), receiver = {getClass: () => child};
  load('method_handles').refreshMemberNameMethodTarget(owner, member);
  assert.equal(member['java/lang/invoke/MemberName/flags'], flags, 'VM metadata must not grant private access');
  assert.ok(member.vmindex >= 0, 'Java MemberName validates dispatch metadata before Lookup access checks');
  assert.equal(base.getMethodFromVMIndex(member.vmindex), declared(base));
  member.vmtarget(owner, '(Lscope/PrivateHandleBase;)V', [receiver]);
  assert.equal(owner.stack[0].method, declared(base), 'A public subclass shadow must not replace the private declaration');
});

function overlay(cls, flags = PUBLIC, name = 'overlay') {
  const Flags = require(path.join(runtime, 'src/util')).Flags;
  return {cls, slot: -1, name, signature: name + '()V', rawDescriptor: '()V',
    fullSignature: cls.getInternalName().slice(1, -1) + '/' + name + '()V',
    accessFlags: new Flags(flags | 0x100), parameterTypes: [], returnType: 'V'};
}

test('VM overlays require explicit registration and retain one canonical declaring identity', () => {
  const w = world(), parent = w.define('scope/Base'), child = w.define('scope/Child', {parent});
  const first = overlay(parent), second = overlay(parent);
  assert.equal(child.selectMethod(first).kind, 'missing', 'No arbitrary missing-method fallback');
  assert.equal(parent.registerVMMethod(first), first);
  assert.equal(parent.registerVMMethod(second), first);
  selected(child, first, first);
  assert.equal(parent.methodLookup('overlay()V'), first);
  assert.equal(parent.getDeclaredMethod('overlay()V'), null);
  assert.deepEqual(parent.getMethods(), [], 'VM overlays must not become class-file/reflection declarations');
  const overriding = w.define('scope/Override', {parent, methods: [methodSpec(PUBLIC, 'overlay')]});
  selected(overriding, first, declared(overriding, 'overlay()V'));
});

test('registered interface overlays honor private/static exclusions and subclass precedence', () => {
  const w = world(), iface = w.define('scope/Role', {iface: true}), child = w.define('scope/Child', {interfaces: [iface]});
  const body = iface.registerVMMethod(overlay(iface)), privateBody = iface.registerVMMethod(overlay(iface, PRIVATE, 'privateBody'));
  iface.registerVMMethod(overlay(iface, PUBLIC | STATIC, 'staticBody'));
  selected(child, body, body);
  selected(child, privateBody, privateBody);
  members(child.getMaximallySpecificInterfaceMethods('overlay()V'), [body]);
  members(child.getMaximallySpecificInterfaceMethods('privateBody()V'), []);
  members(child.getMaximallySpecificInterfaceMethods('staticBody()V'), []);
  assert.equal(child.methodLookup('privateBody()V'), null);
  assert.equal(child.methodLookup('staticBody()V'), null);
  const overriding = w.define('scope/Override', {interfaces: [iface], methods: [methodSpec(PUBLIC, 'overlay')]});
  selected(overriding, body, declared(overriding, 'overlay()V'));
});

function invocationThread() {
  return {stack: [], errors: [], status: 0,
    getJVM: () => ({shouldDumpCompiledCode: () => false}),
    setStatus(status) { this.status = status; },
    throwNewException(name, message) { this.errors.push({name, message}); }};
}

test('exact invocation schedules the captured declaration without consulting receiver aliases', () => {
  const w = world(), base = w.define('scope/Base', {methods: [methodSpec()]});
  const child = w.define('scope/Child', {parent: base, methods: [methodSpec()]});
  const owner = invocationThread(), receiver = {getClass: () => child,
    'm()V': () => assert.fail('Exact invocation used a virtual property'),
    'scope/Base/m()V': () => assert.fail('Exact invocation used a text-keyed owner property')};
  assert.equal(load('methods').invokeExactMethod(owner, declared(base), receiver, []), true);
  assert.equal(owner.stack.length, 1);
  assert.equal(owner.stack[0].method, declared(base));
  assert.deepEqual(owner.stack[0].locals, [receiver]);
});

test('virtual invocation anchors selection to the resolved Method and preserves word-slot arguments', () => {
  const w = world(), descriptor = '(JD)V', signature = 'm' + descriptor;
  const a = w.define('p/A', {methods: [methodSpec(0, 'm', descriptor)]});
  const b = w.define('p/B', {parent: a, methods: [methodSpec(PUBLIC, 'm', descriptor)]});
  const c = w.define('p/C', {parent: b, methods: [methodSpec(0, 'm', descriptor)]});
  const d = w.define('q/D', {parent: c, methods: [methodSpec(0, 'm', descriptor)]});
  const receiver = {getClass: () => d, [signature]: () => assert.fail('Selection used the ambiguous alias')};
  for (const [anchor, target] of [[declared(a, signature), declared(d, signature)], [declared(c, signature), declared(c, signature)]]) {
    const owner = invocationThread(), wide = {}, args = [wide, null, 2.5, null];
    assert.equal(load('methods').invokeVirtualMethod(owner, anchor, receiver, args), true);
    assert.equal(owner.stack[0].method, target);
    assert.deepEqual(owner.stack[0].locals, [receiver, wide, null, 2.5, null]);
    assert.deepEqual(args, [wide, null, 2.5, null]);
  }
});

test('virtual invocation reports abstract and default-conflict errors before creating a target frame', () => {
  const w = world(), one = w.define('scope/One', {iface: true, methods: [methodSpec()]});
  const two = w.define('scope/Two', {iface: true, methods: [methodSpec()]});
  const abstract = w.define('scope/Abstract', {methods: [methodSpec(PUBLIC | ABSTRACT)]});
  const masked = w.define('scope/Masked', {parent: abstract, interfaces: [one]});
  const conflict = w.define('scope/Conflict', {interfaces: [one, two]});
  for (const [cls, expected] of [[masked, 'Ljava/lang/AbstractMethodError;'], [conflict, 'Ljava/lang/IncompatibleClassChangeError;']]) {
    const owner = invocationThread();
    assert.equal(load('methods').invokeVirtualMethod(owner, declared(one), {getClass: () => cls}, []), false);
    assert.equal(owner.errors[0].name, expected);
    assert.deepEqual(owner.stack, []);
  }
});

test('virtual MethodHandle bridges capture the resolved declaration and special bridges remain exact', () => {
  const w = world(), base = w.define('scope/Base', {methods: [methodSpec(PRIVATE)]});
  const child = w.define('scope/Child', {parent: base, methods: [methodSpec()]});
  const receiver = {getClass: () => child, 'm()V': () => assert.fail('Bridge used a receiver alias'),
    'scope/Base/m()V': () => assert.fail('Special bridge used a same-name property')};
  for (const kind of [5, 7]) {
    const owner = invocationThread(), bridge = declared(base).getVMTargetBridgeMethod(owner, kind);
    bridge(owner, '(Lscope/Base;)V', [receiver]);
    assert.equal(owner.stack[0].method, declared(base));
  }
});

function dispatchFixture() {
  const w = world(), base = w.define('scope/Base', {methods: [methodSpec()]});
  const child = w.define('scope/Child', {parent: base, methods: [methodSpec(PRIVATE)]});
  const receiver = {getClass: () => child, 'm()V': () => assert.fail('Invocation used a receiver alias')};
  const reference = {method: declared(base), signature: 'm()V', paramWordSize: 0, classInfo: {cls: base}};
  const pool = {get: () => reference, getUnchecked: () => reference};
  const frame = {pc: 0, returnToThreadLoop: false, method: {cls: {constantPool: pool}},
    opStack: new (load('threading').PreAllocatedStack)(1)};
  frame.opStack.push(receiver);
  return {w, base, child, receiver, reference, frame, owner: invocationThread()};
}

test('the fast virtual interpreter uses resolved declaration identity instead of a receiver alias', () => {
  const {base, frame, owner} = dispatchFixture();
  const {OpCode} = require(path.join(runtime, 'src/enums'));
  load('opcodes').Opcodes.invokevirtual_fast(owner, frame, Buffer.from([OpCode.INVOKEVIRTUAL_FAST, 0, 1]));
  assert.equal(owner.stack[0].method, declared(base));
  assert.equal(frame.returnToThreadLoop, true);
});

test('the emitted virtual JIT call shares exact resolved-method selection with the interpreter', () => {
  const {base, reference, frame, owner} = dispatchFixture();
  const {OpCode} = require(path.join(runtime, 'src/enums'));
  const caller = declared(base), code = Buffer.from([OpCode.INVOKEVIRTUAL_FAST, 0, 1]);
  caller.cls.constantPool.get = () => reference;
  const info = caller.makeInvokeVirtualJitInfo(code, 0);
  const emitted = info.emit([], [], 'probe', 'f.jitCompleted = true;', code, 0, [], caller);
  const invoke = new Function('f', 't', 'u', 'invokeVirtualMethod', emitted);
  invoke(frame, owner, require(path.join(runtime, 'src/util')), load('methods').invokeVirtualMethod);
  assert.equal(owner.stack[0].method, declared(base));
  assert.equal(frame.returnToThreadLoop, true);
  assert.equal(frame.jitCompleted, true);
});

test('array receivers select Object declarations through their exact bootstrap superclass', () => {
  const w = world(), object = w.define('java/lang/Object', {parent: null,
    methods: [methodSpec(PUBLIC, 'hashCode', '()I')]});
  const impostor = w.define('java/lang/Object', {parent: null, owner: w.loader(),
    methods: [methodSpec(PUBLIC, 'hashCode', '()I')]});
  const component = w.define('scope/Element', {parent: object});
  const array = new ArrayClassData(component.getInternalName(), component.getLoader());
  array.setResolved(object, component);
  const receiver = {getClass: () => array,
    'hashCode()I': () => assert.fail('Array invocation used an ambiguous property')};
  const owner = invocationThread(), target = declared(object, 'hashCode()I');
  assert.equal(load('methods').invokeVirtualMethod(owner, target, receiver, []), true);
  assert.equal(owner.stack[0].method, target);
  assert.notEqual(owner.stack[0].method, declared(impostor, 'hashCode()I'));
  assert.deepEqual(owner.stack[0].locals, [receiver]);
});

function fixtureConstructor(w, cls) {
  // Isolate generated JavaScript wrappers from the unrelated class gates. No
  // class body executes here: assertions inspect only the scheduled frame.
  for (const candidate of w.classes) candidate.isResolved = () => true;
  return cls.getConstructor(null);
}

test('generated virtual wrappers select from their captured declaration while full names remain exact', () => {
  const w = world(), base = w.define('scope/Base', {methods: [methodSpec()]});
  const child = w.define('scope/Child', {parent: base, methods: [methodSpec()]});
  const Child = fixtureConstructor(w, child), Base = fixtureConstructor(w, base);
  const receiver = new Child(null), virtual = invocationThread(), exact = invocationThread();
  Base.prototype['m()V'].call(receiver, virtual, []);
  Base.prototype['scope/Base/m()V'].call(receiver, exact, []);
  assert.equal(virtual.stack[0].method, declared(child));
  assert.equal(exact.stack[0].method, declared(base));
});

test('generated interface aliases defer default conflicts and missing bodies to invocation', () => {
  for (const flags of [PUBLIC, PUBLIC | ABSTRACT]) {
    const w = world(), one = w.define('scope/One', {iface: true, methods: [methodSpec(flags)]});
    const two = w.define('scope/Two', {iface: true, methods: [methodSpec(flags)]});
    const child = w.define('scope/Child', {interfaces: [one, two]});
    const Child = fixtureConstructor(w, child), receiver = new Child(null), owner = invocationThread();
    assert.equal(typeof receiver['m()V'], 'function');
    receiver['m()V'](owner, []);
    assert.equal(owner.errors[0].name, flags === PUBLIC ?
      'Ljava/lang/IncompatibleClassChangeError;' : 'Ljava/lang/AbstractMethodError;');
    assert.deepEqual(owner.stack, []);
  }
});

test('generated aliases support explicitly registered structural VM methods without changing parsed declarations', () => {
  const w = world(), iface = w.define('scope/Role', {iface: true}), child = w.define('scope/Child', {interfaces: [iface]});
  const native = overlay(iface);
  native.getNativeFunction = () => () => undefined;
  iface.registerVMMethod(native);
  const Child = fixtureConstructor(w, child), receiver = new Child(null), owner = invocationThread();
  assert.equal(typeof receiver['overlay()V'], 'function');
  receiver['overlay()V'](owner, []);
  assert.equal(owner.stack[0].method, native);
  assert.deepEqual(iface.getMethods(), []);
  assert.equal(iface.getDeclaredMethod('overlay()V'), null);
});

test('reflective instance invocation uses the reflected declaration slot and one callback frame', () => {
  const w = world(), base = w.define('scope/Base', {methods: [methodSpec(PRIVATE)]});
  const child = w.define('scope/Child', {parent: base, methods: [methodSpec()]});
  const receiver = {getClass: () => child, 'm()V': () => assert.fail('Reflection used a receiver alias')};
  const reflected = {'java/lang/reflect/Method/clazz': {$cls: base},
    'java/lang/reflect/Method/slot': declared(base).slot,
    'java/lang/reflect/Method/returnType': {$cls: {getInternalName: () => 'V'}}};
  const native = load('natives/sun_reflect').default()['sun/reflect/NativeMethodAccessorImpl'];
  const owner = invocationThread();
  native['invoke0(Ljava/lang/reflect/Method;Ljava/lang/Object;[Ljava/lang/Object;)Ljava/lang/Object;'](
    owner, reflected, receiver, null);
  assert.equal(owner.stack.length, 2);
  assert.ok(owner.stack[0] instanceof load('threading').InternalStackFrame);
  assert.equal(owner.stack[1].method, declared(base));
  assert.deepEqual(owner.stack[1].locals, [receiver]);
});

test('interface invocation retains receiver-membership and selected-method visibility checks', () => {
  const w = world(), iface = w.define('scope/Role', {iface: true, methods: [methodSpec()]});
  const unrelated = w.define('scope/Unrelated', {methods: [methodSpec()]});
  const inaccessible = w.define('scope/Inaccessible', {interfaces: [iface], methods: [methodSpec(PROTECTED)]});
  for (const [cls, error] of [[unrelated, 'Ljava/lang/IncompatibleClassChangeError;'],
    [inaccessible, 'Ljava/lang/IllegalAccessError;']]) {
    const owner = invocationThread();
    assert.equal(load('methods').invokeVirtualMethod(owner, declared(iface), {getClass: () => cls}, [], undefined, iface), false);
    assert.equal(owner.errors[0].name, error);
    assert.deepEqual(owner.stack, []);
  }
});

test('nonvirtual interpreter dispatch retains exact identity instead of a colliding owner-name alias', () => {
  const {base, reference, frame, owner, receiver} = dispatchFixture();
  const {OpCode} = require(path.join(runtime, 'src/enums'));
  frame.method = declared(base);
  base.constantPool.getUnchecked = () => reference;
  reference.fullSignature = reference.method.fullSignature;
  receiver[reference.fullSignature] = () => assert.fail('Special invocation used a same-name owner alias');
  load('opcodes').Opcodes.invokenonvirtual_fast(owner, frame, Buffer.from([OpCode.INVOKENONVIRTUAL_FAST, 0, 1]));
  assert.equal(owner.stack[0].method, declared(base));
  assert.equal(frame.returnToThreadLoop, true);
});

test('nonvirtual emitted JIT dispatch retains the exact Method target', () => {
  const {base, reference, frame, owner, receiver} = dispatchFixture();
  const {OpCode} = require(path.join(runtime, 'src/enums'));
  reference.fullSignature = reference.method.fullSignature;
  receiver[reference.fullSignature] = () => assert.fail('Special JIT invocation used an owner-name alias');
  const caller = declared(base), code = Buffer.from([OpCode.INVOKENONVIRTUAL_FAST, 0, 1]);
  caller.cls.constantPool.get = () => reference;
  frame.method = caller;
  const emitted = caller.makeInvokeNonVirtualJitInfo(code, 0).emit([], [], 'probe',
    'f.jitCompleted = true;', code, 0, [], caller);
  const invoke = new Function('f', 't', 'u', 'invokeExactMethod', 'invokeSpecialMethod', emitted);
  invoke(frame, owner, {isNull: load('opcodes').isNull},
    load('methods').invokeExactMethod, load('methods').invokeSpecialMethod);
  assert.equal(owner.stack[0].method, declared(base));
  assert.equal(frame.jitCompleted, true);
});

// Special selection is deliberately separate from virtual override selection.
// These units inspect parsed declarations and scheduled frames, not verified
// execution or native behavior of the deliberately constructed hierarchies.
function specialSelected(caller, symbolicOwner, resolved, expected) {
  assert.equal(typeof caller.selectSpecialMethod, 'function', 'Missing metadata-only special selector');
  const result = caller.selectSpecialMethod(symbolicOwner, resolved);
  assert.equal(result.kind, 'selected');
  assert.equal(result.method === expected, true, 'Special selection must retain the exact Method identity');
  return result;
}

test('special selection restarts at the direct superclass of the caller, not the resolved declaration', () => {
  const w = world(), base = w.define('special/Base', {methods: [methodSpec()]});
  const parent = w.define('special/Parent', {parent: base, methods: [methodSpec()]});
  const caller = w.define('special/Caller', {parent, methods: [methodSpec()]});
  specialSelected(caller, base, declared(base), declared(parent));
  specialSelected(caller, caller, declared(caller), declared(caller));
  assert.equal(caller.selectMethod(declared(base)).method === declared(caller), true,
    'The fixture distinguishes special and virtual selection');
});

test('special selection treats ACC_SUPER as set even when its class-file bit is clear', () => {
  const w = world(), base = w.define('special/Base', {methods: [methodSpec()]});
  const parent = w.define('special/Parent', {parent: base, methods: [methodSpec()]});
  const caller = w.define('special/Caller', {parent, flags: PUBLIC});
  assert.equal(caller.accessFlags.isSuper(), false, 'The parsed fixture really omits ACC_SUPER');
  specialSelected(caller, base, declared(base), declared(parent));
});

test('special class lookup is instance declaration lookup, not an override predicate', () => {
  const w = world(), base = w.define('first/Base', {methods: [methodSpec(0)]});
  const parent = w.define('other/Parent', {parent: base, methods: [methodSpec()]});
  const caller = w.define('other/Caller', {parent});
  assert.equal(declared(parent).canOverride(declared(base)), false);
  // CP access is a separate prior gate; only the specified selection query is
  // exercised for this otherwise inaccessible symbolic-reference fixture.
  specialSelected(caller, base, declared(base), declared(parent));
  const staticParent = w.define('special/StaticParent', {parent: base, methods: [methodSpec(PUBLIC | STATIC)]});
  const staticCaller = w.define('special/StaticCaller', {parent: staticParent});
  specialSelected(staticCaller, base, declared(base), declared(base));
});

test('special superclass lookup selects one concrete default and reports conflicts or missing bodies', () => {
  const w = world(), one = w.define('special/One', {iface: true, methods: [methodSpec()]});
  const two = w.define('special/Two', {iface: true, methods: [methodSpec()]});
  const abstract = w.define('special/Abstract', {iface: true, methods: [methodSpec(PUBLIC | ABSTRACT)]});
  const single = w.define('special/Single', {interfaces: [one, abstract]});
  const conflict = w.define('special/Conflict', {interfaces: [one, two]});
  const missing = w.define('special/Missing', {interfaces: [abstract]});
  const singleCaller = w.define('special/SingleCaller', {parent: single});
  specialSelected(singleCaller, single, declared(one), declared(one));
  for (const [parent, resolved, expected, count] of [
    [conflict, declared(one), 'conflict', 2], [missing, declared(abstract), 'missing', 1]
  ]) {
    const caller = w.define('special/Caller' + expected, {parent});
    assert.equal(typeof caller.selectSpecialMethod, 'function', 'Missing special selector');
    const result = caller.selectSpecialMethod(parent, resolved);
    assert.equal(result.kind, expected);
    assert.equal(result.candidates.length, count);
  }
});

test('special class declarations mask defaults even when the selected declaration is abstract', () => {
  const w = world(), iface = w.define('special/Role', {iface: true, methods: [methodSpec()]});
  const parent = w.define('special/AbstractParent', {interfaces: [iface], methods: [methodSpec(PUBLIC | ABSTRACT)]});
  const caller = w.define('special/Caller', {parent});
  specialSelected(caller, parent, declared(iface), declared(parent));
});

test('interface-special selection stays on the symbolic interface rather than the caller defaults', () => {
  const w = world(), root = w.define('special/Root', {iface: true, methods: [methodSpec()]});
  const inherited = w.define('special/Inherited', {iface: true, interfaces: [root]});
  const other = w.define('special/Other', {iface: true, methods: [methodSpec()]});
  const caller = w.define('special/Caller', {interfaces: [inherited, other], methods: [methodSpec()]});
  specialSelected(caller, inherited, declared(root), declared(root));
  specialSelected(caller, other, declared(other), declared(other));
  const reabstract = w.define('special/Reabstract', {iface: true, interfaces: [root], methods: [methodSpec(PUBLIC | ABSTRACT)]});
  specialSelected(caller, reabstract, declared(reabstract), declared(reabstract));
});

test('special maximal interface selection deduplicates diamonds and respects reabstraction', () => {
  const w = world(), root = w.define('special/Root', {iface: true, methods: [methodSpec()]});
  const left = w.define('special/Left', {iface: true, interfaces: [root]});
  const right = w.define('special/Right', {iface: true, interfaces: [root]});
  const diamond = w.define('special/Diamond', {interfaces: [left, right]});
  const caller = w.define('special/Caller', {parent: diamond});
  specialSelected(caller, diamond, declared(root), declared(root));
  const abstract = w.define('special/Reabstract', {iface: true, interfaces: [root], methods: [methodSpec(PUBLIC | ABSTRACT)]});
  const blocked = w.define('special/Blocked', {interfaces: [abstract, right]});
  const blockedCaller = w.define('special/BlockedCaller', {parent: blocked});
  assert.equal(blockedCaller.selectSpecialMethod(blocked, declared(root)).kind, 'missing');
});

test('interface-special Object fallback uses the actual bootstrap public instance declaration', () => {
  const w = world(), object = w.define('java/lang/Object', {parent: null,
    methods: [methodSpec(PUBLIC, 'm'), methodSpec(PROTECTED, 'hidden')]});
  const foreign = w.define('java/lang/Object', {parent: null, owner: w.loader(), methods: [methodSpec()]});
  const iface = w.define('special/Role', {iface: true, parent: object});
  const caller = w.define('special/Caller', {parent: object, interfaces: [iface]});
  specialSelected(caller, iface, declared(object), declared(object));
  assert.equal(caller.selectSpecialMethod(iface, declared(object)).method === declared(foreign), false);
  assert.equal(caller.selectSpecialMethod(iface, declared(object, 'hidden()V')).kind, 'missing');
});

test('special private and constructor calls retain the exact declaration instead of a shadow', () => {
  const w = world(), base = w.define('special/Base', {methods: [methodSpec(PUBLIC, '<init>')]});
  const parent = w.define('special/Parent', {parent: base, methods: [methodSpec(PUBLIC, '<init>')]});
  const caller = w.define('special/Caller', {parent, methods: [methodSpec(PRIVATE)]});
  const target = w.define('special/NestTarget', {methods: [methodSpec(PRIVATE)]});
  specialSelected(caller, caller, declared(caller), declared(caller));
  specialSelected(caller, target, declared(target), declared(target));
  specialSelected(caller, base, declared(base, '<init>()V'), declared(base, '<init>()V'));
});

test('special superclass recognition compares class identity, not binary-name spelling', () => {
  const w = world(), first = w.loader(), second = w.loader();
  const base = w.define('same/Base', {owner: first, methods: [methodSpec()]});
  const parent = w.define('same/Parent', {owner: first, parent: base, methods: [methodSpec()]});
  const caller = w.define('same/Caller', {owner: first, parent});
  const foreign = w.define('same/Base', {owner: second, methods: [methodSpec()]});
  // A real instruction must also pass verifier owner/access checks. This pure
  // identity query must not mistake a foreign class for the actual ancestor.
  specialSelected(caller, base, declared(base), declared(parent));
  specialSelected(caller, foreign, declared(foreign), declared(foreign));
});

test('special metadata selection does not load, verify, prepare or initialize classes', () => {
  const w = world(), iface = w.define('special/Role', {iface: true, methods: [methodSpec()]});
  const parent = w.define('special/Parent', {interfaces: [iface]});
  const caller = w.define('special/Caller', {parent});
  for (const cls of w.classes) {
    assert.equal(cls.isVerified(), false);
    assert.equal(cls.isPrepared(), false);
    for (const operation of ['resolve', 'tryToResolve', 'verify', 'initialize', 'getConstructor']) {
      cls[operation] = () => assert.fail('Special selection attempted ' + operation);
    }
  }
  specialSelected(caller, parent, declared(iface), declared(iface));
  for (const cls of w.classes) {
    assert.equal(cls.isVerified(), false);
    assert.equal(cls.isPrepared(), false);
  }
});

function specialDispatchFixture({conflict = false, descriptor = '()V'} = {}) {
  const w = world(), signature = 'm' + descriptor;
  let symbolicOwner, resolved, expected;
  if (conflict) {
    const one = w.define('special/One', {iface: true, methods: [methodSpec(PUBLIC, 'm', descriptor)]});
    const two = w.define('special/Two', {iface: true, methods: [methodSpec(PUBLIC, 'm', descriptor)]});
    symbolicOwner = w.define('special/Parent', {interfaces: [one, two]});
    resolved = symbolicOwner.methodLookup(signature);
    expected = null;
  } else {
    symbolicOwner = w.define('special/Base', {methods: [methodSpec(PUBLIC, 'm', descriptor)]});
    resolved = declared(symbolicOwner, signature);
  }
  const parent = conflict ? symbolicOwner : w.define('special/Parent', {
    parent: symbolicOwner, methods: [methodSpec(PUBLIC, 'm', descriptor)]});
  if (!conflict) expected = declared(parent, signature);
  const caller = w.define('special/Caller', {parent, methods: [methodSpec(PUBLIC, 'run')]});
  const child = w.define('special/Receiver', {parent: caller, methods: [methodSpec(PUBLIC, 'm', descriptor)]});
  const receiver = {getClass: () => child,
    [signature]: () => assert.fail('Special invocation used virtual receiver dispatch'),
    [resolved.fullSignature]: () => assert.fail('Special invocation used a text-keyed declaration alias')};
  const args = descriptor === '(JD)V' ? [{wide: true}, null, 3.25, null] : [];
  const reference = Object.freeze({method: resolved, signature, paramWordSize: args.length,
    fullSignature: resolved.fullSignature, classInfo: Object.freeze({cls: symbolicOwner}), isResolved: () => true});
  caller.constantPool.get = caller.constantPool.getUnchecked = () => reference;
  const callerMethod = declared(caller, 'run()V');
  const frame = {pc: 0, returnToThreadLoop: false, method: callerMethod,
    opStack: new (load('threading').PreAllocatedStack)(args.length + 1)};
  frame.opStack.push(receiver);
  for (const argument of args) frame.opStack.push(argument);
  return {w, caller, callerMethod, symbolicOwner, resolved, expected, receiver, args, reference, frame,
    owner: invocationThread()};
}

function invokeSpecial(fixture, receiver = fixture.receiver) {
  const invoke = load('methods').invokeSpecialMethod;
  assert.equal(typeof invoke, 'function', 'Missing shared special invocation helper');
  return invoke(fixture.owner, fixture.caller, fixture.symbolicOwner, fixture.resolved, receiver, fixture.args);
}

function checkSpecialFrame(fixture) {
  assert.equal(fixture.owner.errors.length, 0);
  assert.equal(fixture.owner.stack.length, 1);
  assert.equal(fixture.owner.stack[0].method === fixture.expected, true,
    'Special invocation must schedule the selected superclass Method, not the resolved or receiver Method');
  const locals = fixture.owner.stack[0].locals;
  assert.equal(locals.length, fixture.args.length + 1);
  assert.equal(locals[0] === fixture.receiver, true);
  fixture.args.forEach((argument, index) => assert.equal(locals[index + 1] === argument, true));
  assert.equal(fixture.reference.method === fixture.resolved, true, 'Selection must not replace CP resolution');
  assert.equal(fixture.reference.classInfo.cls === fixture.symbolicOwner, true);
  assert.equal(fixture.reference.fullSignature, fixture.resolved.fullSignature);
}

test('shared special invocation preserves category-two slots and the original CP declaration', () => {
  const fixture = specialDispatchFixture({descriptor: '(JD)V'}), originalArgs = fixture.args.slice();
  assert.equal(invokeSpecial(fixture), true);
  checkSpecialFrame(fixture);
  fixture.args.forEach((argument, index) => assert.equal(argument === originalArgs[index], true));
  const virtual = invocationThread();
  assert.equal(load('methods').invokeVirtualMethod(virtual, fixture.reference.method, fixture.receiver, fixture.args), true);
  assert.equal(virtual.stack[0].method.cls === fixture.receiver.getClass(), true,
    'Using the same CP declaration virtually must still select the receiver override');
});

test('shared special invocation reports superclass default conflict without scheduling a body', () => {
  const fixture = specialDispatchFixture({conflict: true});
  assert.equal(invokeSpecial(fixture), false);
  assert.equal(fixture.owner.errors.length, 1);
  assert.equal(fixture.owner.errors[0].name, 'Ljava/lang/IncompatibleClassChangeError;');
  assert.equal(fixture.owner.stack.length, 0);
  assert.equal(fixture.reference.method === fixture.resolved, true);
});

test('shared special invocation keeps constructor, private and interface-special targets exact', () => {
  const w = world(), base = w.define('special/Base', {methods: [methodSpec(PUBLIC, '<init>')]});
  const iface = w.define('special/Role', {iface: true, methods: [methodSpec()]});
  const caller = w.define('special/Caller', {parent: base, interfaces: [iface],
    methods: [methodSpec(PRIVATE, 'secret')]});
  const child = w.define('special/Receiver', {parent: caller,
    methods: [methodSpec(PUBLIC, 'secret'), methodSpec()]});
  const receiver = {getClass: () => child}, invoke = load('methods').invokeSpecialMethod;
  assert.equal(typeof invoke, 'function', 'Missing shared special invocation helper');
  for (const [symbolicOwner, target] of [[base, declared(base, '<init>()V')],
    [caller, declared(caller, 'secret()V')], [iface, declared(iface)]]) {
    const owner = invocationThread();
    assert.equal(invoke(owner, caller, symbolicOwner, target, receiver, []), true);
    assert.equal(owner.errors.length, 0);
    assert.equal(owner.stack.length, 1);
    assert.equal(owner.stack[0].method === target, true);
    assert.equal(owner.stack[0].locals[0] === receiver, true);
  }
});

test('special invocation orders constructor owner, staticness and null errors before selection failures', () => {
  const w = world(), ctor = w.define('special/Ctor', {methods: [methodSpec(PUBLIC, '<init>')]});
  const other = w.define('special/Other', {methods: [methodSpec(PUBLIC | STATIC)]});
  const caller = w.define('special/Caller', {parent: other});
  const invoke = load('methods').invokeSpecialMethod;
  assert.equal(typeof invoke, 'function', 'Missing shared special invocation helper');
  for (const [symbolicOwner, resolved, expected] of [
    [other, declared(ctor, '<init>()V'), 'Ljava/lang/NoSuchMethodError;'],
    [other, declared(other), 'Ljava/lang/IncompatibleClassChangeError;']
  ]) {
    const owner = invocationThread();
    assert.equal(invoke(owner, caller, symbolicOwner, resolved, null, []), false);
    assert.equal(owner.errors.length, 1);
    assert.equal(owner.errors[0].name, expected);
    assert.equal(owner.stack.length, 0);
  }
  const fixture = specialDispatchFixture({conflict: true});
  assert.equal(invokeSpecial(fixture, null), false);
  assert.equal(fixture.owner.errors[0].name, 'Ljava/lang/NullPointerException;');
  assert.equal(fixture.owner.stack.length, 0);
});

test('special invocation rejects abstract class selections and missing concrete defaults with AME', () => {
  const w = world(), abstract = w.define('special/Abstract', {methods: [methodSpec(PUBLIC | ABSTRACT)]});
  const iface = w.define('special/Role', {iface: true, methods: [methodSpec(PUBLIC | ABSTRACT)]});
  const missing = w.define('special/Missing', {interfaces: [iface]});
  const invoke = load('methods').invokeSpecialMethod;
  assert.equal(typeof invoke, 'function', 'Missing shared special invocation helper');
  for (const [parent, resolved] of [[abstract, declared(abstract)], [missing, declared(iface)]]) {
    const caller = w.define('special/Caller' + (parent === abstract ? 'Abstract' : 'Missing'), {parent}), owner = invocationThread();
    assert.equal(invoke(owner, caller, parent, resolved, {getClass: () => caller}, []), false);
    assert.equal(owner.errors.length, 1);
    assert.equal(owner.errors[0].name, 'Ljava/lang/AbstractMethodError;');
    assert.equal(owner.stack.length, 0);
  }
});

test('the special interpreter selects from the caller superclass and preserves wide argument slots', () => {
  const fixture = specialDispatchFixture({descriptor: '(JD)V'});
  const {OpCode} = require(path.join(runtime, 'src/enums'));
  load('opcodes').Opcodes.invokenonvirtual_fast(fixture.owner, fixture.frame,
    Buffer.from([OpCode.INVOKENONVIRTUAL_FAST, 0, 1]));
  checkSpecialFrame(fixture);
  assert.equal(fixture.frame.returnToThreadLoop, true);
});

test('the resolved invokespecial interpreter path retains superclass default conflict checks', () => {
  const fixture = specialDispatchFixture({conflict: true});
  const {OpCode} = require(path.join(runtime, 'src/enums'));
  const code = Buffer.from([OpCode.INVOKESPECIAL, 0, 1]);
  load('opcodes').Opcodes.invokespecial(fixture.owner, fixture.frame, code);
  if (fixture.owner.errors.length === 0) load('opcodes').Opcodes.invokenonvirtual_fast(fixture.owner, fixture.frame, code);
  assert.equal(fixture.owner.errors.length, 1, 'Conflict must fail instead of invoking an arbitrary resolved default');
  assert.equal(fixture.owner.errors[0].name, 'Ljava/lang/IncompatibleClassChangeError;');
  assert.equal(fixture.owner.stack.length, 0);
  assert.equal(fixture.reference.method === fixture.resolved, true);
});

for (const conflict of [false, true]) test('the special emitted JIT shares ' +
    (conflict ? 'default-conflict failure without a target frame' : 'caller-anchored selection and wide slots'), () => {
  const fixture = specialDispatchFixture({conflict, descriptor: '(JD)V'});
  const {OpCode} = require(path.join(runtime, 'src/enums'));
  const code = Buffer.from([OpCode.INVOKENONVIRTUAL_FAST, 0, 1]);
  const emitted = fixture.callerMethod.makeInvokeNonVirtualJitInfo(code, 0).emit([], [], 'special',
    'f.jitCompleted = true;', code, 0, [], fixture.callerMethod);
  const invoke = new Function('f', 't', 'u', 'invokeExactMethod', 'invokeSpecialMethod', emitted);
  invoke(fixture.frame, fixture.owner, {isNull: load('opcodes').isNull},
    load('methods').invokeExactMethod, load('methods').invokeSpecialMethod);
  if (conflict) {
    assert.equal(fixture.owner.errors.length, 1, 'JIT must not execute an arbitrary resolved default');
    assert.equal(fixture.owner.errors[0].name, 'Ljava/lang/IncompatibleClassChangeError;');
    assert.equal(fixture.owner.stack.length, 0);
    assert.equal(fixture.frame.jitCompleted, undefined);
  } else {
    checkSpecialFrame(fixture);
    assert.equal(fixture.frame.jitCompleted, true);
  }
  assert.equal(fixture.reference.method === fixture.resolved, true);
  assert.equal(fixture.frame.returnToThreadLoop, true);
});

test('static zero-argument frame locals never mutate a shared empty argument vector', () => {
  const w = world(), cls = w.define('scope/StaticLocals', {methods:[methodSpec(PUBLIC | STATIC)]});
  const owner = invocationThread(), args = [], method = declared(cls);
  load('methods').invokeExactMethod(owner, method, null, args);
  owner.stack[0].opStack.push({marker:'local'});
  load('opcodes').Opcodes.astore_0(owner, owner.stack[0]);
  assert.deepEqual(args, []);
  load('methods').invokeExactMethod(owner, method, null, args);
  assert.notEqual(owner.stack[0].locals, owner.stack[1].locals);
  assert.deepEqual(owner.stack[1].locals, []);
});
test('a prior static local store cannot add arguments to a later no-argument instance call', () => {
  const w = world(), cls = w.define('scope/MixedLocals', {methods:[
    methodSpec(PUBLIC | STATIC, 'staticBody'), methodSpec(PUBLIC, 'instanceBody')]});
  const owner = invocationThread(), args = [], receiver = {getClass:()=>cls};
  load('methods').invokeExactMethod(owner, declared(cls, 'staticBody()V'), null, args);
  owner.stack[0].opStack.push({marker:'static-local'});
  load('opcodes').Opcodes.astore_0(owner, owner.stack[0]);
  load('methods').invokeExactMethod(owner, declared(cls, 'instanceBody()V'), receiver, args);
  assert.equal(owner.stack[1].locals.length, 1);
  assert.equal(owner.stack[1].locals[0], receiver);
});
test('static category-two arguments keep word padding while callee local stores remain isolated', () => {
  const w = world(), cls = w.define('scope/WideLocals', {methods:[methodSpec(PUBLIC | STATIC, 'wide', '(JD)V')]});
  const owner = invocationThread(), originalLong = {}, replacementLong = {}, args = [originalLong,null,2.5,null];
  load('methods').invokeExactMethod(owner, declared(cls, 'wide(JD)V'), null, args);
  const frame = owner.stack[0];
  assert.deepEqual(frame.locals, args);
  frame.opStack.pushWithNull(replacementLong);
  load('opcodes').Opcodes.lstore_0(owner, frame);
  frame.opStack.pushWithNull(6.25);
  load('opcodes').Opcodes.dstore_2(owner, frame);
  assert.deepEqual(args, [originalLong,null,2.5,null]);
  assert.deepEqual(frame.locals, [replacementLong,undefined,6.25,undefined]);
});
