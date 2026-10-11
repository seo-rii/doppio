'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {before, test} = require('node:test');
const root = path.resolve(__dirname, '..');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.join(root, 'build/release-cli');
const filename = path.join(runtime, 'src/ClassLoader.js');
function classLoaderModule() {
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(filename);
  const loaded = new Module(filename, module);
  loaded.filename = filename; loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(require('typescript').transpileModule(fs.readFileSync(path.join(root, 'src/ClassLoader.ts'), 'utf8'), {
    compilerOptions: {target: 1, module: 1, ignoreDeprecations: '6.0'}
  }).outputText, filename);
  return loaded.exports;
}
const {ClassLoader, applyModernBootstrapOverlays} = classLoaderModule();
const {ReferenceClassData, ArrayClassData} = require(path.join(runtime, 'src/ClassData'));
const {BytecodeStackFrame} = require(path.join(runtime, 'src/threading'));
const {invokeExactMethod} = require(path.join(runtime, 'src/methods'));
const {Flags, getMethodDescriptorWordSize} = require(path.join(runtime, 'src/util'));
const {Code} = require(path.join(runtime, 'src/attributes'));
const {decodeMethodCode, BytecodeVerificationError} = require(path.join(runtime, 'src/BytecodeVerifier'));
const {verifyMethodTypes} = require(path.join(runtime, 'src/BytecodeTypeVerifier'));
const {ThreadStatus, ConstantPoolItemType} = require(path.join(runtime, 'src/enums'));
const targetName = 'sun/reflect/annotation/AnnotatedTypeFactory$AnnotatedWildcardTypeImpl';
const baseName = 'sun/reflect/annotation/AnnotatedTypeFactory$AnnotatedTypeBaseImpl';
const factoryName = 'sun/reflect/annotation/AnnotatedTypeFactory';
const locationName = 'sun/reflect/annotation/TypeAnnotation$LocationInfo';
const annotationsName = 'sun/reflect/annotation/TypeAnnotation';
const boundSignature = 'getAnnotatedUpperBounds()[Ljava/lang/reflect/AnnotatedType;';
const factoryDescriptor = '(Ljava/lang/reflect/Type;Lsun/reflect/annotation/TypeAnnotation$LocationInfo;[Lsun/reflect/annotation/TypeAnnotation;[Lsun/reflect/annotation/TypeAnnotation;Ljava/lang/reflect/AnnotatedElement;)Ljava/lang/reflect/AnnotatedType;';
const stockCache = new Map();
let readStructureLayout, decodeCoreCode;
before(async () => {
  ({readStructureLayout} = await import('./java_class_structure_test.mjs'));
  ({decodeCoreCode} = await import('./java_core_bytecode.mjs'));
});
function stock(name) {
  if (!stockCache.has(name)) stockCache.set(name, execFileSync('unzip',
    ['-p', path.join(root, 'vendor/java_home/lib/rt.jar'), name + '.class'], {timeout: 10000}));
  return stockCache.get(name);
}
function parsedTarget() {
  const original = stock(targetName), bytes = applyModernBootstrapOverlays('L' + targetName + ';', original);
  const cls = new ReferenceClassData(bytes, null, new ClassLoader(null));
  const method = cls.getDeclaredMethod(boundSignature);
  assert.ok(method && method.declaredCode, 'The actual overlaid class must declare the Java method');
  return {original, bytes, cls, method, input: {
    className: cls.getInternalName(), superClassName: cls.getSuperClassReference().name,
    majorVersion: cls.majorVersion, name: method.name, descriptor: method.rawDescriptor,
    declaredAccessFlags: method.declaredAccessFlags, declaredCode: method.declaredCode, constantPool: cls.constantPool
  }};
}

test('bundled Java 8 helper actually has the lower-bounded empty-upper branch being corrected', () => {
  const original = stock(targetName), layout = readStructureLayout(original);
  const member = layout.methods.entries.find(method => method.name + method.descriptor === boundSignature);
  const code = original.subarray(member.code.instructionsOffset, member.code.instructionsOffset + member.code.codeLength);
  const instructions = decodeCoreCode(code, layout.pool, original);
  assert.deepEqual(instructions.filter(item => item.pc >= 7 && item.pc <= 11).map(item => item.name),
    ['iconst_0', 'anewarray', 'areturn']);
  assert.equal(instructions.find(item => item.pc === 4).branchTarget, 12);
});

