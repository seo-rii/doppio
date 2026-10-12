'use strict';
const assert = require('node:assert/strict'), cp = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {before, after, test} = require('node:test');
const {compileClassFileMetadata, runClassFileMetadataGuest} = require('./compile_classfile_metadata.cjs');
const root = path.resolve(__dirname, '..'), units = new Map();
let temporary, output, writerDiagnostic, readStructureLayout, decodeCoreCode;
function checked(command, args, cwd = root, timeout = 120000) {
  const result = cp.spawnSync(command, args, {cwd, encoding:'utf8', timeout, maxBuffer:16 * 1024 * 1024});
  assert.equal(result.error, undefined, String(result.error)); assert.equal(result.signal, null);
  assert.equal(result.status, 0, (result.stderr || result.stdout).slice(-6000)); return result;
}
before(async () => {
  ({readStructureLayout} = await import('./java_class_structure_test.mjs'));
  ({decodeCoreCode} = await import('./java_core_bytecode.mjs'));
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-instruction-writer-')); fs.chmodSync(temporary, 0o700);
  output = path.join(temporary, 'compiled'); const support = path.join(temporary, 'support');
  fs.mkdirSync(output); fs.mkdirSync(support);
  compileClassFileMetadata({root, classlib:path.join(root, 'classes/modern_classlib'), output, support, checked});
  for (const name of ['ClassFile$DeadCodeOption', 'ClassFile$DeadLabelsOption', 'ClassFile$ShortJumpsOption',
    'DoppioClassFile', 'DoppioBuilders', 'DoppioClassReader', 'DoppioCodeAssembler', 'DoppioCodeFlow']) {
    const bytes = fs.readFileSync(path.join(output, 'java/lang/classfile', name + '.class'));
    assert.equal(bytes.readUInt16BE(6), 53, 'Natural release9 compiled output, never patched class headers');
    units.set(name, {bytes, layout:readStructureLayout(bytes)});
  }
  writerDiagnostic = path.join(temporary, 'diagnostic'); fs.mkdirSync(writerDiagnostic);
  checked('javac', ['--release', '9', '--patch-module', 'java.base=' + output + path.delimiter + path.join(root, 'ci'),
    '-d', writerDiagnostic, path.join(root, 'ci/ClassFileInstructionWriterRegression.java')]);
});
after(() => { if (temporary) fs.rmSync(temporary, {recursive:true, force:true}); });
function methods(owner, name) { return units.get(owner).layout.methods.entries.filter(value => value.name === name); }
function calls(owner, name) {
  const unit = units.get(owner);
  return methods(owner, name).filter(value => value.code).flatMap(value => decodeCoreCode(
    unit.bytes.subarray(value.code.instructionsOffset, value.code.instructionsOffset + value.code.codeLength),
    unit.layout.pool, unit.bytes)).filter(value => value.name.startsWith('invoke'));
}
test('public dead-code, dead-label and short-jump enums expose exactly the native constants', () => {
  for (const [name, values] of [
    ['DeadCodeOption', ['PATCH_DEAD_CODE', 'KEEP_DEAD_CODE']],
    ['DeadLabelsOption', ['FAIL_ON_DEAD_LABELS', 'DROP_DEAD_LABELS']],
    ['ShortJumpsOption', ['FIX_SHORT_JUMPS', 'FAIL_ON_SHORT_JUMPS']]
  ]) {
    const unit = units.get('ClassFile$' + name);
    assert.deepEqual(unit.layout.fields.entries.filter(value => value.flags & 0x4000).map(value => value.name), values);
    assert.ok(methods('ClassFile$' + name, 'values').some(value => value.descriptor ===
      '()[Ljava/lang/classfile/ClassFile$' + name + ';' && value.flags === 9 && value.code));
  }
});
test('reader actually creates all seven typed modern memory instruction families', () => {
  const body = calls('DoppioClassReader', 'instructions');
  for (const name of ['ArrayLoadInstruction', 'ArrayStoreInstruction', 'NewPrimitiveArrayInstruction',
    'NewReferenceArrayInstruction', 'NewMultiArrayInstruction', 'TypeCheckInstruction', 'MonitorInstruction'])
    assert.ok(body.some(value => value.cp.owner === 'java.lang.classfile.instruction.' + name && value.cp.name === 'of'), name);
});
test('large Code reads use indexed opcode dispatch, without cloning and searching the enum per instruction', () => {
  const body = calls('DoppioClassReader', 'opcode');
  assert.ok(!body.some(value => value.cp.owner === 'java.lang.classfile.Opcode' && value.cp.name === 'values'));
  const initialization = calls('DoppioClassReader', '<clinit>');
  assert.equal(initialization.filter(value => value.cp.owner === 'java.lang.classfile.Opcode' && value.cp.name === 'values').length, 1);
});
test('writer executes monotonic branch layout and all actual typed memory operands', () => {
  assert.ok(calls('DoppioCodeAssembler', 'assemble').some(value => value.cp.name === 'layout'));
  const body = calls('DoppioCodeAssembler', 'encode');
  for (const [name, getter] of [['NewPrimitiveArrayInstruction', 'typeKind'], ['NewReferenceArrayInstruction', 'componentType'],
    ['NewMultiArrayInstruction', 'arrayType'], ['NewMultiArrayInstruction', 'dimensions'], ['TypeCheckInstruction', 'type']])
    assert.ok(body.some(value => value.cp.owner === 'java.lang.classfile.instruction.' + name && value.cp.name === getter));
});
test('generation passes the explicit dead-code policy to real typed analysis', () => {
  const body = calls('DoppioBuilders', 'encodeCode');
  assert.ok(body.some(value => value.cp.owner === 'java.lang.classfile.DoppioCodeFlow' && value.cp.name === 'analyze' &&
    value.cp.descriptor.endsWith('ILjava/lang/classfile/ClassFile$DeadCodeOption;)Ljava/lang/classfile/DoppioCodeFlow$Result;')));
  assert.ok(body.some(value => value.cp.owner === 'java.lang.classfile.DoppioCodeAssembler' && value.cp.name === 'assemble' &&
    value.cp.descriptor.includes('Ljava/lang/classfile/ClassFile$DeadLabelsOption;Ljava/lang/classfile/ClassFile$ShortJumpsOption;')));
});
for (const [entry, profile, count] of [['Switch', 'switch', 1], ['Backward', 'backward', 1],
  ['Jumps', 'jumps', 4], ['Labels', 'labels', 4], ['Dead', 'dead', 3], ['Transform', 'transform', 1]])
  test('fresh real guest matches native writer profile: ' + profile, () => {
    const result = runClassFileMetadataGuest({root, output, diagnostic:writerDiagnostic, checked,
      className:'classes.modern_test.ClassFileInstructionWriterRegression$' + entry,
      requiredPackages:['java/lang/classfile', 'java/lang/classfile/instruction', 'java/lang/classfile/constantpool']});
    assert.equal(result.stdout.replaceAll('\r\n', '\n'), 'CLASSFILE_INSTRUCTION_WRITER_REGRESSION_OK|' + profile + '|' + count + '\n');
    assert.equal(result.stderr, '');
  });
test('fresh real guest validates all stack shapes, array/type/monitor states and exact dead-code handler patches', () => {
  const diagnostic = path.join(temporary, 'flow-diagnostic'); fs.mkdirSync(diagnostic);
  checked('javac', ['--release', '9', '--patch-module', 'java.base=' + output + path.delimiter + path.join(root, 'ci'),
    '-d', diagnostic, path.join(root, 'ci/ClassFileInstructionFlowRegression.java')]);
  const result = runClassFileMetadataGuest({root, output, diagnostic, checked,
    className:'classes.modern_test.ClassFileInstructionFlowRegression',
    requiredPackages:['java/lang/classfile', 'java/lang/classfile/instruction', 'java/lang/classfile/constantpool']});
  assert.equal(result.stdout.replaceAll('\r\n', '\n'), 'CLASSFILE_INSTRUCTION_FLOW_REGRESSION_OK|82\n');
  assert.equal(result.stderr, '');
});
