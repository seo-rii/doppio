'use strict';

const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {after, before, test} = require('node:test');
const {compileClassFileMetadata, runClassFileMetadataGuest} = require('./compile_classfile_metadata.cjs');
const root = path.resolve(__dirname, '..'), classlib = path.join(root, 'classes/modern_classlib');
const units = new Map(), prefix = 'java/lang/classfile/';
let temporary, output, receipt, readStructureLayout, decodeCoreCode;

function checked(command, args, cwd = root, timeout = 120000) {
  const result = cp.spawnSync(command, args, {cwd, encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024});
  assert.equal(result.error, undefined, String(result.error));
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, (result.stderr || result.stdout).slice(-6000));
  return result;
}

before(async () => {
  ({readStructureLayout} = await import('./java_class_structure_test.mjs'));
  ({decodeCoreCode} = await import('./java_core_bytecode.mjs'));
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-classfile-constant-instruction-'));
  fs.chmodSync(temporary, 0o700);
  output = path.join(temporary, 'compiled');
  const support = path.join(temporary, 'support');
  fs.mkdirSync(output); fs.mkdirSync(support);
  receipt = compileClassFileMetadata({root, classlib, output, support, checked});
  for (const relative of ['instruction/ConstantInstruction', 'instruction/ConstantInstruction$IntrinsicConstantInstruction',
    'instruction/ConstantInstruction$ArgumentConstantInstruction', 'instruction/ConstantInstruction$LoadConstantInstruction',
    'instruction/DoppioConstantInstructions', 'instruction/DoppioConstantInstructions$Value',
    'instruction/DoppioConstantInstructions$IntrinsicValue', 'instruction/DoppioConstantInstructions$ArgumentValue',
    'instruction/DoppioConstantInstructions$LoadValue', 'DoppioClassReader']) {
    const filename = path.join(output, prefix, relative + '.class'), stat = fs.lstatSync(filename);
    assert.ok(stat.isFile() && !stat.isSymbolicLink());
    const bytes = fs.readFileSync(filename);
    assert.equal(bytes.readUInt16BE(6), 53, 'Natural source/target-9 output, never rewritten');
    units.set(relative, {bytes, layout: readStructureLayout(bytes)});
  }
});
after(() => { if (temporary) fs.rmSync(temporary, {recursive: true, force: true}); });

function method(owner, name, descriptor) {
  const entries = units.get(owner).layout.methods.entries.filter(value => value.name === name && value.descriptor === descriptor);
  assert.equal(entries.length, 1, owner + '.' + name + descriptor);
  return entries[0];
}
function calls(owner, name, descriptor) {
  const unit = units.get(owner), entry = method(owner, name, descriptor);
  assert.ok(entry.code, 'Actual executable Java method');
  assert.equal(entry.flags & 0x100, 0, 'No fabricated native bridge');
  return decodeCoreCode(unit.bytes.subarray(entry.code.instructionsOffset,
    entry.code.instructionsOffset + entry.code.codeLength), unit.layout.pool, unit.bytes).filter(value => value.name.startsWith('invoke'));
}
function interfaces(owner) {
  const {bytes, layout} = units.get(owner);
  return Array.from({length: layout.interfaceCount}, (_, index) => {
    const entry = layout.pool[bytes.readUInt16BE(layout.interfacesOffset + 2 * index)];
    assert.equal(entry.tag, 7);
    return layout.pool[entry.first].value;
  });
}

test('constant instruction nested types are genuine public interfaces with native membership', () => {
  for (const relative of ['ConstantInstruction', 'ConstantInstruction$IntrinsicConstantInstruction',
    'ConstantInstruction$ArgumentConstantInstruction', 'ConstantInstruction$LoadConstantInstruction'])
    assert.equal(units.get('instruction/' + relative).layout.flags, 0x601);
  for (const suffix of ['IntrinsicConstantInstruction', 'ArgumentConstantInstruction', 'LoadConstantInstruction'])
    assert.deepEqual(interfaces('instruction/ConstantInstruction$' + suffix), [prefix + 'instruction/ConstantInstruction']);
});

test('constant factories preserve exact native result descriptors and execute real value factories', () => {
  for (const [name, parameters, result, helper] of [
    ['ofIntrinsic', '(Ljava/lang/classfile/Opcode;)', 'IntrinsicConstantInstruction', 'intrinsic'],
    ['ofArgument', '(Ljava/lang/classfile/Opcode;I)', 'ArgumentConstantInstruction', 'argument'],
    ['ofLoad', '(Ljava/lang/classfile/Opcode;Ljava/lang/classfile/constantpool/LoadableConstantEntry;)', 'LoadConstantInstruction', 'load']
  ]) {
    const descriptor = parameters + 'Ljava/lang/classfile/instruction/ConstantInstruction$' + result + ';';
    assert.equal(method('instruction/ConstantInstruction', name, descriptor).flags, 9);
    assert.ok(calls('instruction/ConstantInstruction', name, descriptor).some(value =>
      value.cp.owner === 'java.lang.classfile.instruction.DoppioConstantInstructions' && value.cp.name === helper &&
      value.cp.descriptor === descriptor));
  }
});

test('argument interface has native Integer covariance and an actual javac ConstantDesc bridge', () => {
  const owner = 'instruction/ConstantInstruction$ArgumentConstantInstruction';
  assert.equal(method(owner, 'constantValue', '()Ljava/lang/Integer;').flags, 0x401);
  assert.equal(method(owner, 'constantValue', '()Ljava/lang/constant/ConstantDesc;').flags, 0x1041);
  assert.ok(calls(owner, 'constantValue', '()Ljava/lang/constant/ConstantDesc;').some(value =>
    value.name === 'invokeinterface' && value.cp.owner === 'java.lang.classfile.instruction.ConstantInstruction$ArgumentConstantInstruction' &&
    value.cp.name === 'constantValue' && value.cp.descriptor === '()Ljava/lang/Integer;'));
});

