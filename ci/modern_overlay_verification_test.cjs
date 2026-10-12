'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const {before, test} = require('node:test');
const repoRoot = path.resolve(__dirname, '..');
const runtimeRoot = process.env.DOPPIO_RELEASE_CLI_ROOT || path.join(repoRoot, 'build/release-cli');
const {ReferenceClassData} = require(path.join(runtimeRoot, 'src/ClassData'));
const {StackMapTableEntryType} = require(path.join(runtimeRoot, 'src/enums'));
const {Code} = require(path.join(runtimeRoot, 'src/attributes'));
const cache = {};

// Source mode does not replace shared build artifacts while the verifier and
// bootstrap overlays are developed independently. CI uses compiled modules.
function load(name) {
  const filename = path.join(runtimeRoot, 'src', name + '.js');
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(filename);
  if (cache[name]) return cache[name].exports;
  const Module = require('node:module');
  const ts = require('typescript');
  const loaded = new Module(filename, module);
  cache[name] = loaded;
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = id => /^\.\/Bytecode(?:Type)?Verifier$/.test(id) ? load(id.slice(2)) : originalRequire(id);
  const source = fs.readFileSync(path.join(repoRoot, 'src', name + '.ts'), 'utf8');
  loaded._compile(ts.transpileModule(source, {compilerOptions: {
    target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS
  }}).outputText, filename);
  return loaded.exports;
}

const {applyModernBootstrapOverlays, ClassLoader} = load('ClassLoader');
const {decodeMethodCode, BytecodeVerificationError} = load('BytecodeVerifier');
const {verifyMethodTypes} = load('BytecodeTypeVerifier');
const rtJar = path.join(repoRoot, 'vendor/java_home/lib/rt.jar');
const exactClasses = [
  'java/lang/Thread', 'java/lang/ref/Reference', 'java/lang/Class', 'java/lang/reflect/Executable',
  'java/lang/reflect/Constructor', 'java/lang/reflect/AccessibleObject', 'java/lang/reflect/Field',
  'sun/reflect/annotation/TypeAnnotation$LocationInfo', 'sun/reflect/annotation/AnnotatedTypeFactory',
  'sun/reflect/generics/reflectiveObjects/ParameterizedTypeImpl', 'java/lang/ClassLoader',
  'java/lang/System', 'java/lang/Runtime', 'java/lang/Character', 'java/lang/Math', 'java/lang/StrictMath',
  'java/lang/AbstractStringBuilder', 'java/lang/StringBuilder', 'java/lang/StringBuffer', 'java/lang/String',
  'java/util/regex/Pattern', 'java/util/concurrent/TimeUnit', 'java/time/Duration',
  'java/lang/invoke/MethodHandles', 'java/lang/invoke/MethodHandle', 'java/lang/invoke/MethodHandleImpl',
  'java/lang/invoke/MethodHandles$Lookup',
  'java/nio/MappedByteBuffer'
];
const expectedFrames = new Map([
  ['java/lang/reflect/Executable.getAnnotatedReceiverType', [12]],
  ['java/lang/reflect/Constructor.getAnnotatedReceiverType', [16, 27, 39]],
  ['java/lang/reflect/Executable.parameterize', [24, 31, 38, 60]],
  ['java/lang/reflect/AccessibleObject.canAccess', [14, 57, 70, 78, 84, 96, 99, 108, 133]],
  ['java/lang/reflect/AccessibleObject.trySetAccessible', [17, 41]],
  ['sun/reflect/annotation/AnnotatedTypeFactory$AnnotatedTypeBaseImpl.getAnnotatedOwnerType', [23, 37, 67, 81]],
  ['sun/reflect/annotation/AnnotatedTypeFactory$AnnotatedParameterizedTypeImpl.getAnnotatedOwnerType', [21, 51, 65, 93]],
  ['sun/reflect/annotation/AnnotatedTypeFactory$AnnotatedWildcardTypeImpl.getAnnotatedUpperBounds', [36]],
  ['sun/reflect/annotation/TypeAnnotation$LocationInfo.popLocation', [25, 27]],
  ['sun/reflect/annotation/AnnotatedTypeFactory.addNesting', [9, 30, 42, 54, 77, 109, 123]],
  ['sun/reflect/generics/reflectiveObjects/ParameterizedTypeImpl.toString', [97, 112, 124, 164, 195, 204]],
  ['java/lang/invoke/MethodHandleImpl.checkSpreadArgument', [9, 31, 34, 45, 68]]
]);
let inventory;
const filterArgumentsDescriptor = '(Ljava/lang/invoke/MethodHandle;I[Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;';
let filterArgumentsOverlay;
let stockFilterArgument;
const withVarargsDescriptor = '(Z)Ljava/lang/invoke/MethodHandle;';
let withVarargsOverlay;
const spreadArgumentDescriptor = '(Ljava/lang/Object;I)V';
let spreadArgumentOverlay;
const varHandleFactories = [
  ['java/lang/invoke/MethodHandles', 'arrayElementVarHandle', '(Ljava/lang/Class;)Ljava/lang/invoke/VarHandle;', 1,
    '(Ljava/lang/Class<*>;)Ljava/lang/invoke/VarHandle;', []],
  ['java/lang/invoke/MethodHandles', 'varHandleInvoker', '(Ljava/lang/invoke/VarHandle$AccessMode;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;', 2, null, []],
  ['java/lang/invoke/MethodHandles', 'varHandleExactInvoker', '(Ljava/lang/invoke/VarHandle$AccessMode;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;', 2, null, []],
  ['java/lang/invoke/MethodHandles$Lookup', 'findVarHandle', '(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/Class;)Ljava/lang/invoke/VarHandle;', 4,
    '(Ljava/lang/Class<*>;Ljava/lang/String;Ljava/lang/Class<*>;)Ljava/lang/invoke/VarHandle;', ['java/lang/NoSuchFieldException', 'java/lang/IllegalAccessException']],
  ['java/lang/invoke/MethodHandles$Lookup', 'findStaticVarHandle', '(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/Class;)Ljava/lang/invoke/VarHandle;', 4,
    '(Ljava/lang/Class<*>;Ljava/lang/String;Ljava/lang/Class<*>;)Ljava/lang/invoke/VarHandle;', ['java/lang/NoSuchFieldException', 'java/lang/IllegalAccessException']],
  ['java/lang/invoke/MethodHandles$Lookup', 'unreflectVarHandle', '(Ljava/lang/reflect/Field;)Ljava/lang/invoke/VarHandle;', 2,
    null, ['java/lang/IllegalAccessException']]
];
const virtualDescriptor = '(Ljava/lang/Class;Ljava/lang/String;Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;';
const isVarHandleDelegate = (className, name, descriptor) =>
  varHandleFactories.some(entry => entry[0] === className && entry[1] === name && entry[2] === descriptor) ||
  className === 'java/lang/invoke/MethodHandles$Lookup' && name === 'findVirtual' && descriptor === virtualDescriptor;
