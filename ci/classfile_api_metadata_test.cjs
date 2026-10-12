'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {after, before, test} = require('node:test');
const root = path.resolve(__dirname, '..');
const classlib = path.join(root, 'classes/modern_classlib');
const prefix = 'java/lang/classfile/';
const units = new Map();
let temporary, readStructureLayout, decodeCoreCode;
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const slash = value => value.split(path.sep).join('/');

function sources(directory) {
  const result = [];
  for (const name of fs.readdirSync(directory).sort()) {
    if (name === 'out') continue;
    const filename = path.join(directory, name);
    const stat = fs.lstatSync(filename);
    assert.ok(!stat.isSymbolicLink(), 'Source compiler must not traverse a symbolic link');
    if (stat.isDirectory()) result.push(...sources(filename));
    else if (name.endsWith('.java')) { assert.ok(stat.isFile()); result.push(filename); }
  }
  return result;
}
function checked(command, args, cwd, timeout = 120000) {
  const result = childProcess.spawnSync(command, args, {cwd, encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024});
  assert.equal(result.error, undefined, String(result.error));
  assert.equal(result.signal, null, 'Compiler/guest did not terminate by signal');
  assert.equal(result.status, 0, (result.stderr || result.stdout).slice(-8000));
  return result;
}

before(async () => {
  ({readStructureLayout} = await import('./java_class_structure_test.mjs'));
  ({decodeCoreCode} = await import('./java_core_bytecode.mjs'));
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-classfile-api-metadata-'));
  fs.chmodSync(temporary, 0o700);
  const output = path.join(temporary, 'metadata'), support = path.join(temporary, 'compile-support');
  fs.mkdirSync(output); fs.mkdirSync(support);
  const excluded = new Set(['java/lang/System$Logger.java', 'java/lang/System$DoppioLogger.java', 'sun/invoke/util/VerifyAccess.java']);
  const inputs = sources(classlib).filter(filename => !excluded.has(slash(path.relative(classlib, filename))));
  const original = inputs.map(filename => [filename, sha(fs.readFileSync(filename))]);
  const runtime = path.join(root, 'vendor/java_home/lib/rt.jar');
  const originalRuntime = sha(fs.readFileSync(runtime));
  const supportEntries = ['java/nio/file/FileTreeIterator.class', 'java/nio/file/FileTreeWalker.class',
    'java/nio/file/FileTreeWalker$1.class', 'java/nio/file/FileTreeWalker$DirectoryNode.class',
    'java/nio/file/FileTreeWalker$Event.class', 'java/nio/file/FileTreeWalker$EventType.class'];
  checked('jar', ['--extract', '--file', runtime, ...supportEntries], support);
  // Exactly the production release-9 source compilation, but with fresh private
  // output/support directories. No compiled modern_classlib/out input is read.
  checked('javac', ['-J-Dfile.encoding=UTF8', '--release', '9', '--patch-module',
    'java.base=' + classlib + path.delimiter + support, '-d', output, ...inputs], root);
  assert.deepEqual(inputs.map(filename => [filename, sha(fs.readFileSync(filename))]), original, 'Source bytes stayed fixed');
  assert.equal(sha(fs.readFileSync(runtime)), originalRuntime, 'Retained runtime JAR stayed fixed');
  for (const relative of ['ClassFileElement', 'ClassElement', 'FieldElement', 'MethodElement', 'CodeElement',
    'CompoundElement', 'AttributedElement', 'ClassModel', 'FieldModel', 'MethodModel', 'CodeModel', 'AccessFlags',
    'ClassFile', 'ClassFileBuilder', 'ClassBuilder', 'FieldBuilder', 'MethodBuilder', 'CodeBuilder', 'Attribute',
    'AttributeMapper', 'ClassReader', 'BufWriter', 'Instruction', 'Opcode', 'TypeKind',
    'attribute/SourceFileAttribute', 'attribute/CodeAttribute', 'attribute/UnknownAttribute',
    'constantpool/ConstantPool', 'constantpool/ConstantPoolBuilder', 'constantpool/PoolEntry',
    'constantpool/Utf8Entry', 'constantpool/ClassEntry', 'constantpool/LongEntry', 'constantpool/DoubleEntry',
    'constantpool/ConstantPoolException', 'constantpool/DoppioConstantPool',
    'instruction/ConstantInstruction', 'instruction/ConstantInstruction$LoadConstantInstruction',
    'instruction/LoadInstruction', 'instruction/StoreInstruction', 'instruction/ReturnInstruction',
    'instruction/FieldInstruction', 'instruction/InvokeInstruction', 'instruction/OperatorInstruction',
    'instruction/StackInstruction', 'DoppioClassReader', 'DoppioBuilders$ClassSink', 'DoppioBuilders$FieldSink',
    'DoppioBuilders$MethodSink', 'DoppioBuilders$CodeSink']) {
    const filename = path.join(output, prefix, relative + '.class');
    const stat = fs.lstatSync(filename);
    assert.ok(stat.isFile() && !stat.isSymbolicLink(), 'Genuine fresh compiled output ' + relative);
    const bytes = fs.readFileSync(filename);
    assert.equal(bytes.readUInt16BE(6), 53, 'Actual release-9 classfile, not a rewritten header');
    units.set(relative, {bytes, layout: readStructureLayout(bytes)});
  }
  assert.ok(!fs.existsSync(path.join(output, prefix, 'instruction/ConstantInstruction$ArgumentConstantInstruction.class')));
});
after(() => { if (temporary) fs.rmSync(temporary, {recursive: true, force: true}); });

