'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {before, test} = require('node:test');
const root = path.resolve(__dirname, '..');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.join(root, 'build/release-cli');
const sourceModules = new Set(['doppiojvm', 'VM', 'ClassFile', 'ClassData', 'ClassLoader', 'ConstantPool',
  'threading', 'methods', 'opcodes', 'util', 'ClassVerification', 'ClassPreparation', 'LoadingConstraints',
  'BytecodeVerifier', 'BytecodeTypeVerifier', 'VerificationRelations', 'GeneratedAdapters', 'LambdaAdapters',
  'ReflectionAdapters', 'SymbolicResolution', 'ClassAccess', 'method_handles', 'natives/java_lang']);
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
    fs.readFileSync(path.join(root, 'src', name + '.ts'), 'utf8'), {
      compilerOptions: {target: 1, module: 1, ignoreDeprecations: '6.0'}
    }).outputText, filename);
  return loaded.exports;
}

const {applyModernBootstrapOverlays, ClassLoader} = load('ClassLoader');
const {ReferenceClassData, ArrayClassData} = load('ClassData');
const {PreAllocatedStack} = load('threading');
const {invokeExactMethod} = load('methods');
const {LookupTable} = load('opcodes');
const {OpCode, ThreadStatus} = require(path.join(runtime, 'src/enums'));
const natives = load('natives/java_lang').default();
const nominalTypes = ['Integer', 'Long', 'Float', 'Double', 'String'];
const rejectedTypes = ['Boolean', 'Byte', 'Short', 'Character', 'Object'];
const constantDescName = 'Ljava/lang/constant/ConstantDesc;';
const resolveName = 'resolveConstantDesc';
const parameterDescriptor = '(Ljava/lang/invoke/MethodHandles$Lookup;)';
const erasedSignature = resolveName + parameterDescriptor + 'Ljava/lang/Object;';
let readStructureLayout;

before(async () => { ({readStructureLayout} = await import('./java_class_structure_test.mjs')); });

const originals = new Map();
function stock(name) {
  if (!originals.has(name)) originals.set(name, execFileSync('unzip',
    ['-p', path.join(root, 'vendor/java_home/lib/rt.jar'), name + '.class'], {timeout: 10000}));
  return originals.get(name);
}
function interfaces(bytes, layout) {
  return Array.from({length: layout.interfaceCount}, (_,index) => {
    const ref = bytes.readUInt16BE(layout.interfacesOffset + 2 * index);
    return layout.pool[layout.pool[ref].first].value;
  });
}
function signature(bytes, layout) {
  const attr = layout.attributes.entries.find(entry => entry.name === 'Signature');
  return attr ? layout.pool[bytes.readUInt16BE(attr.body)].value : null;
}

test('compiler-facing bootstrap artifact carries the same five nominal overlays as the runtime',
  {skip: process.env.DOPPIO_VERIFY_SOURCE === '1' ? 'Requires the rebuilt compiler-facing artifact' : false}, () => {
    const artifact = path.join(root, 'build/modern-bootstrap-overlay/modern-bootstrap.jar');
    const entries = execFileSync('unzip', ['-Z1', artifact], {encoding: 'utf8', timeout: 10000}).trim().split('\n');
    for (const name of nominalTypes) {
      const entry = 'java/lang/' + name + '.class';
      assert.equal(entries.filter(value => value === entry).length, 1, 'Exact compiler class ' + entry);
      const bytes = execFileSync('unzip', ['-p', artifact, entry], {timeout: 10000});
      assert.deepEqual(bytes, applyModernBootstrapOverlays('Ljava/lang/' + name + ';', stock('java/lang/' + name)),
        'Compiler and runtime must expose identical transformed metadata for ' + name);
    }
  });