const hiddenFieldSetters = new Set(['set', 'setBoolean', 'setByte', 'setChar', 'setShort', 'setInt', 'setLong', 'setFloat', 'setDouble']);
const isHiddenClassDelegate = (className, name) =>
  className === 'java/lang/invoke/MethodHandles' && ['classData', 'classDataAt'].includes(name) ||
  className === 'java/lang/invoke/MethodHandles$Lookup' &&
    ['defineHiddenClass', 'defineHiddenClassWithClassData', 'unreflectSetter'].includes(name) ||
  className === 'java/lang/reflect/Field' && hiddenFieldSetters.has(name) ||
  className === 'java/lang/Class' && name === 'getCanonicalName';
const hiddenAliases = [];
let lookupVirtualOverlay;
let lookupVirtualAlias;

before(async () => {
  const {readStructureLayout} = await import('./java_class_structure_test.mjs');
  const selected = execFileSync('unzip', ['-Z1', rtJar], {encoding: 'utf8', timeout: 10000})
    .split('\n').filter(name => name.endsWith('.class') && (exactClasses.includes(name.slice(0, -6)) ||
      name.startsWith('java/lang/reflect/Annotated') && !name.includes('AnnotatedElement') ||
      name.startsWith('sun/reflect/annotation/AnnotatedTypeFactory$Annotated'))).sort();
  const generated = [];
  const all = [];
  let unchanged = 0;
  for (const name of selected) {
    const original = execFileSync('unzip', ['-p', rtJar, name], {timeout: 10000});
    const originalCopy = Buffer.from(original);
    const className = name.slice(0, -6);
    const overlaid = applyModernBootstrapOverlays('L' + className + ';', original);
    assert.deepEqual(original, originalCopy, 'overlay must not mutate stock input bytes');
    const beforeLayout = readStructureLayout(original);
    const afterLayout = readStructureLayout(overlaid);
    const cls = new ReferenceClassData(overlaid, null, new ClassLoader(null));
    if (className === 'java/lang/invoke/MethodHandleImpl') {
      assert.equal(beforeLayout.methods.entries.length, 74);
      assert.equal(afterLayout.methods.entries.length, 74);
      const originalPoolEnd = beforeLayout.pool.filter(Boolean).at(-1).end;
      assert.deepEqual(overlaid.subarray(10, originalPoolEnd),
        original.subarray(10, originalPoolEnd), 'stock constant-pool bytes remain unchanged');
      const overlaidPoolEnd = afterLayout.pool.filter(Boolean).at(-1).end;
      assert.deepEqual(overlaid.subarray(overlaidPoolEnd, afterLayout.methods.countOffset + 2),
        original.subarray(originalPoolEnd, beforeLayout.methods.countOffset + 2),
        'class metadata, interfaces, fields and method count remain unchanged');
      assert.deepEqual(overlaid.subarray(afterLayout.methods.end), original.subarray(beforeLayout.methods.end),
        'all class attributes remain unchanged');
      for (const old of beforeLayout.methods.entries) {
        if (old.name === 'checkSpreadArgument' && old.descriptor === spreadArgumentDescriptor) continue;
        const member = afterLayout.methods.entries.find(candidate => candidate.name === old.name &&
          candidate.descriptor === old.descriptor);
        assert.ok(member, 'retain all 73 other stock MethodHandleImpl methods');
        assert.deepEqual(overlaid.subarray(member.start, member.end), original.subarray(old.start, old.end),
          'preserve the whole other stock method and all its metadata');
      }
    }
    if (className === 'java/lang/invoke/MethodHandle') {
      for (const old of beforeLayout.methods.entries) {
        const member = afterLayout.methods.entries.find(candidate => candidate.name === old.name &&
          candidate.descriptor === old.descriptor);
        assert.ok(member, 'retain every stock MethodHandle method');
        assert.deepEqual(overlaid.subarray(member.start, member.end), original.subarray(old.start, old.end),
          'preserve the whole stock MethodHandle method and all its metadata');
      }
    }
    for (const member of afterLayout.methods.entries) {
      if (!member.code) continue;
      const code = member.code;
      const bytes = overlaid.subarray(code.instructionsOffset, code.instructionsOffset + code.codeLength);
      const old = beforeLayout.methods.entries.find(other => other.descriptor === member.descriptor &&
        (other.name === member.name || className === 'java/time/Duration' &&
          member.name === 'toBigDecimalSeconds' && other.name === 'toSeconds' ||
          className === 'java/lang/invoke/MethodHandles$Lookup' &&
          member.name === 'doppioFindVirtualBase' && other.name === 'findVirtual' ||
          className === 'java/lang/invoke/MethodHandles$Lookup' &&
          member.name === 'doppioHiddenFinalBase$unreflectSetter' && other.name === 'unreflectSetter' ||
          className === 'java/lang/reflect/Field' &&
          member.name === 'doppioHiddenFinalBase$' + other.name && hiddenFieldSetters.has(other.name) ||
          className === 'java/lang/Class' && member.name === 'doppioHiddenCanonicalNameBase' && other.name === 'getCanonicalName'));
      if (member.name.startsWith('doppioHiddenFinalBase$') || member.name === 'doppioHiddenCanonicalNameBase') {
        assert.ok(old?.code, 'C5 alias has an exact stock declaration');
        assert.equal(member.flags, (old.flags & ~7) | 2, 'Only public access changes to private');
        assert.deepEqual(overlaid.subarray(member.code.start, member.code.end), original.subarray(old.code.start, old.code.end),
          'C5 preserves complete alias Code and StackMapTable bytes');
        hiddenAliases.push({className, member, old});
      }
      if (className === 'java/lang/invoke/MethodHandles$Lookup' && member.descriptor === virtualDescriptor) {
        if (member.name === 'findVirtual') lookupVirtualOverlay = {original, overlaid, old, member, pool: afterLayout.pool};
        if (member.name === 'doppioFindVirtualBase') lookupVirtualAlias = {original, overlaid, old, member, pool: afterLayout.pool};
      }
      if (className === 'java/lang/invoke/MethodHandles' && member.name === 'filterArguments' &&
        member.descriptor === filterArgumentsDescriptor) {
        assert.ok(!filterArgumentsOverlay, 'exactly one public filterArguments overload');
        filterArgumentsOverlay = {original, overlaid, old, member, pool: afterLayout.pool};
      }
      if (className === 'java/lang/invoke/MethodHandles' && member.name === 'filterArgument' &&
        member.descriptor === '(Ljava/lang/invoke/MethodHandle;ILjava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;') {
        assert.ok(!stockFilterArgument, 'exactly one stock filterArgument helper');
        stockFilterArgument = {original, overlaid, old, member};
      }
      if (className === 'java/lang/invoke/MethodHandle' && member.name === 'withVarargs' &&
        member.descriptor === withVarargsDescriptor) {
        assert.equal(old, undefined, 'withVarargs is absent from the stock Java 8 hierarchy');
        assert.ok(!withVarargsOverlay, 'exactly one modern withVarargs method');
        withVarargsOverlay = {member, pool: afterLayout.pool};
      }
      if (className === 'java/lang/invoke/MethodHandleImpl' && member.name === 'checkSpreadArgument' &&
        member.descriptor === spreadArgumentDescriptor) {
        assert.ok(!spreadArgumentOverlay, 'exactly one stock spread validator');
        spreadArgumentOverlay = {original, overlaid, old, member, pool: afterLayout.pool};
      }
      const method = cls.getMethods().find(candidate => candidate.name === member.name &&
        candidate.rawDescriptor === member.descriptor);
      assert.ok(method && method.declaredCode, 'verify the retained pre-trap Code attribute');
      const entry = {className, member, bytes, input: {
        className: cls.getInternalName(), superClassName: cls.getSuperClassReference().name,
        majorVersion: cls.majorVersion, name: method.name, descriptor: method.rawDescriptor,
        declaredAccessFlags: method.declaredAccessFlags, declaredCode: method.declaredCode,
        constantPool: cls.constantPool
      }};
      all.push(entry);
      if (old?.code && bytes.equals(original.subarray(old.code.instructionsOffset,
        old.code.instructionsOffset + old.code.codeLength))) {
        assert.deepEqual(overlaid.subarray(code.start, code.end), original.subarray(old.code.start, old.code.end),
          className + '.' + member.name + ': preserve stock Code attributes');
        unchanged++;
        continue;
      }
      generated.push(entry);
    }
  }
  inventory = {selected, generated, all, unchanged};
});

