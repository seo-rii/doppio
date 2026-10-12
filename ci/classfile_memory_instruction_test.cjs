'use strict';

const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {before, after, test} = require('node:test');
const {compileClassFileMetadata, runClassFileMetadataGuest} = require('./compile_classfile_metadata.cjs');
const root = path.resolve(__dirname, '..'), classlib = path.join(root, 'classes/modern_classlib');
const units = new Map(), prefix = 'java/lang/classfile/';
const models = ['ArrayLoadInstruction', 'ArrayStoreInstruction', 'NewPrimitiveArrayInstruction',
  'NewReferenceArrayInstruction', 'NewMultiArrayInstruction', 'TypeCheckInstruction', 'MonitorInstruction'];
let temporary, output, decodeCoreCode;
function checked(command, args, cwd = root, timeout = 120000) {
  const result = cp.spawnSync(command, args, {cwd, encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024});
  assert.equal(result.error, undefined, String(result.error)); assert.equal(result.signal, null);
  assert.equal(result.status, 0, (result.stderr || result.stdout).slice(-6000)); return result;
}
before(async () => {
  const {readStructureLayout} = await import('./java_class_structure_test.mjs');
  ({decodeCoreCode} = await import('./java_core_bytecode.mjs'));
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-classfile-memory-instruction-')); fs.chmodSync(temporary, 0o700);
  output = path.join(temporary, 'compiled'); const support = path.join(temporary, 'support');
  fs.mkdirSync(output); fs.mkdirSync(support);
  compileClassFileMetadata({root, classlib, output, support, checked});
  for (const relative of [...models.map(name => 'instruction/' + name), 'instruction/DoppioMemoryInstructions',
    'constantpool/DoppioConstantPool', 'CodeBuilder', 'DoppioClassReader', 'Opcode', 'Opcode$Kind']) {
    const filename = path.join(output, prefix, relative + '.class'), stat = fs.lstatSync(filename);
    assert.ok(stat.isFile() && !stat.isSymbolicLink()); const bytes = fs.readFileSync(filename);
    assert.equal(bytes.readUInt16BE(6), 53, 'Naturally target-9 source output, not a rewritten header');
    units.set(relative, {bytes, layout: readStructureLayout(bytes)});
  }
});
after(() => { if (temporary) fs.rmSync(temporary, {recursive: true, force: true}); });
function method(owner, name, descriptor) {
  const found = units.get(owner).layout.methods.entries.filter(value => value.name === name && value.descriptor === descriptor);
  assert.equal(found.length, 1, owner + '.' + name + descriptor); return found[0];
}
function calls(owner, name, descriptor) {
  const unit = units.get(owner), entry = method(owner, name, descriptor);
  assert.ok(entry.code); assert.equal(entry.flags & 0x100, 0, 'Actual Java code, not an injected native');
  return decodeCoreCode(unit.bytes.subarray(entry.code.instructionsOffset, entry.code.instructionsOffset + entry.code.codeLength),
    unit.layout.pool, unit.bytes).filter(value => value.name.startsWith('invoke'));
}
function factory(owner, descriptor) {
  assert.equal(method('instruction/' + owner, 'of', descriptor).flags, 9);
  assert.ok(calls('instruction/' + owner, 'of', descriptor).some(value =>
    value.cp.owner === 'java.lang.classfile.instruction.DoppioMemoryInstructions' && value.cp.descriptor === descriptor));
}
test('seven memory models are actual public native-shaped interfaces with exact getter descriptors', () => {
  for (const name of models) {
    const unit = units.get('instruction/' + name), layout = unit.layout; assert.equal(layout.flags, 0x601);
    assert.equal(layout.interfaceCount, 1);
    const entry = layout.pool[unit.bytes.readUInt16BE(layout.interfacesOffset)]; assert.equal(entry.tag, 7);
    assert.equal(layout.pool[entry.first].value, prefix + 'Instruction');
  }
  for (const [owner, name, result] of [['ArrayLoadInstruction', 'typeKind', 'Ljava/lang/classfile/TypeKind;'],
    ['ArrayStoreInstruction', 'typeKind', 'Ljava/lang/classfile/TypeKind;'], ['NewPrimitiveArrayInstruction', 'typeKind', 'Ljava/lang/classfile/TypeKind;'],
    ['NewReferenceArrayInstruction', 'componentType', 'Ljava/lang/classfile/constantpool/ClassEntry;'],
    ['NewMultiArrayInstruction', 'arrayType', 'Ljava/lang/classfile/constantpool/ClassEntry;'], ['NewMultiArrayInstruction', 'dimensions', 'I'],
    ['TypeCheckInstruction', 'type', 'Ljava/lang/classfile/constantpool/ClassEntry;']])
    assert.equal(method('instruction/' + owner, name, '()' + result).flags, 0x401);
});
test('all native memory factories execute real helper values, including both type-check overloads', () => {
  for (const [owner, operands] of [['ArrayLoadInstruction', 'Ljava/lang/classfile/Opcode;'], ['ArrayStoreInstruction', 'Ljava/lang/classfile/Opcode;'],
    ['NewPrimitiveArrayInstruction', 'Ljava/lang/classfile/TypeKind;'], ['NewReferenceArrayInstruction', 'Ljava/lang/classfile/constantpool/ClassEntry;'],
    ['NewMultiArrayInstruction', 'Ljava/lang/classfile/constantpool/ClassEntry;I'], ['MonitorInstruction', 'Ljava/lang/classfile/Opcode;'],
    ['TypeCheckInstruction', 'Ljava/lang/classfile/Opcode;Ljava/lang/classfile/constantpool/ClassEntry;'],
    ['TypeCheckInstruction', 'Ljava/lang/classfile/Opcode;Ljava/lang/constant/ClassDesc;']])
    factory(owner, '(' + operands + ')Ljava/lang/classfile/instruction/' + owner + ';');
});
test('all modern operator, stack, and array convenience aliases execute the exact typed factory', () => {
  for (const [owner, names] of [
    ['OperatorInstruction', ['iadd','ladd','fadd','dadd','isub','lsub','fsub','dsub','imul','lmul','fmul','dmul','idiv','ldiv','fdiv','ddiv',
      'irem','lrem','frem','drem','ineg','lneg','fneg','dneg','ishl','lshl','ishr','lshr','iushr','lushr','iand','land','ior','lor','ixor','lxor',
      'lcmp','fcmpl','fcmpg','dcmpl','dcmpg','arraylength']],
    ['StackInstruction', ['pop','pop2','dup','dup_x1','dup_x2','dup2','dup2_x1','dup2_x2','swap']],
    ['ArrayLoadInstruction', ['iaload','laload','faload','daload','aaload','baload','caload','saload']],
    ['ArrayStoreInstruction', ['iastore','lastore','fastore','dastore','aastore','bastore','castore','sastore']]
  ]) for (const name of names) {
    assert.equal(method('CodeBuilder', name, '()Ljava/lang/classfile/CodeBuilder;').flags, 1);
    assert.ok(calls('CodeBuilder', name, '()Ljava/lang/classfile/CodeBuilder;').some(value =>
      value.cp.owner === 'java.lang.classfile.instruction.' + owner && value.cp.name === 'of'));
  }
});
test('array/type/monitor aliases retain native operand signatures and nominal pool conversion', () => {
  for (const [name, parameters] of [['arrayLoad', 'Ljava/lang/classfile/TypeKind;'], ['arrayStore', 'Ljava/lang/classfile/TypeKind;'],
    ['newarray', 'Ljava/lang/classfile/TypeKind;'], ['anewarray', 'Ljava/lang/classfile/constantpool/ClassEntry;'], ['anewarray', 'Ljava/lang/constant/ClassDesc;'],
    ['multianewarray', 'Ljava/lang/classfile/constantpool/ClassEntry;I'], ['multianewarray', 'Ljava/lang/constant/ClassDesc;I'],
    ['checkcast', 'Ljava/lang/classfile/constantpool/ClassEntry;'], ['checkcast', 'Ljava/lang/constant/ClassDesc;'],
    ['instanceOf', 'Ljava/lang/classfile/constantpool/ClassEntry;'], ['instanceOf', 'Ljava/lang/constant/ClassDesc;'],
    ['monitorenter', ''], ['monitorexit', '']]) {
    const descriptor = '(' + parameters + ')Ljava/lang/classfile/CodeBuilder;'; assert.equal(method('CodeBuilder', name, descriptor).flags, 1);
    assert.ok(method('CodeBuilder', name, descriptor).code);
    if (parameters.startsWith('Ljava/lang/constant/ClassDesc;'))
      assert.ok(calls('CodeBuilder', name, descriptor).some(value => value.cp.owner === 'java.lang.classfile.constantpool.ConstantPoolBuilder' &&
        value.cp.name === 'classEntry' && value.cp.descriptor === '(Ljava/lang/constant/ClassDesc;)Ljava/lang/classfile/constantpool/ClassEntry;'));
  }
});
test('native interface-owner and pool-entry invocation overloads preserve real general-invoke paths', () => {
  for (const [name, parameters] of [['invokespecial', 'Ljava/lang/constant/ClassDesc;Ljava/lang/String;Ljava/lang/constant/MethodTypeDesc;Z'],
    ['invokestatic', 'Ljava/lang/constant/ClassDesc;Ljava/lang/String;Ljava/lang/constant/MethodTypeDesc;Z'],
    ['invokespecial', 'Ljava/lang/classfile/constantpool/MethodRefEntry;'], ['invokespecial', 'Ljava/lang/classfile/constantpool/InterfaceMethodRefEntry;'],
    ['invokestatic', 'Ljava/lang/classfile/constantpool/MethodRefEntry;'], ['invokestatic', 'Ljava/lang/classfile/constantpool/InterfaceMethodRefEntry;'],
    ['invokevirtual', 'Ljava/lang/classfile/constantpool/MethodRefEntry;'], ['invokeinterface', 'Ljava/lang/classfile/constantpool/InterfaceMethodRefEntry;']]) {
    const descriptor = '(' + parameters + ')Ljava/lang/classfile/CodeBuilder;'; assert.equal(method('CodeBuilder', name, descriptor).flags, 1);
    assert.ok(calls('CodeBuilder', name, descriptor).some(value => value.cp.owner === 'java.lang.classfile.CodeBuilder' && value.cp.name === 'invoke'));
  }
});
test('nominal type-check factory uses a genuine unbound temporary pool and never invents writable slots', () => {
  assert.ok(calls('instruction/DoppioMemoryInstructions', '<clinit>', '()V').some(value =>
    value.cp.owner === 'java.lang.classfile.constantpool.DoppioConstantPool' && value.cp.name === 'temporaryPool'));
  assert.equal(method('constantpool/DoppioConstantPool', 'temporaryPool', '()Ljava/lang/classfile/constantpool/ConstantPoolBuilder;').flags, 9);
  assert.ok(method('constantpool/DoppioConstantPool', 'temporaryEntry',
    '(IILjava/lang/classfile/constantpool/PoolEntry;Ljava/lang/classfile/constantpool/PoolEntry;Ljava/lang/Object;)Ljava/lang/classfile/constantpool/DoppioConstantPool$Entry;').code);
});
test('compiled opcode inventory distinguishes 209 modern values across24families from4discontinued values', () => {
  const kinds = units.get('Opcode$Kind').layout.fields.entries.filter(value => value.flags === 0x4019).map(value => value.name);
  const values = units.get('Opcode').layout.fields.entries.filter(value => value.flags === 0x4019).map(value => value.name);
  assert.equal(kinds.length, 26); assert.equal(kinds.filter(name => !name.startsWith('DISCONTINUED_')).length, 24);
  assert.equal(values.length, 213);
  const discontinued = new Set(['JSR','JSR_W','RET','RET_W']); assert.equal(values.filter(name => !discontinued.has(name)).length, 209);
  assert.ok([...discontinued].every(name => values.includes(name)));
});
test('actual fresh-source guest executes native memory factories, temporary-owner semantics and real roundtrips', () => {
  const diagnostic = path.join(temporary, 'diagnostic'); fs.mkdirSync(diagnostic);
  checked('javac', ['--release', '9', '--patch-module', 'java.base=' + output + path.delimiter + path.join(root, 'ci'),
    '-d', diagnostic, path.join(root, 'ci/ClassFileMemoryInstructionRegression.java')]);
  const result = runClassFileMetadataGuest({root, output, diagnostic, checked,
    className: 'classes.modern_test.ClassFileMemoryInstructionRegression',
    requiredPackages: ['java/lang/classfile','java/lang/classfile/instruction','java/lang/classfile/constantpool']});
  assert.equal(result.stdout.replaceAll('\r\n', '\n'), 'CLASSFILE_MEMORY_INSTRUCTION_REGRESSION_OK|95\n'); assert.equal(result.stderr, '');
});