function method(owner, name, descriptor) {
  const matches = units.get(owner).layout.methods.entries.filter(value => value.name === name && value.descriptor === descriptor);
  assert.equal(matches.length, 1, 'Exactly one actual declaration ' + owner + '.' + name + descriptor);
  return matches[0];
}
function code(owner, name, descriptor) {
  const unit = units.get(owner), entry = method(owner, name, descriptor);
  assert.ok(entry.code, 'Actual Java Code, not an injected native or abstract substitute');
  assert.equal(entry.flags & 0x0100, 0);
  return decodeCoreCode(unit.bytes.subarray(entry.code.instructionsOffset,
    entry.code.instructionsOffset + entry.code.codeLength), unit.layout.pool, unit.bytes);
}
function calls(owner, name, descriptor) { return code(owner, name, descriptor).filter(value => value.name.startsWith('invoke')); }
function className(unit, index) {
  const entry = unit.layout.pool[index]; assert.equal(entry.tag, 7);
  return unit.layout.pool[entry.first].value;
}
function interfaces(owner) {
  const unit = units.get(owner), layout = unit.layout;
  return Array.from({length: layout.interfaceCount}, (_, index) =>
    className(unit, unit.bytes.readUInt16BE(layout.interfacesOffset + index * 2)));
}
function integerConstant(owner, name) {
  const unit = units.get(owner), fields = unit.layout.fields.entries.filter(entry => entry.name === name && entry.descriptor === 'I');
  assert.equal(fields.length, 1); assert.equal(fields[0].flags, 0x19);
  const attribute = fields[0].attributes.entries.find(entry => entry.name === 'ConstantValue');
  assert.ok(attribute); assert.equal(attribute.length, 2);
  const constant = unit.layout.pool[unit.bytes.readUInt16BE(attribute.body)];
  assert.equal(constant.tag, 3);
  return unit.bytes.readInt32BE(constant.start + 1);
}

test('selected public models and pools are genuine compiled interfaces, not class carriers', () => {
  for (const name of ['ClassFile', 'ClassModel', 'FieldModel', 'MethodModel', 'CodeModel', 'AttributedElement',
    'CompoundElement', 'AccessFlags', 'constantpool/ConstantPool', 'constantpool/ConstantPoolBuilder',
    'constantpool/PoolEntry', 'constantpool/Utf8Entry', 'constantpool/ClassEntry', 'attribute/CodeAttribute'])
    assert.equal(units.get(name).layout.flags, 0x0601, name);
});

test('actual model interface hierarchy preserves element membership and nongeneric attributed contract', () => {
  assert.deepEqual(interfaces('ClassModel'), [prefix + 'CompoundElement', prefix + 'AttributedElement']);
  assert.deepEqual(interfaces('FieldModel'), [prefix + 'CompoundElement', prefix + 'AttributedElement', prefix + 'ClassElement']);
  assert.deepEqual(interfaces('MethodModel'), [prefix + 'CompoundElement', prefix + 'AttributedElement', prefix + 'ClassElement']);
  assert.deepEqual(interfaces('CodeModel'), [prefix + 'CompoundElement', prefix + 'AttributedElement', prefix + 'MethodElement']);
  assert.deepEqual(interfaces('AttributedElement'), [prefix + 'ClassFileElement']);
  assert.ok(!units.get('AttributedElement').layout.attributes.entries.some(value => value.name === 'Signature'));
});