test('C5 preserves C3 and earlier body hashes, adding15 public delegates and43 untouched stock Field Code attributes', () => {
  assert.equal(inventory.selected.length, 38);
  assert.equal(inventory.generated.length, 138);
  assert.equal(inventory.unchanged, 1387);
  assert.equal(inventory.generated.filter(entry => isHiddenClassDelegate(entry.className, entry.member.name)).length, 15);
  assert.equal(hiddenAliases.length, 11);
  assert.equal(hiddenAliases.filter(entry => entry.className === 'java/lang/reflect/Field').length, 9);
  const identity = inventory.generated.map(({className, member, bytes}) =>
    [className, member.name, member.descriptor, member.flags, member.code.maxStack, member.code.maxLocals,
      bytes.toString('hex')]);
  const priorIdentity = identity.filter(([className, name, descriptor]) =>
    !isHiddenClassDelegate(className, name) &&
    !isVarHandleDelegate(className, name, descriptor) &&
    !(className === 'java/lang/invoke/MethodHandles' && name === 'filterArguments' &&
      descriptor === filterArgumentsDescriptor) &&
    !(className === 'java/lang/invoke/MethodHandle' && name === 'withVarargs' &&
      descriptor === withVarargsDescriptor) &&
    !(className === 'java/lang/invoke/MethodHandleImpl' && name === 'checkSpreadArgument' &&
      descriptor === spreadArgumentDescriptor));
  assert.equal(priorIdentity.length, 113);
  assert.equal(createHash('sha256').update(JSON.stringify(priorIdentity)).digest('hex'),
    '6aa35a51cad536fa26de66219269564fbb4124f8fbea8a2058d34b2fd937d420');
  // The original 112 generated bodies retain their pre-StackMapTable identity;
  // neither the wildcard overlay nor the filter delegate rewrites another body.
  const previousIdentity = priorIdentity.filter(([className, name]) =>
    className !== 'sun/reflect/annotation/AnnotatedTypeFactory$AnnotatedWildcardTypeImpl' ||
    name !== 'getAnnotatedUpperBounds');
  assert.equal(previousIdentity.length, 112);
  assert.equal(createHash('sha256').update(JSON.stringify(previousIdentity)).digest('hex'),
    '74ad687fb07685b7c66dec51de7b8d7c6249e987ceb50b5f9f88014621b1ef30');
  for (const name of ['java/lang/Object', 'java/lang/reflect/AnnotatedElement', 'java/lang/reflect/Type']) {
    const original = execFileSync('unzip', ['-p', rtJar, name + '.class'], {timeout: 10000});
    assert.deepEqual(applyModernBootstrapOverlays('L' + name + ';', original), original);
  }
});

