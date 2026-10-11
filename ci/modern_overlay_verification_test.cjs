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
  ['sun/reflect/annotation/TypeAnnotation$LocationInfo.popLocation', [25, 27]],
  ['sun/reflect/annotation/AnnotatedTypeFactory.addNesting', [9, 30, 42, 54, 77, 109, 123]],
  ['sun/reflect/generics/reflectiveObjects/ParameterizedTypeImpl.toString', [97, 112, 124, 164, 195, 204]]
]);
let inventory;

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

test('overlay inventory preserves all 112 generated instruction bodies and 1273 stock Code attributes', () => {
  assert.equal(inventory.selected.length, 36);
  assert.equal(inventory.generated.length, 112);
  assert.equal(inventory.unchanged, 1273);
  const identity = inventory.generated.map(({className, member, bytes}) =>
    [className, member.name, member.descriptor, member.flags, member.code.maxStack, member.code.maxLocals,
      bytes.toString('hex')]);
  // Captured before adding StackMapTable metadata; CP additions must stay after
  // existing entries so no instruction operand or stack/local limit changes.
  assert.equal(createHash('sha256').update(JSON.stringify(identity)).digest('hex'),
    '74ad687fb07685b7c66dec51de7b8d7c6249e987ceb50b5f9f88014621b1ef30');
  for (const name of ['java/lang/Object', 'java/lang/reflect/AnnotatedElement', 'java/lang/reflect/Type']) {
    const original = execFileSync('unzip', ['-p', rtJar, name + '.class'], {timeout: 10000});
    assert.deepEqual(applyModernBootstrapOverlays('L' + name + ';', original), original);
  }
});

test('ten branchful overlays declare all 42 full frames at exact instruction boundaries', () => {
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
  assert.equal(frameCount, 42);
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
  assert.equal(rejected, 10, 'bootstrap identity must not exempt missing frames');
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
  t.diagnostic('112 generated methods checked; ' + obligations + ' metadata obligations remain for linking');
});

test('all original and generated Code methods in transformed bootstrap classes pass pure verification', t => {
  assert.equal(inventory.all.length, 1385);
  const {failures, obligations} = verifyAll(inventory.all);
  assert.deepEqual(failures, []);
  t.diagnostic('1385 methods checked; ' + obligations + ' metadata obligations remain for linking');
});