test('public model accessors retain exact Java25 erased signatures', () => {
  for (const [owner, name, descriptor] of [
    ['ClassModel', 'constantPool', '()Ljava/lang/classfile/constantpool/ConstantPool;'],
    ['ClassModel', 'thisClass', '()Ljava/lang/classfile/constantpool/ClassEntry;'],
    ['FieldModel', 'parent', '()Ljava/util/Optional;'], ['MethodModel', 'code', '()Ljava/util/Optional;'],
    ['CodeModel', 'exceptionHandlers', '()Ljava/util/List;'], ['AccessFlags', 'location', '()Ljava/lang/reflect/AccessFlag$Location;'],
    ['AttributedElement', 'attributes', '()Ljava/util/List;']]) {
    assert.equal(method(owner, name, descriptor).flags, 0x0401);
  }
  assert.equal(method('FieldModel', 'fieldTypeSymbol', '()Ljava/lang/constant/ClassDesc;').flags, 1);
  assert.equal(method('MethodModel', 'methodTypeSymbol', '()Ljava/lang/constant/MethodTypeDesc;').flags, 1);
});

test('Code maxima belong to actual CodeAttribute, not invented CodeModel accessors', () => {
  assert.deepEqual(interfaces('attribute/CodeAttribute'), [prefix + 'Attribute', prefix + 'CodeModel']);
  for (const name of ['maxStack', 'maxLocals', 'codeLength']) {
    assert.equal(method('attribute/CodeAttribute', name, '()I').flags, 0x0401);
    assert.ok(!units.get('CodeModel').layout.methods.entries.some(value => value.name === name));
  }
  assert.equal(method('attribute/CodeAttribute', 'codeArray', '()[B').flags, 0x0401);
});

test('real pool indexing preserves the exact generic typed-entry erasure and error superclass', () => {
  assert.equal(method('constantpool/ConstantPool', 'entryByIndex', '(I)Ljava/lang/classfile/constantpool/PoolEntry;').flags, 0x0401);
  assert.equal(method('constantpool/ConstantPool', 'entryByIndex',
    '(ILjava/lang/Class;)Ljava/lang/classfile/constantpool/PoolEntry;').flags, 0x0401);
  const exception = units.get('constantpool/ConstantPoolException');
  assert.equal(className(exception, exception.bytes.readUInt16BE(exception.layout.superClassOffset)), 'java/lang/IllegalArgumentException');
});

test('actual public factory bodies execute checked Java engine calls', () => {
  const factory = calls('constantpool/ConstantPoolBuilder', 'of', '()Ljava/lang/classfile/constantpool/ConstantPoolBuilder;');
  assert.ok(factory.some(value => value.cp.owner === 'java.lang.classfile.constantpool.DoppioConstantPool' && value.cp.name === '<init>'));
  const api = calls('ClassFile', 'of', '()Ljava/lang/classfile/ClassFile;');
  assert.ok(api.some(value => value.cp.owner === 'java.lang.classfile.DoppioClassFile' && value.cp.name === '<init>'));
});

test('fresh Java pool decode and encode use true modified-UTF and byte writers', () => {
  const decode = calls('constantpool/DoppioConstantPool', 'decode', '([B[I)Ljava/lang/classfile/constantpool/DoppioConstantPool;');
  assert.ok(decode.some(value => value.cp.owner === 'java.io.DataInputStream' && value.cp.name === 'readUTF'));
  const encode = calls('constantpool/DoppioConstantPool', 'encode', '()[B');
  assert.ok(encode.some(value => value.cp.owner === 'java.io.DataOutputStream' && value.cp.name === 'writeShort'));
  assert.ok(encode.some(value => value.cp.owner === 'java.io.DataOutputStream' && value.cp.name === 'write'));
});

test('fresh class reader is independent Java Code with the actual pool decoder call', () => {
  const invoke = calls('DoppioClassReader', 'parse', '([B)Ljava/lang/classfile/ClassModel;');
  assert.ok(invoke.some(value => value.cp.owner === 'java.lang.classfile.constantpool.DoppioConstantPool' && value.cp.name === 'decode'));
  assert.ok(!invoke.some(value => /DoppioClassFileVerifier|ClassLoader|Doppio\.VM/.test(value.cp.owner)));
});

test('actual Code helpers use the true CodeAttribute accessors and defensive original arrays', () => {
  const bytes = calls('DoppioClassReader', 'codeBytes', '(Ljava/lang/classfile/CodeModel;)[B');
  assert.ok(bytes.some(value => value.cp.owner === 'java.lang.classfile.attribute.CodeAttribute' && value.cp.name === 'codeArray'));
  assert.ok(bytes.some(value => value.cp.name === 'clone'));
  for (const name of ['maxStack', 'maxLocals']) {
    assert.ok(calls('DoppioClassReader', name, '(Ljava/lang/classfile/CodeModel;)I')
      .some(value => value.cp.owner === 'java.lang.classfile.attribute.CodeAttribute' && value.cp.name === name));
  }
});