test('six VarHandle factories are parsed public delegates with exact descriptors and declared metadata', () => {
  for (const [className, name, descriptor, argumentsCount, signature, exceptions] of varHandleFactories) {
    const entry = inventory.generated.find(candidate => candidate.className === className &&
      candidate.member.name === name && candidate.member.descriptor === descriptor);
    assert.ok(entry, name + ': parsed Code instead of a native trap');
    const {member, input} = entry, pool = input.constantPool;
    const lookup = className.endsWith('$Lookup');
    assert.equal(member.flags, lookup ? 0x0001 : 0x0009);
    assert.equal(member.code.maxStack, argumentsCount);
    assert.equal(member.code.maxLocals, argumentsCount);
    assert.equal(member.code.handlerCount, 0);
    assert.deepEqual(member.code.attributes.entries, []);
    assert.deepEqual(member.attributes.entries.map(attribute => attribute.name),
      ['Code', ...(signature ? ['Signature'] : []), ...(exceptions.length ? ['Exceptions'] : [])]);
    const decoded = decodeMethodCode(input);
    assert.deepEqual(decoded.instructions.map(instruction => instruction.opcode),
      [...Array.from({length: argumentsCount}, (_, index) => 0x2a + index), 0xb8, 0xb0]);
    const target = pool.get(decoded.instructions[argumentsCount].cpIndex);
    assert.equal(target.classInfo.name, 'Ljava/lang/invoke/DoppioVarHandles;');
    assert.equal(target.nameAndTypeInfo.name, name);
    assert.equal(target.nameAndTypeInfo.descriptor,
      lookup ? '(Ljava/lang/invoke/MethodHandles$Lookup;' + descriptor.slice(1) : descriptor);
    // Parse the emitted attribute payloads rather than trusting source declarations.
    const owner = lookup ? lookupVirtualOverlay : filterArgumentsOverlay;
    const signatureAttribute = member.attributes.entries.find(attribute => attribute.name === 'Signature');
    if (signature) assert.equal(owner.pool[owner.overlaid.readUInt16BE(signatureAttribute.body)].value, signature);
    const exceptionAttribute = member.attributes.entries.find(attribute => attribute.name === 'Exceptions');
    if (exceptions.length) {
      const count = owner.overlaid.readUInt16BE(exceptionAttribute.body);
      assert.equal(count, exceptions.length);
      assert.deepEqual(Array.from({length: count}, (_, index) => {
        const constant = owner.pool[owner.overlaid.readUInt16BE(exceptionAttribute.body + 2 + 2 * index)];
        return owner.pool[constant.first].value;
      }), exceptions);
    }
  }
});