// Real parsed rt.jar / class-library metadata and real method selection are
// used below. Hierarchy installation and the frame-readiness seam deliberately
// isolate dispatch; this unit does not claim full bootstrap linking or genuine
// javac/native-host execution. The B5 array corpus supplies that evidence.
function world() {
  const bootstrap = new ClassLoader(null), definitions = new Map();
  bootstrap.bootstrap = bootstrap;
  bootstrap.getLoaderObject = () => null;
  bootstrap._loadClass = () => assert.fail('The metadata unit must not load classes');
  const constantDescBytes = fs.readFileSync(path.join(root,
    'classes/modern_classlib/out/java/lang/constant/ConstantDesc.class'));
  function define(name) {
    if (definitions.has(name)) return definitions.get(name);
    const raw = name === 'java/lang/constant/ConstantDesc' ? constantDescBytes : stock(name);
    const cls = new ReferenceClassData(applyModernBootstrapOverlays('L' + name + ';', raw), null, bootstrap);
    definitions.set(name, cls);
    bootstrap.addClass(cls.getInternalName(), cls);
    const parent = cls.getSuperClassReference();
    cls.setResolved(parent === null ? null : define(parent.name.slice(1, -1)),
      cls.getInterfaceClassReferences().map(ref => define(ref.name.slice(1, -1))));
    return cls;
  }
  const iface = define('java/lang/constant/ConstantDesc');
  const method = iface.getDeclaredMethod(erasedSignature);
  assert.ok(method && method.accessFlags.isAbstract());
  function foreignInterface() {
    const owner = new ClassLoader(null);
    owner.bootstrap = bootstrap;
    owner.getLoaderObject = () => null;
    const result = new ReferenceClassData(constantDescBytes, null, owner);
    result.setResolved(define('java/lang/Object'), []);
    return result;
  }
  return {define, iface, method, foreignInterface};
}

function threadFor(receiverClass) {
  // Verification/preparation have their own genuine gates. Only this explicit
  // seam enables the actual NativeStackFrame after exact metadata selection.
  receiverClass.isResolved = () => true;
  receiverClass.resolve = () => assert.fail('No linking during ready native dispatch');
  receiverClass.initialize = () => assert.fail('No initialization during native dispatch');
  const returned = [], errors = [], nativeLookups = [];
  const thread = {
    stack: [], status: ThreadStatus.RUNNABLE,
    getStatus() { return this.status; },
    currentMethod() { return this.stack.at(-1)?.method || null; },
    isCurrentFrame(frame) { return this.stack.at(-1) === frame; },
    setStatus(status) { this.status = status; },
    asyncReturn(value) { returned.push(value); this.stack.pop(); },
    throwNewException(name) { errors.push(name); },
    getJVM: () => ({getNative(name, signature) {
      nativeLookups.push([name, signature]);
      return natives[name.slice(1, -1)]?.[signature];
    }})
  };
  return {thread, returned, errors, nativeLookups};
}