test('target-only overlay preserves the original version, constant pool, other members and non-Code metadata', () => {
  const {original, bytes} = parsedTarget(), pristine = Buffer.from(stock(targetName));
  const beforeLayout = readStructureLayout(original), afterLayout = readStructureLayout(bytes);
  assert.deepEqual(original, pristine);
  assert.deepEqual(bytes.subarray(0, 8), original.subarray(0, 8));
  assert.deepEqual(bytes.subarray(10, beforeLayout.flagsOffset), original.subarray(10, beforeLayout.flagsOffset));
  assert.deepEqual(bytes.subarray(afterLayout.flagsOffset, afterLayout.methods.countOffset),
    original.subarray(beforeLayout.flagsOffset, beforeLayout.methods.countOffset),
    'Class identity, direct parents, interfaces and the complete field table remain original');
  assert.equal(afterLayout.methods.entries.length, beforeLayout.methods.entries.length + 1,
    'Only the previously supported annotated-owner method is added');
  for (const old of [...beforeLayout.fields.entries, ...beforeLayout.methods.entries]) {
    const entries = beforeLayout.fields.entries.includes(old) ? afterLayout.fields.entries : afterLayout.methods.entries;
    const changed = entries.find(member => member.name === old.name && member.descriptor === old.descriptor);
    assert.ok(changed, 'Retained original member ' + old.name + old.descriptor);
    if (old.name + old.descriptor !== boundSignature) {
      assert.deepEqual(bytes.subarray(changed.start, changed.end), original.subarray(old.start, old.end));
    } else {
      assert.equal(changed.flags, old.flags);
      assert.notDeepEqual(bytes.subarray(changed.code.start, changed.code.end), original.subarray(old.code.start, old.code.end));
      assert.deepEqual(changed.attributes.entries.filter(item => item.name !== 'Code')
        .map(item => bytes.subarray(item.start, item.end).toString('hex')),
      old.attributes.entries.filter(item => item.name !== 'Code')
        .map(item => original.subarray(item.start, item.end).toString('hex')),
      'Every non-Code method attribute retains its original order and bytes');
      for (const attribute of old.attributes.entries.filter(item => item.name !== 'Code')) {
        const retained = changed.attributes.entries.find(item => item.name === attribute.name);
        assert.ok(retained);
        assert.deepEqual(bytes.subarray(retained.start, retained.end), original.subarray(attribute.start, attribute.end));
      }
    }
  }
  for (const attribute of beforeLayout.attributes.entries) {
    const retained = afterLayout.attributes.entries.find(item => item.name === attribute.name);
    assert.ok(retained);
    assert.deepEqual(bytes.subarray(retained.start, retained.end), original.subarray(attribute.start, attribute.end));
  }
  assert.deepEqual(bytes.subarray(afterLayout.attributes.countOffset), original.subarray(beforeLayout.attributes.countOffset));
  const owner = afterLayout.methods.entries.find(item => item.name === 'getAnnotatedOwnerType');
  assert.equal(bytes.subarray(owner.code.instructionsOffset, owner.code.instructionsOffset + owner.code.codeLength).toString('hex'), '01b0');
});

