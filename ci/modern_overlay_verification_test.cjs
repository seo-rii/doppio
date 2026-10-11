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
  'java/lang/reflect/Constructor', 'java/lang/reflect/AccessibleObject',
  'sun/reflect/annotation/TypeAnnotation$LocationInfo', 'sun/reflect/annotation/AnnotatedTypeFactory',
  'sun/reflect/generics/reflectiveObjects/ParameterizedTypeImpl', 'java/lang/ClassLoader',
  'java/lang/System', 'java/lang/Runtime', 'java/lang/Character', 'java/lang/Math', 'java/lang/StrictMath',
  'java/lang/AbstractStringBuilder', 'java/lang/StringBuilder', 'java/lang/StringBuffer', 'java/lang/String',
  'java/util/regex/Pattern', 'java/util/concurrent/TimeUnit', 'java/time/Duration',
  'java/lang/invoke/MethodHandles', 'java/lang/invoke/MethodHandle', 'java/lang/invoke/MethodHandles$Lookup',
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
  ['sun/reflect/generics/reflectiveObjects/ParameterizedTypeImpl.toString', [97, 112, 124, 164, 195, 204]]
]);
let inventory;
const filterArgumentsDescriptor = '(Ljava/lang/invoke/MethodHandle;I[Ljava/lang/invoke/MethodHandle;)Ljava/lang/invoke/MethodHandle;';
let filterArgumentsOverlay;
let stockFilterArgument;

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
    for (const member of afterLayout.methods.entries) {
      if (!member.code) continue;
      const code = member.code;
      const bytes = overlaid.subarray(code.instructionsOffset, code.instructionsOffset + code.codeLength);
      const old = beforeLayout.methods.entries.find(other => other.descriptor === member.descriptor &&
        (other.name === member.name || className === 'java/time/Duration' &&
          member.name === 'toBigDecimalSeconds' && other.name === 'toSeconds'));
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

test('overlay inventory preserves 113 prior bodies and adds one filter delegate while retaining 1271 stock Code attributes', () => {
  assert.equal(inventory.selected.length, 36);
  assert.equal(inventory.generated.length, 114);
  assert.equal(inventory.unchanged, 1271);
  const identity = inventory.generated.map(({className, member, bytes}) =>
    [className, member.name, member.descriptor, member.flags, member.code.maxStack, member.code.maxLocals,
      bytes.toString('hex')]);
  const priorIdentity = identity.filter(([className, name, descriptor]) =>
    className !== 'java/lang/invoke/MethodHandles' || name !== 'filterArguments' ||
    descriptor !== filterArgumentsDescriptor);
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

test('eleven branchful overlays declare all 43 full frames at exact instruction boundaries', () => {
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
  assert.equal(frameCount, 43);
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
  assert.equal(rejected, 11, 'bootstrap identity must not exempt missing frames');
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
  t.diagnostic('114 generated methods checked; ' + obligations + ' metadata obligations remain for linking');
});

test('all original and generated Code methods in transformed bootstrap classes pass pure verification', t => {
  assert.equal(inventory.all.length, 1385);
  const {failures, obligations} = verifyAll(inventory.all);
  assert.deepEqual(failures, []);
  t.diagnostic('1385 methods checked; ' + obligations + ' metadata obligations remain for linking');
});
