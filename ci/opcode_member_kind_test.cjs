'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {test} = require('node:test');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.resolve(__dirname, '../build/release-cli');
const sourceModules = new Set(['ClassData', 'ClassLoader', 'ConstantPool', 'threading', 'methods', 'opcodes',
  'ClassVerification', 'ClassPreparation', 'LoadingConstraints', 'BytecodeVerifier', 'BytecodeTypeVerifier',
  'VerificationRelations', 'GeneratedAdapters', 'LambdaAdapters', 'ReflectionAdapters', 'SymbolicResolution',
  'ClassAccess', 'util', 'method_handles']);
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
const {ReferenceClassData} = load('ClassData');
const {ClassLoader} = load('ClassLoader');
const {FieldReference, MethodReference, InterfaceMethodReference} = load('ConstantPool');
const {LookupTable} = load('opcodes');
const {PreAllocatedStack} = load('threading');
const {OpCode, ThreadStatus} = load('enums');
const gLong = load('gLong').default;
const u2 = value => { const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes; };
const u4 = value => { const bytes = Buffer.alloc(4); bytes.writeUInt32BE(value); return bytes; };
const ICCE = 'Ljava/lang/IncompatibleClassChangeError;';

// Synthetic, parsed major-65 declarations and CP entries. Real slow opcode
// handlers are called with controlled frames and a diagnostic thread sink.
// These units are not genuine javac or full guest/initialization evidence;
// java_invocation_evolution_test.mjs owns those native/Node/Chromium contracts.
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
  const cls = name => entry('class:' + name, () => Buffer.concat([Buffer.from([7]), u2(utf(name))]));
  const nat = (name, descriptor) => entry('nat:' + name + descriptor,
    () => Buffer.concat([Buffer.from([12]), u2(utf(name)), u2(utf(descriptor))]));
  const self = cls(name), superclass = parent === null ? 0 : cls(parent), interfaceIndices = interfaces.map(cls);
  const encodedFields = fields.map(field => Buffer.concat([
    u2(field.flags), u2(utf(field.name)), u2(utf(field.descriptor)), u2(0)]));
  const encodedMethods = methods.map(method => {
    const flags = method.flags, nameIndex = utf(method.name), descriptorIndex = utf('()V');
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
  const bootstrap = new ClassLoader(null), initialized = new Set(), initializations = [];
  bootstrap.bootstrap = bootstrap;
  bootstrap.getLoaderObject = () => null;
  bootstrap._loadClass = () => assert.fail('All unit metadata must already be available');
  function define(spec) {
    const cls = new ReferenceClassData(classBytes(spec), null, bootstrap);
    bootstrap.addClass(cls.getInternalName(), cls);
    assert.equal(cls.tryToResolve(), true, 'Parsed unit metadata fully links without initialization');
    cls.isInitialized = () => initialized.has(cls);
    cls.initialize = (thread, callback) => {
      initializations.push(cls);
      initialized.add(cls);
      callback(cls);
    };
    return cls;
  }
  define({name: 'java/lang/Object', parent: null});
  function reference(tag, owner, descriptor = '()V') {
    const caller = define({name: 'members/Caller' + Object.keys(bootstrap.loadedClasses).length,
      methods: [{name: 'run', flags: 9}],
      references: [{tag, owner: owner.getInternalName().slice(1, -1), name: 'target', descriptor}]});
    const type = tag === 9 ? FieldReference : tag === 10 ? MethodReference : InterfaceMethodReference;
    let result, index;
    caller.constantPool.each((slot, item) => { if (item instanceof type) { result = item; index = slot; } });
    assert.ok(result instanceof type, 'Use a parsed member reference, not a hasAccess stub');
    return {caller, result, index};
  }
  function context(pair, opcode, operands = []) {
    const errors = [], statuses = [], progress = [], frame = {
      method: pair.caller.getDeclaredMethod('run()V'), pc: 0, returnToThreadLoop: false,
      opStack: new PreAllocatedStack(8), getLoader: () => bootstrap
    };
    operands.forEach(value => frame.opStack.push(value));
    const thread = {
      stack: [], status: ThreadStatus.RUNNABLE,
      currentMethod: () => frame.method,
      getBsCl: () => bootstrap,
      getJVM: () => ({shouldDumpCompiledCode: () => false}),
      getStatus() { return this.status; },
      setStatus(status) {
        this.status = status;
        statuses.push(status);
        if (status === ThreadStatus.RUNNABLE) progress.splice(0).forEach(ready => ready());
      },
      throwNewException(name, message) {
        errors.push({name, message});
        progress.splice(0).forEach(ready => ready());
      }
    };
    const code = Buffer.concat([Buffer.from([opcode]), u2(pair.index),
      opcode === OpCode.INVOKEINTERFACE ? Buffer.from([1, 0]) : Buffer.alloc(0)]);
    function waitForRunnable() {
      if (errors.length || thread.status === ThreadStatus.RUNNABLE) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const ready = () => { clearTimeout(timer); resolve(); };
        const timer = setTimeout(() => {
          const index = progress.indexOf(ready);
          if (index >= 0) progress.splice(index, 1);
          reject(new Error('Unit opcode did not resume after metadata resolution'));
        }, 2000);
        progress.push(ready);
      });
    }
    return {pair, frame, thread, errors, statuses, code, waitForRunnable, originalOpcode: opcode};
  }
  async function slow(ctx) {
    // One call may resolve metadata, another may initialize the exact owner,
    // and the final call rewrites the opcode. Do not run a suspended thread or
    // assume that nested loader callbacks complete within one event-loop tick.
    for (let attempt = 0; attempt < 3; attempt++) {
      ctx.frame.returnToThreadLoop = false;
      LookupTable[ctx.originalOpcode](ctx.thread, ctx.frame, ctx.code);
      if (ctx.errors.length || ctx.code[0] !== ctx.originalOpcode) return;
      await ctx.waitForRunnable();
      if (ctx.errors.length) return;
    }
    assert.fail('Unit slow opcode did not resolve, initialize, and rewrite within three resumed calls');
  }
  async function resolve(pair) {
    const ctx = context(pair, OpCode.INVOKESTATIC);
    let callbacks = 0;
    const success = await new Promise(done => pair.result.resolve(ctx.thread, bootstrap, pair.caller,
      value => { callbacks++; done(value); }, false));
    assert.equal(success, true);
    assert.equal(callbacks, 1);
    assert.deepEqual(ctx.errors, []);
  }
  return {bootstrap, define, reference, context, slow, resolve, initializations, initialized};
}