test('Lookup findVirtual routes through a public parsed delegate but preserves the complete stock body privately', () => {
  assert.ok(lookupVirtualOverlay && lookupVirtualAlias);
  const {original, overlaid, old, member, pool} = lookupVirtualOverlay;
  const alias = lookupVirtualAlias.member;
  assert.equal(member.flags, old.flags);
  assert.equal(alias.flags, 0x0002);
  assert.equal(alias.descriptorIndex, old.descriptorIndex);
  assert.deepEqual(overlaid.subarray(alias.start + 4, alias.end), original.subarray(old.start + 4, old.end),
    'alias changes only access flags/name, preserving complete Code and non-Code attributes');
  const retained = (bytes, attributes) => attributes.entries.filter(attribute => attribute.name !== 'Code')
    .map(attribute => ({name: attribute.name, bytes: bytes.subarray(attribute.start, attribute.end)}));
  assert.deepEqual(retained(overlaid, member.attributes), retained(original, old.attributes));
  const entry = inventory.generated.find(candidate => candidate.className === 'java/lang/invoke/MethodHandles$Lookup' &&
    candidate.member.name === 'findVirtual' && candidate.member.descriptor === virtualDescriptor);
  assert.deepEqual(decodeMethodCode(entry.input).instructions.map(instruction => instruction.opcode),
    [0x2a, 0x2b, 0x2c, 0x2d, 0xb8, 0xb0]);
  assert.equal(member.code.maxStack, 4);
  assert.equal(member.code.maxLocals, 4);
  assert.equal(member.code.handlerCount, 0);
  const ref = pool[entry.bytes.readUInt16BE(5)], nameAndType = pool[ref.second];
  assert.equal(pool[pool[ref.first].first].value, 'java/lang/invoke/DoppioVarHandles');
  assert.equal(pool[nameAndType.first].value, 'findVirtual');
  assert.equal(pool[nameAndType.second].value,
    '(Ljava/lang/invoke/MethodHandles$Lookup;' + virtualDescriptor.slice(1));
});