test('compiled builder implementations preserve typed with methods and actual erased Java bridges', () => {
  for (const kind of ['Class', 'Field', 'Method', 'Code']) {
    const owner = 'DoppioBuilders$' + kind + 'Sink';
    assert.equal(method(owner, 'with', '(Ljava/lang/classfile/' + kind + 'Element;)Ljava/lang/classfile/' + kind + 'Builder;').flags, 1);
    const erased = '(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;';
    assert.equal(method(owner, 'with', erased).flags, 0x1041);
    assert.ok(calls(owner, 'with', erased).some(value => value.cp.name === 'with' &&
      value.cp.descriptor === '(Ljava/lang/classfile/' + kind + 'Element;)Ljava/lang/classfile/' + kind + 'Builder;'));
  }
});

test('selected instruction types expose native public operand descriptors without boxed covariance substitutes', () => {
  assert.equal(method('instruction/ConstantInstruction', 'constantValue', '()Ljava/lang/constant/ConstantDesc;').flags, 0x0401);
  assert.equal(method('instruction/ConstantInstruction$LoadConstantInstruction', 'constantEntry',
    '()Ljava/lang/classfile/constantpool/LoadableConstantEntry;').flags, 0x0401);
  assert.equal(method('instruction/FieldInstruction', 'field', '()Ljava/lang/classfile/constantpool/FieldRefEntry;').flags, 0x0401);
  assert.equal(method('instruction/InvokeInstruction', 'method', '()Ljava/lang/classfile/constantpool/MemberRefEntry;').flags, 0x0401);
  assert.ok(!units.get('instruction/ConstantInstruction').layout.methods.entries.some(value => ['ofIntrinsic', 'ofArgument'].includes(value.name)));
  assert.ok(!units.get('AccessFlags').layout.methods.entries.some(value => value.name.startsWith('of')));
});

test('compiled pool tags and public access masks are actual classfile ConstantValue data', () => {
  for (const [name, value] of [['TAG_UTF8', 1], ['TAG_LONG', 5], ['TAG_DOUBLE', 6], ['TAG_CLASS', 7], ['TAG_METHOD_HANDLE', 15],
    ['TAG_DYNAMIC', 17], ['TAG_INVOKE_DYNAMIC', 18], ['TAG_MODULE', 19], ['TAG_PACKAGE', 20]])
    assert.equal(integerConstant('constantpool/PoolEntry', name), value);
  for (const [name, value] of [['ACC_PUBLIC', 1], ['ACC_FINAL', 16], ['ACC_SUPER', 32], ['ACC_STATIC', 8],
    ['ACC_NATIVE', 256], ['JAVA_25_VERSION', 69]]) assert.equal(integerConstant('ClassFile', name), value);
});

test('actual complete opcode metadata is enum-shaped while unselected behavior remains unclaimed', () => {
  const unit = units.get('Opcode');
  assert.equal(unit.layout.flags, 0x4031);
  assert.equal(unit.layout.fields.entries.filter(value => value.flags === 0x4019).length, 213);
  assert.ok(!unit.layout.fields.entries.some(value => value.name === 'WIDE'));
  assert.equal(method('Opcode', 'bytecode', '()I').flags, 1);
  assert.equal(method('Opcode', 'isWide', '()Z').flags, 1);
});

function runDiagnosticMain(name, marker) {
  const output = path.join(temporary, name);
  fs.mkdirSync(output);
  // The new package is not exported by release-9 java.base metadata. Compile
  // the diagnostic source as part of the patched module, then run its genuine
  // classpath bytes in the guest. No add-exports/release bypass is used.
  checked('javac', ['--release', '9', '--patch-module', 'java.base=' + path.join(classlib, 'out') +
    path.delimiter + path.join(root, 'ci'), '-d', output, path.join(root, 'ci', name + '.java')], root);
  const result = checked(process.execPath, ['--no-deprecation', path.join(root, 'build/release-cli/console/runner.js'),
    '-cp', output, 'classes.modern_test.' + name], root, 60000);
  assert.equal(result.stdout.replaceAll('\r\n', '\n'), marker + '\n');
  assert.equal(result.stderr, '');
}

test('actual guest public verifier rejects diagnostic type/state failures without defining classes', () => {
  runDiagnosticMain('ClassFileVerifierRegression', 'CLASSFILE_VERIFIER_REGRESSION_OK|15');
});

test('actual guest public pools retain only the exact source and reject divergent sibling raw-copy authority', () => {
  runDiagnosticMain('ClassFilePoolRegression', 'CLASSFILE_POOL_REGRESSION_OK|10');
});