for (const name of nominalTypes) {
  test(name + ' gains only the exact ConstantDesc role and preserves class generic metadata', () => {
    const original = stock('java/lang/' + name), copy = Buffer.from(original);
    const overlaid = applyModernBootstrapOverlays('Ljava/lang/' + name + ';', original);
    const before = readStructureLayout(original), after = readStructureLayout(overlaid);
    assert.deepEqual(original, copy, 'The original rt.jar bytes must remain immutable');
    assert.deepEqual(overlaid.subarray(0, 8), original.subarray(0, 8), 'Keep minor/major version');
    assert.deepEqual(overlaid.subarray(10, before.flagsOffset), original.subarray(10, before.flagsOffset),
      'Append constants without changing old operands or shared UTF-8 entries');
    assert.deepEqual(interfaces(overlaid, after), [...interfaces(original, before), 'java/lang/constant/ConstantDesc']);
    assert.equal(signature(overlaid, after), signature(original, before) + 'Ljava/lang/constant/ConstantDesc;');
    assert.equal(after.methods.entries.some(method => method.name === 'describeConstable'), false,
      'Constable is a separate, deliberately unmodified compatibility unit');
    for (const member of [...before.fields.entries, ...before.methods.entries]) {
      const entries = before.fields.entries.includes(member) ? after.fields.entries : after.methods.entries;
      const retained = entries.find(other => other.name === member.name && other.descriptor === member.descriptor);
      assert.ok(retained, 'Retain original member ' + member.name + member.descriptor);
      assert.deepEqual(overlaid.subarray(retained.start, retained.end), original.subarray(member.start, member.end),
        'Preserve complete original member/Code ' + member.name + member.descriptor);
    }
    for (const attr of before.attributes.entries.filter(entry => entry.name !== 'Signature')) {
      const retained = after.attributes.entries.find(entry => entry.name === attr.name);
      assert.ok(retained, 'Retain original class attribute ' + attr.name);
      assert.deepEqual(overlaid.subarray(retained.start, retained.end), original.subarray(attr.start, attr.end));
    }
  });

  test(name + ' exposes parsed native typed and synthetic bridge declarations', () => {
    const w = world(), cls = w.define('java/lang/' + name);
    const typed = cls.getDeclaredMethod(resolveName + parameterDescriptor + cls.getInternalName());
    const bridge = cls.getDeclaredMethod(erasedSignature);
    assert.ok(typed, 'The covariant declaration must be present in the class file');
    assert.ok(bridge, 'Interface dispatch needs the erased declaration');
    assert.equal(typed.declaredAccessFlags, 0x0101);
    assert.equal(bridge.declaredAccessFlags, 0x1141);
    assert.equal(typed.declaredCode, null);
    assert.equal(bridge.declaredCode, null);
    assert.deepEqual(bridge.getAttribute('Exceptions').exceptions, ['Ljava/lang/ReflectiveOperationException;']);
    assert.deepEqual(bridge.getAttribute('MethodParameters').parameters, [{name: null, accessFlags: 0x1000}]);
    assert.ok(typed.slot >= 0 && bridge.slot >= 0 && typed.slot !== bridge.slot);
    const selected = cls.selectMethod(w.method);
    assert.equal(selected.kind, 'selected');
    assert.ok(selected.method === bridge, 'Select the exact parsed bridge, not an abstract/synthetic fallback');
    assert.ok(cls.isCastable(w.iface), 'Actual hierarchy identity supplies the ConstantDesc role');
    const array = new ArrayClassData(constantDescName, w.iface.getLoader());
    array.setResolved(w.define('java/lang/Object'), w.iface);
    assert.ok(cls.isCastable(array.getComponentClass()), 'Use the same metadata predicate as aastore');
  });

  for (const nullLookup of [true, false]) {
    test(name + ' actual invokeinterface/native dispatch ignores ' + (nullLookup ? 'null' : 'non-null') + ' lookup', () => {
      const w = world(), cls = w.define('java/lang/' + name), receiver = {getClass: () => cls};
      const {thread, returned, errors} = threadFor(cls);
      const lookup = nullLookup ? null : new Proxy({}, {get() { assert.fail('Lookup is ignored'); }});
      const reference = {classInfo: {cls: w.iface}, method: w.method, signature: erasedSignature, paramWordSize: 1};
      const pool = {get: () => reference, getUnchecked: () => reference};
      const frame = {pc: 0, returnToThreadLoop: false, method: {cls: {constantPool: pool}},
        opStack: new PreAllocatedStack(2)};
      frame.opStack.push(receiver);
      frame.opStack.push(lookup);
      LookupTable[OpCode.INVOKEINTERFACE_FAST](thread, frame,
        Buffer.from([OpCode.INVOKEINTERFACE_FAST, 0, 1, 2, 0]));
      assert.deepEqual(errors, []);
      assert.equal(thread.stack.length, 1, 'The real selected native frame must be scheduled');
      assert.ok(thread.stack[0].method === cls.getDeclaredMethod(erasedSignature));
      thread.stack[0].run(thread);
      assert.deepEqual(errors, []);
      assert.equal(returned.length, 1);
      assert.ok(returned[0] === receiver, 'The exact receiver, not its unboxed value, must be returned');
      assert.equal(thread.stack.length, 0);
      assert.deepEqual(frame.opStack.sliceFromBottom(0), []);
    });
  }

  test(name + ' typed native declaration returns self through ordinary exact invocation', () => {
    const w = world(), cls = w.define('java/lang/' + name), receiver = {getClass: () => cls};
    const method = cls.getDeclaredMethod(resolveName + parameterDescriptor + cls.getInternalName());
    assert.ok(method, 'A real typed declaration is required');
    const {thread, returned, errors} = threadFor(cls);
    assert.equal(invokeExactMethod(thread, method, receiver, [null]), true);
    thread.stack[0].run(thread);
    assert.deepEqual(errors, []);
    assert.equal(returned.length, 1);
    assert.ok(returned[0] === receiver);
  });

  test(name + ' does not acquire a foreign-loader same-name ConstantDesc identity', () => {
    const w = world(), cls = w.define('java/lang/' + name), foreign = w.foreignInterface();
    assert.equal(cls.isCastable(foreign), false);
    assert.ok(w.iface !== foreign);
  });
}

for (const name of rejectedTypes) {
  test(name + ' remains outside the nominal ConstantDesc hierarchy', () => {
    const w = world(), cls = w.define('java/lang/' + name);
    assert.equal(cls.isCastable(w.iface), false);
    assert.equal(cls.getDeclaredMethod(erasedSignature), null);
    assert.equal(cls.getDeclaredMethod(resolveName + parameterDescriptor + cls.getInternalName()), null);
    assert.equal(cls.getInterfaceClassReferences().some(ref => ref.name === constantDescName), false);
    assert.equal(natives['java/lang/' + name]?.[erasedSignature], undefined);
  });
}