test('argument value also contains a genuine boxed implementation and compiler-generated bridge', () => {
  const owner = 'instruction/DoppioConstantInstructions$ArgumentValue';
  assert.equal(method(owner, 'constantValue', '()Ljava/lang/Integer;').flags, 1);
  assert.ok(calls(owner, 'constantValue', '()Ljava/lang/Integer;').some(value => value.cp.owner === 'java.lang.Integer' &&
    value.cp.name === 'valueOf' && value.cp.descriptor === '(I)Ljava/lang/Integer;'));
  assert.equal(method(owner, 'constantValue', '()Ljava/lang/constant/ConstantDesc;').flags, 0x1041);
  assert.ok(calls(owner, 'constantValue', '()Ljava/lang/constant/ConstantDesc;').some(value =>
    value.name === 'invokevirtual' && value.cp.name === 'constantValue' && value.cp.descriptor === '()Ljava/lang/Integer;'));
});

test('all three native typeKind defaults are executable interface methods', () => {
  for (const suffix of ['IntrinsicConstantInstruction', 'ArgumentConstantInstruction', 'LoadConstantInstruction']) {
    const owner = 'instruction/ConstantInstruction$' + suffix;
    assert.equal(method(owner, 'typeKind', '()Ljava/lang/classfile/TypeKind;').flags, 1);
    assert.ok(method(owner, 'typeKind', '()Ljava/lang/classfile/TypeKind;').code);
  }
  assert.ok(calls('instruction/ConstantInstruction$IntrinsicConstantInstruction', 'typeKind', '()Ljava/lang/classfile/TypeKind;')
    .some(value => value.cp.name === 'intrinsicKind'));
  assert.ok(calls('instruction/ConstantInstruction$LoadConstantInstruction', 'typeKind', '()Ljava/lang/classfile/TypeKind;')
    .some(value => value.cp.owner === 'java.lang.classfile.constantpool.LoadableConstantEntry' && value.cp.name === 'typeKind'));
});

test('reader returns the same real typed constants rather than untyped private carriers', () => {
  for (const [name, parameters, suffix, factory] of [
    ['intrinsic', '(Ljava/lang/classfile/Opcode;)', 'IntrinsicConstantInstruction', 'ofIntrinsic'],
    ['argument', '(Ljava/lang/classfile/Opcode;I)', 'ArgumentConstantInstruction', 'ofArgument'],
    ['loadConstant', '(Ljava/lang/classfile/Opcode;Ljava/lang/classfile/constantpool/LoadableConstantEntry;)', 'LoadConstantInstruction', 'ofLoad']
  ]) {
    const descriptor = parameters + 'Ljava/lang/classfile/instruction/ConstantInstruction$' + suffix + ';';
    assert.ok(calls('DoppioClassReader', name, descriptor).some(value => value.cp.owner === 'java.lang.classfile.instruction.ConstantInstruction' &&
      value.cp.name === factory && value.cp.descriptor === descriptor));
  }
});

test('source compiler uses exactly the boxed-covariance files then retains the release9 API floor', () => {
  const [extract, narrow, normal] = receipt.operations;
  assert.equal(extract.command, 'jar'); assert.equal(narrow.command, 'javac'); assert.equal(normal.command, 'javac');
  assert.deepEqual(narrow.arguments.slice(0, 7), ['-J-Dfile.encoding=UTF8', '-source', '9', '-target', '9', '-implicit:none', '--patch-module']);
  assert.deepEqual(narrow.arguments.slice(-4).map(file => path.relative(classlib, file).split(path.sep).join('/')),
    ['java/lang/classfile/instruction/ConstantInstruction.java', 'java/lang/classfile/instruction/DoppioConstantInstructions.java',
      'java/lang/classfile/AnnotationValue.java', 'java/lang/classfile/DoppioAnnotations.java']);
  assert.deepEqual(normal.arguments.slice(0, 4), ['-J-Dfile.encoding=UTF8', '--release', '9', '--patch-module']);
  assert.equal(normal.arguments[4].split(path.delimiter)[0], 'java.base=' + output);
  assert.ok(narrow.arguments.slice(-4).every(file => !normal.arguments.includes(file)));
  assert.equal(receipt.inputs.length, receipt.sourceHashes.length);
});

test('actual guest executes both boxed bridges, native factory errors, and real reader/writer membership', () => {
  const diagnostic = path.join(temporary, 'diagnostic'); fs.mkdirSync(diagnostic);
  checked('javac', ['--release', '9', '--patch-module', 'java.base=' + output + path.delimiter + path.join(root, 'ci'),
    '-d', diagnostic, path.join(root, 'ci/ClassFileConstantInstructionRegression.java')]);
  // Execute the fresh, hashed source output through the existing real VM.
  // No shared classlib output is mutated and no original gate driver is replaced.
  const result = runClassFileMetadataGuest({root, output, diagnostic, checked,
    className: 'classes.modern_test.ClassFileConstantInstructionRegression',
    requiredPackages: ['java/lang/classfile', 'java/lang/classfile/instruction']});
  assert.equal(result.stdout.replaceAll('\r\n', '\n'), 'CLASSFILE_CONSTANT_INSTRUCTION_REGRESSION_OK|55\n');
  assert.equal(result.stderr, '');
});