test('withVarargs is a public nonfinal instance method with an exact parsed Code delegate', () => {
  assert.ok(withVarargsOverlay);
  const {member, pool} = withVarargsOverlay;
  assert.equal(member.flags, 0x0001, 'public, nonfinal, nonnative and nonvarargs');
  assert.deepEqual(member.attributes.entries.map(attribute => attribute.name), ['Code']);
  assert.equal(member.code.maxStack, 2);
  assert.equal(member.code.maxLocals, 2);
  assert.equal(member.code.handlerCount, 0);
  assert.deepEqual(member.code.attributes.entries, []);
  const entry = inventory.generated.find(candidate => candidate.className === 'java/lang/invoke/MethodHandle' &&
    candidate.member.name === 'withVarargs' && candidate.member.descriptor === withVarargsDescriptor);
  assert.ok(entry, 'parsed generated Code, not a native trap');
  const decoded = decodeMethodCode(entry.input);
  assert.deepEqual(decoded.instructions.map(instruction => instruction.opcode), [0x2a, 0x1b, 0xb8, 0xb0]);
  assert.equal(entry.bytes.length, 6);
  const target = pool[decoded.instructions[2].cpIndex];
  assert.equal(target?.tag, 10);
  assert.equal(pool[target.first]?.tag, 7);
  assert.equal(pool[pool[target.first].first]?.tag, 1);
  assert.equal(pool[pool[target.first].first].value, 'java/lang/invoke/DoppioMethodHandleVarargs');
  const nameAndType = pool[target.second];
  assert.equal(nameAndType?.tag, 12);
  assert.equal(pool[nameAndType.first]?.tag, 1);
  assert.equal(pool[nameAndType.first].value, 'withVarargs');
  assert.equal(pool[nameAndType.second]?.tag, 1);
  assert.equal(pool[nameAndType.second].value, '(Ljava/lang/invoke/MethodHandle;Z)Ljava/lang/invoke/MethodHandle;');
});

test('positive-length null spreading changes only its branch and retains all non-null Code paths', () => {
  assert.ok(spreadArgumentOverlay && spreadArgumentOverlay.old?.code);
  const {original, overlaid, old, member, pool} = spreadArgumentOverlay;
  assert.equal(member.flags, old.flags);
  assert.equal(member.flags, 0x0008, 'package-private static and nonnative');
  assert.equal(member.nameIndex, old.nameIndex);
  assert.equal(member.descriptorIndex, old.descriptorIndex);
  assert.equal(member.code.maxStack, old.code.maxStack);
  assert.equal(member.code.maxLocals, old.code.maxLocals);
  assert.equal(member.code.handlerCount, 0);
  const retainedAttributes = (bytes, attributes, omitted) => attributes.entries
    .filter(attribute => attribute.name !== omitted)
    .map(attribute => ({name: attribute.name, bytes: bytes.subarray(attribute.start, attribute.end)}));
  assert.deepEqual(retainedAttributes(overlaid, member.attributes, 'Code'),
    retainedAttributes(original, old.attributes, 'Code'));
  assert.deepEqual(retainedAttributes(overlaid, member.code.attributes, 'StackMapTable'),
    retainedAttributes(original, old.code.attributes, 'StackMapTable'), 'original line-number bytes remain unchanged');
  const entry = inventory.generated.find(candidate => candidate.className === 'java/lang/invoke/MethodHandleImpl' &&
    candidate.member.name === 'checkSpreadArgument' && candidate.member.descriptor === spreadArgumentDescriptor);
  assert.ok(entry, 'parsed generated Code, not a native trap');
  const originalBytes = original.subarray(old.code.instructionsOffset,
    old.code.instructionsOffset + old.code.codeLength);
  assert.equal(originalBytes.length, 68);
  assert.equal(entry.bytes.length, 76);
  assert.deepEqual(entry.bytes.subarray(0, 6), originalBytes.subarray(0, 6));
  assert.deepEqual(entry.bytes.subarray(8, 68), originalBytes.subarray(8, 68));
  assert.equal(originalBytes.readUInt16BE(6), 40);
  assert.equal(entry.bytes.readUInt16BE(6), 63);
  const decoded = decodeMethodCode(entry.input);
  assert.deepEqual(decoded.instructions.find(instruction => instruction.pc === 5).branchTargets, [68]);
  const appended = decoded.instructions.filter(instruction => instruction.pc >= 68);
  assert.deepEqual(appended.map(instruction => instruction.opcode), [0xbb, 0x59, 0xb7, 0xbf]);
  const npeClass = pool[appended[0].cpIndex];
  assert.equal(npeClass?.tag, 7);
  assert.equal(pool[npeClass.first]?.value, 'java/lang/NullPointerException');
  const constructor = pool[appended[2].cpIndex];
  assert.equal(constructor?.tag, 10);
  assert.equal(constructor.first, appended[0].cpIndex);
  const nameAndType = pool[constructor.second];
  assert.equal(nameAndType?.tag, 12);
  assert.equal(pool[nameAndType.first]?.value, '<init>');
  assert.equal(pool[nameAndType.second]?.value, '()V');
  for (const frame of decoded.stackMapFrames) {
    assert.equal(frame.entry.localsTypes.length, 2);
    assert.equal(frame.entry.localsTypes[0].className, 'Ljava/lang/Object;');
    assert.equal(frame.entry.localsTypes[1].tag, 1, 'second local is int');
  }
});