function assertKindFailure(w, ctx, operands) {
  assert.deepEqual(ctx.errors.map(error => error.name), [ICCE], 'Instruction mismatch must throw exactly ICCE');
  assert.equal(ctx.frame.returnToThreadLoop, true);
  assert.equal(ctx.frame.pc, 0);
  assert.equal(ctx.code[0], ctx.originalOpcode, 'A rejected instruction must not install a fast opcode');
  assert.deepEqual(ctx.frame.opStack.getRaw(), operands, 'Linking failure must not consume receiver or argument words');
  assert.equal(w.initializations.length, 0, 'Staticness is checked before any active-use initialization');
  assert.equal(ctx.pair.result.isResolved(), true, 'Instruction mismatch must not poison successful CP resolution');
}

const methodCases = [
  {name: 'invokestatic/Methodref', opcode: OpCode.INVOKESTATIC, tag: 10, declaredStatic: false},
  {name: 'invokestatic/InterfaceMethodref', opcode: OpCode.INVOKESTATIC, tag: 11, declaredStatic: false},
  {name: 'invokevirtual', opcode: OpCode.INVOKEVIRTUAL, tag: 10, declaredStatic: true},
  {name: 'invokeinterface', opcode: OpCode.INVOKEINTERFACE, tag: 11, declaredStatic: true},
  {name: 'invokespecial/Methodref', opcode: OpCode.INVOKESPECIAL, tag: 10, declaredStatic: true},
  {name: 'invokespecial/InterfaceMethodref', opcode: OpCode.INVOKESPECIAL, tag: 11, declaredStatic: true}
];
for (const spec of methodCases) for (const warm of [false, true]) {
  test(`${spec.name} ${warm ? 'resolved' : 'unresolved'} mismatch precedes null/init/rewrite and preserves CP reuse`, async () => {
    const w = world(), owner = w.define({name: 'members/Owner', flags: spec.tag === 11 ? 0x601 : 0x21,
      methods: [{name: 'target', flags: spec.declaredStatic ? 9 : 1}]}), pair = w.reference(spec.tag, owner);
    if (warm) await w.resolve(pair);
    assert.equal(pair.result.isResolved(), warm);
    const operands = spec.opcode === OpCode.INVOKESTATIC ? [] : [null], ctx = w.context(pair, spec.opcode, operands);
    await w.slow(ctx);
    assertKindFailure(w, ctx, operands);
    const declaration = owner.getDeclaredMethod('target()V');
    assert.ok(pair.result.method === declaration, 'Keep the exact successfully resolved declaration');
    await w.resolve(pair);
    assert.equal(w.initializations.length, 0, 'Re-resolving the same CP entry is not an active use');

    // The same successful CP reference can still serve an instruction of the
    // correct kind. Its previous call-site ICCE is not a symbolic failure.
    const receiverClass = spec.tag === 11 && !spec.declaredStatic ?
      w.define({name: 'members/Receiver', interfaces: ['members/Owner']}) : owner;
    const receiver = {getClass: () => receiverClass};
    const correctOpcode = spec.declaredStatic ? OpCode.INVOKESTATIC :
      spec.tag === 11 ? OpCode.INVOKEINTERFACE : OpCode.INVOKEVIRTUAL;
    const correct = w.context(pair, correctOpcode, spec.declaredStatic ? [] : [receiver]);
    await w.slow(correct);
    assert.deepEqual(correct.errors, []);
    assert.equal(correct.code[0], spec.declaredStatic ? OpCode.INVOKESTATIC_FAST :
      spec.tag === 11 ? OpCode.INVOKEINTERFACE_FAST : OpCode.INVOKEVIRTUAL_FAST);
    assert.ok(spec.declaredStatic ? w.initializations.length === 1 && w.initializations[0] === owner :
      w.initializations.length === 0, 'Only a valid static call initializes its exact declaration owner');
    LookupTable[correct.code[0]](correct.thread, correct.frame, correct.code);
    assert.deepEqual(correct.errors, []);
    assert.equal(correct.thread.stack.length, 1, 'Correct instruction schedules an ordinary callee frame');
    assert.ok(correct.thread.stack[0].method === declaration, 'Correct opcode dispatches the exact method');
    assert.ok(pair.result.method === declaration, 'Invocation retains the exact resolved method');
  });
}