test('actual generated Code builds unannotated Object using the bundled five-argument factory contract', () => {
  const {bytes, method} = parsedTarget(), layout = readStructureLayout(bytes);
  const instructions = decodeCoreCode(method.declaredCode.getCode(), layout.pool, bytes);
  const object = instructions.find(item => item.name === 'ldc_w');
  assert.deepEqual({...object.cp, index: 0}, {index: 0, tag: 7, value: 'java.lang.Object'});
  const factory = instructions.find(item => item.name === 'invokestatic');
  assert.deepEqual({...factory.cp, index: 0}, {index: 0, tag: 10, owner: factoryName.replaceAll('/', '.'),
    name: 'buildAnnotatedType', descriptor: factoryDescriptor});
  const arrays = instructions.filter(item => item.name === 'anewarray');
  assert.deepEqual(arrays.map(item => item.cp.value), ['java.lang.reflect.AnnotatedType',
    annotationsName.replaceAll('/', '.'), annotationsName.replaceAll('/', '.')]);
  for (const array of arrays.slice(1)) assert.equal(instructions.find(item => item.pc === array.pc - 1).name, 'iconst_0');
  const base = instructions.find(item => item.name === 'getstatic');
  assert.equal(base.cp.owner, locationName.replaceAll('/', '.')); assert.equal(base.cp.name, 'BASE_LOCATION');
  const declaration = instructions.find(item => item.name === 'invokevirtual');
  assert.equal(declaration.cp.name, 'getDecl'); assert.equal(declaration.cp.descriptor, '()Ljava/lang/reflect/AnnotatedElement;');
});

test('actual generated branch has its exact full frame and passes decoding and type checking', () => {
  const {input} = parsedTarget(), decoded = decodeMethodCode(input);
  assert.deepEqual(decoded.stackMapFrames.map(frame => frame.pc), [36]);
  assert.equal(input.declaredCode.getMaxStack(), 8); assert.equal(input.declaredCode.getMaxLocals(), 1);
  assert.equal(decoded.instructions.find(item => item.pc === 4).branchTargets[0], 36);
  assert.equal(verifyMethodTypes(input, decoded).policy, 'stack-map');
});

test('the generated upper-bound branch is not exempt from a missing StackMapTable', () => {
  const {input} = parsedTarget(), original = input.declaredCode;
  const changed = {...input, declaredCode: new Code(original.getMaxStack(), original.getMaxLocals(),
    original.exceptionHandlers.slice(), [], Buffer.from(original.getCode()))};
  assert.throws(() => verifyMethodTypes(changed, decodeMethodCode(changed)),
    error => error instanceof BytecodeVerificationError && /stack-map frame/.test(error.message));
});