test('the null-spread overlay fails closed for an unexpected stock branch or stack-map shape', () => {
  assert.ok(spreadArgumentOverlay && spreadArgumentOverlay.old?.code);
  const {original, old} = spreadArgumentOverlay;
  const changedBranch = Buffer.from(original);
  changedBranch.writeUInt16BE(39, old.code.instructionsOffset + 6);
  assert.throws(() => applyModernBootstrapOverlays('Ljava/lang/invoke/MethodHandleImpl;', changedBranch),
    /Unsupported stock spread argument Code shape/);
  const changedFrames = Buffer.from(original);
  const frames = old.code.attributes.entries.find(attribute => attribute.name === 'StackMapTable');
  assert.ok(frames);
  changedFrames[frames.body + 2] = 8;
  assert.throws(() => applyModernBootstrapOverlays('Ljava/lang/invoke/MethodHandleImpl;', changedFrames),
    /Unsupported stock spread argument stack-map shape/);
});

test('filterArguments retains public static varargs metadata and delegates its exact parsed Code body', () => {
  assert.ok(filterArgumentsOverlay && filterArgumentsOverlay.old?.code, 'stock public filterArguments method exists');
  const {original, overlaid, old, member, pool} = filterArgumentsOverlay;
  assert.equal(member.flags, old.flags, 'preserve all original access flags');
  assert.equal(member.flags, 0x0089, 'public static varargs, non-native and non-abstract');
  const attributes = (bytes, method) => method.attributes.entries.filter(attribute => attribute.name !== 'Code')
    .map(attribute => ({name: attribute.name, bytes: bytes.subarray(attribute.start, attribute.end)}));
  assert.deepEqual(attributes(overlaid, member), attributes(original, old), 'preserve original non-Code attributes');
  assert.equal(member.code.maxStack, 3);
  assert.equal(member.code.maxLocals, 3);
  assert.equal(member.code.handlerCount, 0);
  assert.deepEqual(member.code.attributes.entries, [], 'straight-line delegate needs no nested Code attributes');
  const entry = inventory.generated.find(candidate => candidate.className === 'java/lang/invoke/MethodHandles' &&
    candidate.member.name === 'filterArguments' && candidate.member.descriptor === filterArgumentsDescriptor);
  assert.ok(entry, 'replacement is a parsed generated Code body, not a native trap');
  const decoded = decodeMethodCode(entry.input);
  assert.deepEqual(decoded.instructions.map(instruction => instruction.opcode), [0x2a, 0x1b, 0x2c, 0xb8, 0xb0],
    'aload_0, iload_1, aload_2, invokestatic, areturn');
  assert.equal(entry.bytes.length, 7, 'exact delegate instruction count and operand size');
  const target = pool[decoded.instructions[3].cpIndex];
  assert.equal(target?.tag, 10, 'invokestatic uses an actual Methodref');
  assert.equal(pool[target.first]?.tag, 7, 'exact helper Class operand');
  assert.equal(pool[pool[target.first].first]?.tag, 1);
  assert.equal(pool[pool[target.first].first].value, 'java/lang/invoke/DoppioMethodHandles');
  const nameAndType = pool[target.second];
  assert.equal(nameAndType?.tag, 12, 'exact helper NameAndType operand');
  assert.equal(pool[nameAndType.first]?.tag, 1);
  assert.equal(pool[nameAndType.first].value, 'filterArguments');
  assert.equal(pool[nameAndType.second]?.tag, 1);
  assert.equal(pool[nameAndType.second].value, filterArgumentsDescriptor);
});