const fieldCases = [
  {name: 'getstatic', opcode: OpCode.GETSTATIC, declaredStatic: false, store: false},
  {name: 'putstatic', opcode: OpCode.PUTSTATIC, declaredStatic: false, store: true},
  {name: 'getfield', opcode: OpCode.GETFIELD, declaredStatic: true, store: false},
  {name: 'putfield', opcode: OpCode.PUTFIELD, declaredStatic: true, store: true}
];
for (const spec of fieldCases) for (const descriptor of ['I', 'J']) for (const warm of [false, true]) {
  test(`${spec.name} ${descriptor} ${warm ? 'resolved' : 'unresolved'} mismatch precedes null/init/rewrite and preserves CP reuse`, async () => {
    const w = world(), owner = w.define({name: 'members/Owner', fields: [
      {name: 'target', descriptor, flags: spec.declaredStatic ? 9 : 1}]}), pair = w.reference(9, owner, descriptor);
    if (warm) await w.resolve(pair);
    assert.equal(pair.result.isResolved(), warm);
    const value = descriptor === 'J' ? gLong.fromInt(37) : 37, valueWords = descriptor === 'J' ? [value, null] : [value];
    const operands = (spec.declaredStatic ? [null] : []).concat(spec.store ? valueWords : []);
    const ctx = w.context(pair, spec.opcode, operands);
    await w.slow(ctx);
    assertKindFailure(w, ctx, operands);
    const declaration = owner.getFields()[0];
    assert.ok(pair.result.field === declaration, 'Mismatch retains the exact resolved field');
    await w.resolve(pair);
    assert.equal(w.initializations.length, 0);

    const receiver = {getClass: () => owner, [pair.result.fullFieldName]: value};
    const correctOpcode = spec.declaredStatic ? (spec.store ? OpCode.PUTSTATIC : OpCode.GETSTATIC) :
      (spec.store ? OpCode.PUTFIELD : OpCode.GETFIELD);
    const correctOperands = (spec.declaredStatic ? [] : [receiver]).concat(spec.store ? valueWords : []);
    const correct = w.context(pair, correctOpcode, correctOperands);
    if (spec.declaredStatic) owner.getConstructor(correct.thread)[pair.result.fullFieldName] = value;
    await w.slow(correct);
    assert.deepEqual(correct.errors, []);
    assert.ok(spec.declaredStatic ? w.initializations.length === 1 && w.initializations[0] === owner :
      w.initializations.length === 0, 'Only valid static field access initializes its exact declaration owner');
    const expectedFast = spec.declaredStatic ?
      (spec.store ? descriptor === 'J' ? OpCode.PUTSTATIC_FAST64 : OpCode.PUTSTATIC_FAST32 :
        descriptor === 'J' ? OpCode.GETSTATIC_FAST64 : OpCode.GETSTATIC_FAST32) :
      (spec.store ? descriptor === 'J' ? OpCode.PUTFIELD_FAST64 : OpCode.PUTFIELD_FAST32 :
        descriptor === 'J' ? OpCode.GETFIELD_FAST64 : OpCode.GETFIELD_FAST32);
    assert.equal(correct.code[0], expectedFast);
    LookupTable[correct.code[0]](correct.thread, correct.frame, correct.code);
    assert.deepEqual(correct.errors, []);
    assert.equal(correct.frame.pc, 3);
    if (spec.store) {
      assert.deepEqual(correct.frame.opStack.getRaw(), []);
      assert.equal((spec.declaredStatic ? pair.result.fieldOwnerConstructor : receiver)[pair.result.fullFieldName], value);
    } else {
      assert.equal(correct.frame.opStack.getRaw()[0], value);
      assert.equal(correct.frame.opStack.getRaw().length, descriptor === 'J' ? 2 : 1);
    }
    assert.ok(pair.result.field === declaration, 'Correct opcode retains the exact resolved field');
  });
}