// Execute the actual parsed upper-bound Code through ordinary BytecodeStackFrame
// and interpreter dispatch. Explicit ready-metadata / callee seams isolate this
// branch and capture factory arguments, not full VM linking or annotation parsing.
// The unchanged B6 genuine record/ordinary-field trees provide native agreement.
function dispatch({upper = false, declaration = {marker: 'declaring element'}, annotations = [{marker: 'lower annotation'}]} = {}) {
  const bootstrap = new ClassLoader(null), definitions = new Map(), arrays = new Map(), events = [];
  bootstrap.bootstrap = bootstrap; bootstrap.getLoaderObject = () => null;
  bootstrap._loadClass = () => assert.fail('Ready instruction unit must not load a class');
  const define = name => {
    if (name[0] === '[') return array(define(name.slice(1)));
    if (name[0] === 'L') name = name.slice(1, -1);
    if (definitions.has(name)) return definitions.get(name);
    const cls = new ReferenceClassData(applyModernBootstrapOverlays('L' + name + ';', stock(name)), null, bootstrap);
    definitions.set(name, cls); bootstrap.addClass(cls.getInternalName(), cls);
    const parent = cls.getSuperClassReference();
    cls.setResolved(parent === null ? null : define(parent.name), cls.getInterfaceClassReferences().map(ref => define(ref.name)));
    cls.isResolved = () => true;
    cls.resolve = () => assert.fail('Explicit ready-metadata seam must not link or verify a class');
    cls.isInitialized = () => true;
    cls.getClassObject = () => cls.mirror || (cls.mirror = {$cls: cls});
    return cls;
  };
  const array = component => {
    const name = '[' + component.getInternalName();
    if (!arrays.has(name)) {
      const cls = new ArrayClassData(component.getInternalName(), bootstrap); cls.setResolved(define('java/lang/Object'), component);
      cls.getConstructor = () => function ArrayValue(caller, size) {
        assert.equal(caller, thread); this.array = new Array(size).fill(null); this.getClass = () => cls;
      };
      arrays.set(name, cls); bootstrap.addClass(name, cls);
    }
    return arrays.get(name);
  };
  bootstrap.getInitializedClass = (caller, name) => { assert.equal(caller, thread); return define(name); };
  const cls = define(targetName), base = define(baseName), factory = define(factoryName), location = define(locationName);
  const object = define('java/lang/Object'), annotated = define('java/lang/reflect/AnnotatedType');
  const baseLocation = {marker: 'base location'}, builds = [], boundQueries = [], returned = [];
  const selectedBounds = {array: [{marker: 'existing annotated upper bound'}], getClass: () => array(annotated)};
  const wildcard = {marker: 'original wildcard', getClass: () => define('java/lang/reflect/WildcardType')};
  const receiver = {declaration, annotations, wildcard, getClass: () => cls};
  const method = cls.getDeclaredMethod(boundSignature);
  const nativeSeam = (owner, signature, implementation) => {
    const callee = owner.getDeclaredMethod(signature); assert.ok(callee, 'Actual original callee declaration ' + signature);
    callee.accessFlags = new Flags(callee.accessFlags.getRawByte() | 0x0100);
    callee.convertArgs = (caller, args) => [caller, ...args];
    callee.getNativeFunction = () => implementation;
    return callee;
  };
  const callees = new Map([
    ['hasUpperBounds()Z', nativeSeam(cls, 'hasUpperBounds()Z', (caller, value) => { assert.equal(value, receiver); return upper; })],
    ['getWildcardType()Ljava/lang/reflect/WildcardType;', nativeSeam(cls, 'getWildcardType()Ljava/lang/reflect/WildcardType;',
      (caller, value) => { assert.equal(value, receiver); boundQueries.push('wildcard'); return wildcard; })],
    ['getAnnotatedBounds([Ljava/lang/reflect/Type;)[Ljava/lang/reflect/AnnotatedType;',
      nativeSeam(cls, 'getAnnotatedBounds([Ljava/lang/reflect/Type;)[Ljava/lang/reflect/AnnotatedType;',
        (caller, value, bounds) => { assert.equal(value, receiver); assert.equal(bounds, rawBounds); boundQueries.push('annotated'); return selectedBounds; })],
    ['getDecl()Ljava/lang/reflect/AnnotatedElement;', nativeSeam(base, 'getDecl()Ljava/lang/reflect/AnnotatedElement;',
      (caller, value) => { assert.equal(value, receiver); return value.declaration; })]
  ]);
  const rawBounds = {array: [object.getClassObject()], marker: 'raw upper bounds'};
  const upperDeclaration = define('java/lang/reflect/WildcardType').getDeclaredMethod('getUpperBounds()[Ljava/lang/reflect/Type;');
  const wildcardClass = define('sun/reflect/generics/reflectiveObjects/WildcardTypeImpl');
  nativeSeam(wildcardClass, upperDeclaration.signature, (caller, value) => {
      assert.equal(value, wildcard); boundQueries.push('raw'); return rawBounds;
  });
  wildcard.getClass = () => wildcardClass;
  const factoryMethod = factory.getDeclaredMethod('buildAnnotatedType' + factoryDescriptor);
  const factoryConstructor = {[factoryMethod.fullSignature](caller, args) {
    assert.equal(caller, thread); assert.equal(args.length, 5); builds.push(args);
    const bound = {type: args[0], location: args[1], actual: args[2], all: args[3], declaration: args[4], getClass: () => base};
    thread.stack.at(-1).scheduleResume(thread, bound);
  }};
  const locationConstructor = {'sun/reflect/annotation/TypeAnnotation$LocationInfo/BASE_LOCATION': baseLocation};
  location.getConstructor = () => locationConstructor;
  cls.constantPool.each((index, entry) => {
    const tag = entry.getType();
    if (tag === ConstantPoolItemType.CLASS) {
      entry.cls = define(entry.name); entry.isResolved = () => true;
    } else if (tag === ConstantPoolItemType.METHODREF || tag === ConstantPoolItemType.INTERFACE_METHODREF) {
      const signature = entry.nameAndTypeInfo.name + entry.nameAndTypeInfo.descriptor;
      if (signature === 'buildAnnotatedType' + factoryDescriptor) {
        entry.method = factoryMethod; entry.jsConstructor = factoryConstructor;
      } else if (signature === upperDeclaration.signature) entry.method = upperDeclaration;
      else if (callees.has(signature)) entry.method = callees.get(signature);
      else return;
      entry.classInfo.cls = entry.method.cls; entry.paramWordSize = getMethodDescriptorWordSize(entry.nameAndTypeInfo.descriptor);
      entry.fullSignature = entry.method.fullSignature; entry.isResolved = () => true; entry.hasAccess = () => true;
    } else if (tag === ConstantPoolItemType.FIELDREF && entry.nameAndTypeInfo.name === 'BASE_LOCATION') {
      entry.field = location.getFields().find(field => field.name === 'BASE_LOCATION');
      entry.fullFieldName = entry.field.fullName;
      entry.classInfo.cls = location; entry.isResolved = () => true; entry.hasAccess = () => true;
    }
  });
  const thread = {stack: [], status: ThreadStatus.RUNNABLE, jitDisabled: true,
    getStatus() { return this.status; }, setStatus(value) { this.status = value; },
    currentMethod() { return this.stack.at(-1)?.method || null; }, getBsCl: () => bootstrap,
    getJVM: () => ({getNative() { assert.fail('Only declared callee seams are permitted'); }}),
    throwNewException(name) { assert.fail('Unexpected guest exception ' + name); },
    asyncReturn(value) { this.stack.pop(); if (this.stack.length) this.stack.at(-1).scheduleResume(this, value); else returned.push(value); }
  };
  assert.equal(invokeExactMethod(thread, method, receiver, []), true);
  assert.ok(thread.stack[0] instanceof BytecodeStackFrame);
  let steps = 0;
  while (thread.stack.length) {
    assert.ok(++steps <= 16, 'Bounded actual frame execution');
    const frame = thread.stack.at(-1); events.push(frame.method.signature); frame.run(thread);
  }
  assert.equal(returned.length, 1);
  return {result: returned[0], builds, boundQueries, events, object, baseLocation, declaration, receiver, selectedBounds};
}