test('the package-private stock filterArgument helper and all its metadata remain unchanged', () => {
  assert.ok(stockFilterArgument && stockFilterArgument.old?.code, 'stock filterArgument helper exists');
  const {original, overlaid, old, member} = stockFilterArgument;
  assert.equal(old.flags & 0x0007, 0, 'stock helper is package-private');
  assert.equal(member.flags, old.flags);
  assert.deepEqual(overlaid.subarray(member.start, member.end), original.subarray(old.start, old.end),
    'preserve the whole stock method, including Code and non-Code attributes');
  assert.ok(!inventory.generated.some(entry => entry.className === 'java/lang/invoke/MethodHandles' &&
    entry.member.name === 'filterArgument'), 'stock helper is not redirected or regenerated');
});

test('twelve branchful overlays declare all 48 full frames at exact instruction boundaries', () => {
  const found = new Map();
  let frameCount = 0;
  for (const entry of inventory.generated) {
    const decoded = decodeMethodCode(entry.input);
    const branchful = decoded.instructions.some(instruction => instruction.branchTargets.length > 0);
    if (!branchful) continue;
    const id = entry.className + '.' + entry.member.name;
    const pcs = decoded.stackMapFrames.map(frame => frame.pc);
    found.set(id, pcs);
    frameCount += pcs.length;
    for (const frame of decoded.stackMapFrames) {
      assert.equal(frame.entry.stackTypes.length, 0, id);
      assert.equal(frame.entry.type, StackMapTableEntryType.FULL_FRAME, 'explicit full frames keep metadata reviewable');
    }
  }
  assert.deepEqual(found, expectedFrames);
  assert.equal(frameCount, 48);
});

test('removing overlay frames is rejected for every branchful bootstrap method', () => {
  let rejected = 0;
  for (const {className, member, input} of inventory.generated) {
    if (!expectedFrames.has(className + '.' + member.name)) continue;
    const original = input.declaredCode;
    const withoutFrames = {...input, declaredCode: new Code(original.getMaxStack(), original.getMaxLocals(),
      original.exceptionHandlers.slice(), [], Buffer.from(original.getCode()))};
    assert.throws(() => verifyMethodTypes(withoutFrames, decodeMethodCode(withoutFrames)),
      error => error instanceof BytecodeVerificationError && /stack-map frame/.test(error.message),
      className + '.' + member.name);
    rejected++;
  }
  assert.equal(rejected, 12, 'bootstrap identity must not exempt missing frames');
});

function verifyAll(entries) {
  const failures = [];
  let obligations = 0;
  for (const entry of entries) {
    try {
      const result = verifyMethodTypes(entry.input, decodeMethodCode(entry.input));
      assert.equal(result.policy, 'stack-map');
      assert.ok(result.checkedInstructions > 0);
      obligations += result.obligations.length;
    } catch (error) {
      failures.push(entry.className + '.' + entry.member.name + ': ' + error.message);
    }
  }
  return {failures, obligations};
}

test('every generated overlay body passes pure decoding and type checking without bootstrap exemptions', t => {
  const {failures, obligations} = verifyAll(inventory.generated);
  assert.deepEqual(failures, []);
  assert.ok(obligations > 0, 'symbolic obligations are retained, not bypassed or claimed discharged');
  t.diagnostic('138 generated methods checked; ' + obligations + ' metadata obligations remain for linking');
});

test('all original and generated Code methods in transformed bootstrap classes pass pure verification', t => {
  assert.equal(inventory.all.length, 1525);
  const {failures, obligations} = verifyAll(inventory.all);
  assert.deepEqual(failures, []);
  t.diagnostic('1525 methods checked; ' + obligations + ' metadata obligations remain for linking');
});
