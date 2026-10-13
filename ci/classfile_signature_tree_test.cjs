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
let temporary, output, decodeCoreCode;
function checked(command, args, cwd = root, timeout = 60000) {
  const result = cp.spawnSync(command, args, {cwd, encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024});
  assert.equal(result.error, undefined, String(result.error)); assert.equal(result.signal, null);
  assert.equal(result.status, 0, (result.stderr || result.stdout).slice(-6000)); return result;
}
before(async () => {
  const {readStructureLayout} = await import('./java_class_structure_test.mjs');
  ({decodeCoreCode} = await import('./java_core_bytecode.mjs'));
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-classfile-signature-tree-')); fs.chmodSync(temporary, 0o700);
  output = path.join(temporary, 'compiled'); const support = path.join(temporary, 'support');
  fs.mkdirSync(output); fs.mkdirSync(support);
  compileClassFileMetadata({root, classlib, output, support, checked});
  for (const relative of ['Signature', 'Signature$TypeParam', 'ClassSignature', 'MethodSignature', 'attribute/SignatureAttribute',
    'DoppioSignatures', 'DoppioSignatures$ParameterValue', 'DoppioSignatures$ClassSignatureValue', 'DoppioSignatures$MethodSignatureValue']) {
    const filename = path.join(output, prefix, relative + '.class'), stat = fs.lstatSync(filename);
    assert.ok(stat.isFile() && !stat.isSymbolicLink()); const bytes = fs.readFileSync(filename);
    assert.equal(bytes.readUInt16BE(6), 53, 'Normal release9 signature output, never rewritten headers or SDK stubs');
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
  assert.ok(entry.code, 'Actual Java implementation, not an injected native'); assert.equal(entry.flags & 0x100, 0);
  return decodeCoreCode(unit.bytes.subarray(entry.code.instructionsOffset, entry.code.instructionsOffset + entry.code.codeLength), unit.layout.pool, unit.bytes);
}
function calls(owner, name, descriptor) { return instructions(owner, name, descriptor).filter(value => value.name.startsWith('invoke')); }
test('complete class/method/type-parameter models have exact native public interface identities', () => {
  for (const owner of ['ClassSignature', 'MethodSignature', 'Signature$TypeParam']) {
    assert.equal(units.get(owner).layout.flags, 0x601);
    assert.equal(units.get(owner).layout.interfaceCount, 0, 'These are not subtypes of Signature');
  }
});
test('TypeParam factories and getters preserve raw and Optional bound ABI with real varargs', () => {
  const ref = 'Ljava/lang/classfile/Signature$RefTypeSig;', result = 'Ljava/lang/classfile/Signature$TypeParam;';
  for (const bound of [ref, 'Ljava/util/Optional;'])
    assert.equal(method('Signature$TypeParam', 'of', '(Ljava/lang/String;' + bound + '[' + ref + ')' + result).flags, 0x89);
  for (const [name, result] of [['identifier', 'Ljava/lang/String;'], ['classBound', 'Ljava/util/Optional;'], ['interfaceBounds', 'Ljava/util/List;']])
    assert.equal(method('Signature$TypeParam', name, '()' + result).flags, 0x401);
});
test('ClassSignature exposes exact typed superclass and complete class factory/parse descriptors', () => {
  const type = 'Ljava/lang/classfile/Signature$ClassTypeSig;', result = 'Ljava/lang/classfile/ClassSignature;';
  for (const parameters of [type + '[' + type, 'Ljava/util/List;' + type + '[' + type])
    assert.equal(method('ClassSignature', 'of', '(' + parameters + ')' + result).flags, 0x89);
  assert.equal(method('ClassSignature', 'parseFrom', '(Ljava/lang/String;)' + result).flags, 9);
  for (const [name, result] of [['typeParameters', 'Ljava/util/List;'], ['superclassSignature', type],
    ['superinterfaceSignatures', 'Ljava/util/List;'], ['signatureString', 'Ljava/lang/String;']])
    assert.equal(method('ClassSignature', name, '()' + result).flags, 0x401);
});
test('MethodSignature preserves nominal, simple and full generic factory descriptors', () => {
  const signature = 'Ljava/lang/classfile/Signature;', result = 'Ljava/lang/classfile/MethodSignature;';
  assert.equal(method('MethodSignature', 'of', '(Ljava/lang/constant/MethodTypeDesc;)' + result).flags, 9);
  for (const parameters of [signature + '[' + signature, 'Ljava/util/List;Ljava/util/List;' + signature + '[' + signature])
    assert.equal(method('MethodSignature', 'of', '(' + parameters + ')' + result).flags, 0x89);
  assert.equal(method('MethodSignature', 'parseFrom', '(Ljava/lang/String;)' + result).flags, 9);
  for (const [name, type] of [['typeParameters', 'Ljava/util/List;'], ['arguments', 'Ljava/util/List;'],
    ['result', signature], ['throwableSignatures', 'Ljava/util/List;'], ['signatureString', 'Ljava/lang/String;']])
    assert.equal(method('MethodSignature', name, '()' + type).flags, 0x401);
});
test('all six typed SignatureAttribute additions execute actual parser and temporary-entry paths', () => {
  const attribute = 'Ljava/lang/classfile/attribute/SignatureAttribute;';
  for (const [name, owner] of [['asClassSignature', 'ClassSignature'], ['asMethodSignature', 'MethodSignature'], ['asTypeSignature', 'Signature']]) {
    const result = 'Ljava/lang/classfile/' + owner + ';';
    assert.equal(method('attribute/SignatureAttribute', name, '()' + result).flags, 1);
    assert.ok(calls('attribute/SignatureAttribute', name, '()' + result).some(value =>
      value.cp.owner === 'java.lang.classfile.' + owner && value.cp.name === 'parseFrom'));
    const descriptor = '(' + result + ')' + attribute;
    assert.equal(method('attribute/SignatureAttribute', 'of', descriptor).flags, 9);
    assert.ok(calls('attribute/SignatureAttribute', 'of', descriptor).some(value =>
      value.cp.owner === 'java.lang.classfile.constantpool.DoppioConstantPool' && value.cp.name === 'temporaryPool'));
  }
});
test('class/method parsers construct genuine typed semantic trees rather than encoded-string carriers', () => {
  for (const [owner, helper] of [['ClassSignature', 'parseClass'], ['MethodSignature', 'parseMethod']]) {
    const descriptor = '(Ljava/lang/String;)Ljava/lang/classfile/' + owner + ';';
    assert.ok(calls(owner, 'parseFrom', descriptor).some(value => value.cp.owner === 'java.lang.classfile.DoppioSignatures' && value.cp.name === helper));
    assert.ok(instructions('DoppioSignatures', helper, descriptor).some(value => value.name === 'new' && value.cp.value ===
      'java.lang.classfile.DoppioSignatures$' + owner + 'Value'));
  }
  for (const [owner, getters] of [['DoppioSignatures$ParameterValue', ['identifier','classBound','interfaceBounds']],
    ['DoppioSignatures$ClassSignatureValue', ['typeParameters','superclassSignature','superinterfaceSignatures','signatureString']],
    ['DoppioSignatures$MethodSignatureValue', ['typeParameters','throwableSignatures','result','arguments','signatureString']]]) {
    for (const name of getters) assert.ok(units.get(owner).layout.methods.entries.some(value => value.name === name && value.code));
    assert.ok(method(owner, 'equals', '(Ljava/lang/Object;)Z').code); assert.ok(method(owner, 'hashCode', '()I').code);
  }
});
test('actual fresh-source guest executes all127 native signature/tree/attribute semantics assertions', () => {
  const diagnostic = path.join(temporary, 'diagnostic'); fs.mkdirSync(diagnostic);
  checked('javac', ['--release', '9', '--patch-module', 'java.base=' + output + path.delimiter + path.join(root, 'ci'),
    '-d', diagnostic, path.join(root, 'ci/ClassFileSignatureTreeRegression.java')]);
  const result = runClassFileMetadataGuest({root, output, diagnostic, checked,
    className: 'classes.modern_test.ClassFileSignatureTreeRegression',
    requiredPackages: ['java/lang/classfile', 'java/lang/classfile/attribute', 'java/lang/classfile/constantpool']});
  assert.equal(result.stdout.replaceAll('\r\n', '\n'), 'CLASSFILE_SIGNATURE_TREE_REGRESSION_OK|127\n'); assert.equal(result.stderr, '');
});