for (const iface of [false, true]) {
  test(`valid invokestatic initializes only the ${iface ? 'interface declaration, not its parent' : 'inherited declaring class, not its child'}`, async () => {
    const w = world();
    const parent = w.define({name: 'members/Parent', flags: iface ? 0x601 : 0x21,
      methods: iface ? [] : [{name: 'target', flags: 9}]});
    const child = w.define({name: 'members/Child', flags: iface ? 0x601 : 0x21,
      parent: iface ? 'java/lang/Object' : 'members/Parent', interfaces: iface ? ['members/Parent'] : [],
      methods: iface ? [{name: 'target', flags: 9}] : []});
    const declaring = iface ? child : parent, deferred = iface ? parent : child;
    const pair = w.reference(iface ? 11 : 10, child), ctx = w.context(pair, OpCode.INVOKESTATIC);
    await w.slow(ctx);
    assert.deepEqual(ctx.errors, []);
    assert.ok(pair.result.method === declaring.getDeclaredMethod('target()V'), 'Resolved method has its exact declaring owner');
    assert.ok(pair.result.jsConstructor === declaring.getConstructor(ctx.thread), 'Static method uses the exact declaring constructor');
    assert.ok(w.initializations.length === 1 && w.initializations[0] === declaring,
      'Static call initializes only the exact declaring owner');
    assert.equal(w.initialized.has(deferred), false);
    assert.equal(ctx.code[0], OpCode.INVOKESTATIC_FAST);
    LookupTable[ctx.code[0]](ctx.thread, ctx.frame, ctx.code);
    assert.ok(ctx.thread.stack[0].method.cls === declaring, 'Static invocation dispatches the exact declaring method');
    assert.ok(w.initializations.length === 1 && w.initializations[0] === declaring,
      'Fast static invocation does not initialize another owner');
  });
}

for (const store of [false, true]) {
  test(`valid ${store ? 'putstatic' : 'getstatic'} initializes the actual inherited field owner`, async () => {
    const w = world(), parent = w.define({name: 'members/Parent', fields: [{name: 'target', descriptor: 'I', flags: 9}]}),
      child = w.define({name: 'members/Child', parent: 'members/Parent'}), pair = w.reference(9, child, 'I');
    const ctx = w.context(pair, store ? OpCode.PUTSTATIC : OpCode.GETSTATIC, store ? [37] : []);
    await w.slow(ctx);
    assert.deepEqual(ctx.errors, []);
    assert.ok(pair.result.field === parent.getFields()[0], 'Inherited field resolves to the exact parent declaration');
    assert.ok(pair.result.fieldOwnerConstructor === parent.getConstructor(ctx.thread), 'Inherited field uses its exact owner constructor');
    assert.ok(w.initializations.length === 1 && w.initializations[0] === parent,
      'Inherited static field initializes only its exact declaring owner');
    assert.equal(w.initialized.has(child), false);
    assert.equal(ctx.code[0], store ? OpCode.PUTSTATIC_FAST32 : OpCode.GETSTATIC_FAST32);
  });
}
