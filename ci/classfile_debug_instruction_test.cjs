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
const nested = ['BaseTypeSig', 'RefTypeSig', 'ThrowableSig', 'ClassTypeSig', 'TypeVarSig', 'ArrayTypeSig',
  'TypeArg', 'TypeArg$Bounded', 'TypeArg$Unbounded', 'TypeArg$Bounded$WildcardIndicator'];
const pseudo = ['LineNumber', 'LocalVariable', 'LocalVariableType', 'CharacterRange'];
let temporary, output, decodeCoreCode;
function checked(command, args, cwd = root, timeout = 60000) {
  const result = cp.spawnSync(command, args, {cwd, encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024});
  assert.equal(result.error, undefined, String(result.error)); assert.equal(result.signal, null);
  assert.equal(result.status, 0, (result.stderr || result.stdout).slice(-6000)); return result;
}
before(async () => {
  const {readStructureLayout} = await import('./java_class_structure_test.mjs');
  ({decodeCoreCode} = await import('./java_core_bytecode.mjs'));
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-classfile-debug-instruction-')); fs.chmodSync(temporary, 0o700);
  output = path.join(temporary, 'compiled'); const support = path.join(temporary, 'support');
  fs.mkdirSync(output); fs.mkdirSync(support);
  compileClassFileMetadata({root, classlib, output, support, checked});
  for (const relative of ['Signature', ...nested.map(name => 'Signature$' + name), 'DoppioSignatures',
    ...pseudo.map(name => 'instruction/' + name), 'instruction/DoppioDebugInstructions', 'CodeBuilder', 'DoppioClassReader']) {
    const filename = path.join(output, prefix, relative + '.class'), stat = fs.lstatSync(filename);
    assert.ok(stat.isFile() && !stat.isSymbolicLink()); const bytes = fs.readFileSync(filename);
    assert.equal(bytes.readUInt16BE(6), 53, 'Genuine release9 output, not an altered class header');
    units.set(relative, {bytes, layout: readStructureLayout(bytes)});
  }
});
after(() => { if (temporary) fs.rmSync(temporary, {recursive: true, force: true}); });
function method(owner, name, descriptor) {
  const matches = units.get(owner).layout.methods.entries.filter(entry => entry.name === name && entry.descriptor === descriptor);
  assert.equal(matches.length, 1, owner + '.' + name + descriptor); return matches[0];
}
function instructions(owner, name, descriptor) {
  const unit = units.get(owner), entry = method(owner, name, descriptor);
  assert.ok(entry.code, 'Real Java body, not an injected native'); assert.equal(entry.flags & 0x100, 0);
  return decodeCoreCode(unit.bytes.subarray(entry.code.instructionsOffset, entry.code.instructionsOffset + entry.code.codeLength),
    unit.layout.pool, unit.bytes);
}
function calls(owner, name, descriptor) { return instructions(owner, name, descriptor).filter(value => value.name.startsWith('invoke')); }
function parents(owner) {
  const unit = units.get(owner), {layout, bytes} = unit;
  return Array.from({length: layout.interfaceCount}, (_, index) => {
    const entry = layout.pool[bytes.readUInt16BE(layout.interfacesOffset + index * 2)]; assert.equal(entry.tag, 7);
    return layout.pool[entry.first].value;
  });
}
test('Signature field-type tree has the exact native nominal interface hierarchy', () => {
  assert.equal(units.get('Signature').layout.flags, 0x601);
  for (const name of nested.filter(name => !name.endsWith('WildcardIndicator')))
    assert.equal(units.get('Signature$' + name).layout.flags, 0x601);
  for (const name of ['BaseTypeSig', 'RefTypeSig', 'ThrowableSig'])
    assert.deepEqual(parents('Signature$' + name), [prefix + 'Signature']);
  for (const name of ['ClassTypeSig', 'TypeVarSig'])
    assert.deepEqual(parents('Signature$' + name), [prefix + 'Signature$RefTypeSig', prefix + 'Signature$ThrowableSig']);
  assert.deepEqual(parents('Signature$ArrayTypeSig'), [prefix + 'Signature$RefTypeSig']);
  for (const name of ['Bounded', 'Unbounded']) assert.deepEqual(parents('Signature$TypeArg$' + name), [prefix + 'Signature$TypeArg']);
});
test('Signature factories retain exact typed return, varargs and operand descriptors', () => {
  const signature = 'Ljava/lang/classfile/Signature;', classType = 'Ljava/lang/classfile/Signature$ClassTypeSig;';
  const args = '[Ljava/lang/classfile/Signature$TypeArg;', descriptor = 'Ljava/lang/constant/ClassDesc;';
  assert.equal(method('Signature', 'parseFrom', '(Ljava/lang/String;)' + signature).flags, 9);
  assert.equal(method('Signature', 'of', '(' + descriptor + ')' + signature).flags, 9);
  for (const parameters of [descriptor + args, classType + descriptor + args, 'Ljava/lang/String;' + args, classType + 'Ljava/lang/String;' + args])
    assert.equal(method('Signature$ClassTypeSig', 'of', '(' + parameters + ')' + classType).flags, 0x89);
  for (const parameters of [descriptor, 'C'])
    assert.equal(method('Signature$BaseTypeSig', 'of', '(' + parameters + ')Ljava/lang/classfile/Signature$BaseTypeSig;').flags, 9);
  for (const parameters of [signature, 'I' + signature])
    assert.equal(method('Signature$ArrayTypeSig', 'of', '(' + parameters + ')Ljava/lang/classfile/Signature$ArrayTypeSig;').flags, 9);
  const ref = 'Ljava/lang/classfile/Signature$RefTypeSig;', bounded = 'Ljava/lang/classfile/Signature$TypeArg$Bounded;';
  for (const name of ['of', 'extendsOf', 'superOf']) assert.equal(method('Signature$TypeArg', name, '(' + ref + ')' + bounded).flags, 9);
  assert.equal(method('Signature$TypeArg', 'bounded', '(Ljava/lang/classfile/Signature$TypeArg$Bounded$WildcardIndicator;' + ref + ')' + bounded).flags, 9);
  assert.equal(method('Signature$TypeArg', 'unbounded', '()Ljava/lang/classfile/Signature$TypeArg$Unbounded;').flags, 9);
});
test('typed Signature getters and enum wildcards are concrete native-shaped contracts', () => {
  for (const [owner, name, result] of [['Signature', 'signatureString', 'Ljava/lang/String;'],
    ['Signature$BaseTypeSig', 'baseType', 'C'], ['Signature$ClassTypeSig', 'outerType', 'Ljava/util/Optional;'],
    ['Signature$ClassTypeSig', 'className', 'Ljava/lang/String;'], ['Signature$ClassTypeSig', 'typeArgs', 'Ljava/util/List;'],
    ['Signature$TypeVarSig', 'identifier', 'Ljava/lang/String;'], ['Signature$ArrayTypeSig', 'componentSignature', 'Ljava/lang/classfile/Signature;'],
    ['Signature$TypeArg$Bounded', 'wildcardIndicator', 'Ljava/lang/classfile/Signature$TypeArg$Bounded$WildcardIndicator;'],
    ['Signature$TypeArg$Bounded', 'boundType', 'Ljava/lang/classfile/Signature$RefTypeSig;']])
    assert.equal(method(owner, name, '()' + result).flags, 0x401);
  assert.equal(method('Signature$ClassTypeSig', 'classDesc', '()Ljava/lang/constant/ClassDesc;').flags, 1);
  const fields = units.get('Signature$TypeArg$Bounded$WildcardIndicator').layout.fields.entries;
  assert.deepEqual(fields.filter(entry => entry.flags === 0x4019).map(entry => entry.name), ['NONE', 'EXTENDS', 'SUPER']);
  assert.ok(calls('Signature', 'parseFrom', '(Ljava/lang/String;)Ljava/lang/classfile/Signature;').some(value =>
    value.cp.owner === 'java.lang.classfile.DoppioSignatures' && value.cp.name === 'parse'));
});
test('debug pseudo models expose exact native label/UTF/getter and nominal factory ABI', () => {
  for (const name of pseudo) {
    assert.equal(units.get('instruction/' + name).layout.flags, 0x601);
    assert.deepEqual(parents('instruction/' + name), [prefix + 'PseudoInstruction']);
  }
  const utf = 'Ljava/lang/classfile/constantpool/Utf8Entry;', label = 'Ljava/lang/classfile/Label;';
  for (const name of ['LocalVariable', 'LocalVariableType']) {
    const owner = 'instruction/' + name, result = 'Ljava/lang/classfile/instruction/' + name + ';';
    for (const [getter, type] of [['slot', 'I'], ['name', utf], ['startScope', label], ['endScope', label],
      [name === 'LocalVariable' ? 'type' : 'signature', utf]]) assert.equal(method(owner, getter, '()' + type).flags, 0x401);
    assert.equal(method(owner, 'of', '(I' + utf + utf + label + label + ')' + result).flags, 9);
    const symbolic = name === 'LocalVariable' ? 'Ljava/lang/constant/ClassDesc;' : 'Ljava/lang/classfile/Signature;';
    assert.equal(method(owner, 'of', '(ILjava/lang/String;' + symbolic + label + label + ')' + result).flags, 9);
    assert.equal(method(owner, name === 'LocalVariable' ? 'typeSymbol' : 'signatureSymbol', '()' + symbolic).flags, 1);
  }
  assert.ok(calls('instruction/LocalVariableType', 'signatureSymbol', '()Ljava/lang/classfile/Signature;').some(value =>
    value.cp.owner === 'java.lang.classfile.Signature' && value.cp.name === 'parseFrom'));
});
test('all nine character-range flags are actual constant values, with native factory/getter shape', () => {
  const unit = units.get('instruction/CharacterRange'), fields = unit.layout.fields.entries;
  for (const [index, name] of ['STATEMENT','BLOCK','ASSIGNMENT','FLOW_CONTROLLER','FLOW_TARGET','INVOKE','CREATE','BRANCH_TRUE','BRANCH_FALSE'].entries()) {
    const field = fields.find(entry => entry.name === 'FLAG_' + name); assert.equal(field.flags, 0x19);
    const attribute = field.attributes.entries.find(entry => entry.name === 'ConstantValue'); assert.ok(attribute);
    const constant = unit.layout.pool[unit.bytes.readUInt16BE(attribute.body)]; assert.equal(constant.tag, 3);
    assert.equal(unit.bytes.readInt32BE(constant.start + 1), 1 << index);
  }
  assert.equal(method('instruction/CharacterRange', 'of', '(Ljava/lang/classfile/Label;Ljava/lang/classfile/Label;III)Ljava/lang/classfile/instruction/CharacterRange;').flags, 9);
  for (const name of ['characterRangeStart', 'characterRangeEnd', 'flags']) assert.equal(method('instruction/CharacterRange', name, '()I').flags, 0x401);
});
test('all six CodeBuilder debug aliases execute actual native typed factories and pool conversions', () => {
  const label = 'Ljava/lang/classfile/Label;', utf = 'Ljava/lang/classfile/constantpool/Utf8Entry;', result = 'Ljava/lang/classfile/CodeBuilder;';
  for (const [name, parameters, factory] of [['lineNumber', 'I', 'LineNumber'], ['characterRange', label + label + 'III', 'CharacterRange'],
    ['localVariable', 'I' + utf + utf + label + label, 'LocalVariable'], ['localVariableType', 'I' + utf + utf + label + label, 'LocalVariableType']]) {
    const descriptor = '(' + parameters + ')' + result; assert.equal(method('CodeBuilder', name, descriptor).flags, 1);
    assert.ok(calls('CodeBuilder', name, descriptor).some(value => value.cp.owner === 'java.lang.classfile.instruction.' + factory && value.cp.name === 'of'));
  }
  for (const [name, symbol] of [['localVariable', 'Ljava/lang/constant/ClassDesc;'], ['localVariableType', 'Ljava/lang/classfile/Signature;']]) {
    const descriptor = '(ILjava/lang/String;' + symbol + label + label + ')' + result;
    assert.equal(method('CodeBuilder', name, descriptor).flags, 1);
    assert.ok(calls('CodeBuilder', name, descriptor).some(value => value.cp.owner === 'java.lang.classfile.constantpool.ConstantPoolBuilder' && value.cp.name === 'utf8Entry'));
  }
});
test('LineNumber factories and reader share the real cache helper rather than unrelated carrier models', () => {
  const descriptor = '(I)Ljava/lang/classfile/instruction/LineNumber;';
  for (const [owner, name] of [['instruction/LineNumber', 'of'], ['DoppioClassReader', 'lineNumber']])
    assert.ok(calls(owner, name, descriptor).some(value => value.cp.owner === 'java.lang.classfile.instruction.DoppioDebugInstructions' && value.cp.name === 'lineNumber'));
  assert.ok(instructions('instruction/DoppioDebugInstructions', 'lineNumber', descriptor).some(value => value.name === 'aaload'));
  assert.ok(instructions('instruction/DoppioDebugInstructions', 'lineNumber', descriptor).some(value => value.name === 'new'));
});
test('actual fresh-source guest executes typed Signature/debug factories and native debug-table traversal', () => {
  const diagnostic = path.join(temporary, 'diagnostic'); fs.mkdirSync(diagnostic);
  checked('javac', ['--release', '9', '--patch-module', 'java.base=' + output + path.delimiter + path.join(root, 'ci'),
    '-d', diagnostic, path.join(root, 'ci/ClassFileDebugInstructionRegression.java')]);
  const result = runClassFileMetadataGuest({root, output, diagnostic, checked,
    className: 'classes.modern_test.ClassFileDebugInstructionRegression',
    requiredPackages: ['java/lang/classfile', 'java/lang/classfile/instruction', 'java/lang/classfile/constantpool', 'java/lang/classfile/attribute']});
  assert.equal(result.stdout.replaceAll('\r\n', '\n'), 'CLASSFILE_DEBUG_INSTRUCTION_REGRESSION_OK|161\n');
  assert.equal(result.stderr, '');
});