test('actual lower-bounded Code returns singleton Object without leaking wildcard/lower annotations', () => {
  const annotations = [{marker: 'wildcard use'}, {marker: 'lower bound'}], w = dispatch({annotations});
  assert.equal(w.result.array.length, 1); assert.equal(w.builds.length, 1);
  assert.equal(w.result.array[0].type.$cls, w.object); assert.equal(w.result.array[0].location, w.baseLocation);
  assert.deepEqual(w.result.array[0].actual.array, []); assert.deepEqual(w.result.array[0].all.array, []);
  assert.equal(w.result.array[0].declaration, w.declaration);
  assert.notEqual(w.result.array[0].actual, annotations); assert.notEqual(w.result.array[0].all, annotations);
  assert.deepEqual(w.receiver.annotations, annotations); assert.deepEqual(w.boundQueries, []);
});

test('actual lower-bounded Code also keeps a null declaring element and empty input annotations', () => {
  const w = dispatch({declaration: null, annotations: []});
  assert.equal(w.result.array.length, 1); assert.equal(w.result.array[0].declaration, null);
  assert.deepEqual(w.result.array[0].actual.array, []); assert.deepEqual(w.result.array[0].all.array, []);
});

test('actual explicit/unbounded upper Code retains its original bound query and annotated result identity', () => {
  for (const annotations of [[], [{marker: 'explicit upper bound'}]]) {
    const w = dispatch({upper: true, annotations});
    assert.equal(w.result, w.selectedBounds); assert.deepEqual(w.boundQueries, ['wildcard', 'raw', 'annotated']);
    assert.deepEqual(w.builds, []);
  }
});

test('compiler bootstrap artifact carries byte-identical modern wildcard bounds', {skip: process.env.DOPPIO_VERIFY_SOURCE === '1'}, () => {
  const artifact = path.join(root, 'build/modern-bootstrap-overlay/modern-bootstrap.jar');
  assert.ok(fs.statSync(artifact).isFile(), 'Mandatory compiled CI compiler overlay artifact');
  const packaged = execFileSync('unzip', ['-p', artifact, targetName + '.class'], {timeout: 10000});
  assert.deepEqual(packaged, parsedTarget().bytes, 'Compile-time and guest helper metadata/Code must agree exactly');
});
