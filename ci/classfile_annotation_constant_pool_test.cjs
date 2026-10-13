'use strict';

const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {before, after, test} = require('node:test');
const {compileClassFileMetadata, runClassFileMetadataGuest} = require('./compile_classfile_metadata.cjs');
const root = path.resolve(__dirname, '..'), classlib = path.join(root, 'classes/modern_classlib');
const units = new Map(), prefix = 'java/lang/classfile/constantpool/';
let temporary, output, decodeCoreCode;
function checked(command, args, cwd = root, timeout = 60000) {
  const result = cp.spawnSync(command, args, {cwd, encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024});
  assert.equal(result.error, undefined, String(result.error)); assert.equal(result.signal, null);
  assert.equal(result.status, 0, (result.stderr || result.stdout).slice(-6000)); return result;
}
before(async () => {
  const {readStructureLayout} = await import('./java_class_structure_test.mjs');
  ({decodeCoreCode} = await import('./java_core_bytecode.mjs'));
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-classfile-annotation-cp-')); fs.chmodSync(temporary, 0o700);
  output = path.join(temporary, 'compiled'); const support = path.join(temporary, 'support');
  fs.mkdirSync(output); fs.mkdirSync(support);
  compileClassFileMetadata({root, classlib, output, support, checked});
  for (const relative of ['DoppioConstantPool$Utf', 'DoppioConstantPool$IntValue', 'DoppioConstantPool$FloatValue',
    'DoppioConstantPool$LongValue', 'DoppioConstantPool$DoubleValue']) {
    const filename = path.join(output, prefix, relative + '.class'), stat = fs.lstatSync(filename);
    assert.ok(stat.isFile() && !stat.isSymbolicLink()); const bytes = fs.readFileSync(filename);
    assert.equal(bytes.readUInt16BE(6), 53, 'Natural release9 CP model output');
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
  assert.ok(entry.code); assert.equal(entry.flags & 0x100, 0, 'Real Java model implementation, never an injected native');
  return decodeCoreCode(unit.bytes.subarray(entry.code.instructionsOffset, entry.code.instructionsOffset + entry.code.codeLength), unit.layout.pool, unit.bytes);
}
test('only the five approved CP scalar families declare genuine equals/hashCode implementations', () => {
  for (const owner of units.keys()) {
    assert.equal(method(owner, 'equals', '(Ljava/lang/Object;)Z').flags, 1);
    assert.equal(method(owner, 'hashCode', '()I').flags, 1);
    assert.ok(instructions(owner, 'equals', '(Ljava/lang/Object;)Z').some(value => value.name === 'instanceof'));
    assert.ok(instructions(owner, 'hashCode', '()I').length > 1);
  }
});
test('native floating-point equality uses primitive comparisons and canonical wrapper hash functions', () => {
  for (const [owner, wrapper, compare] of [['DoppioConstantPool$FloatValue', 'java.lang.Float', 'fcmpl'],
    ['DoppioConstantPool$DoubleValue', 'java.lang.Double', 'dcmpl']]) {
    const equality = instructions(owner, 'equals', '(Ljava/lang/Object;)Z');
    assert.ok(equality.some(value => value.name === compare || value.name === compare.replace('l', 'g')));
    assert.ok(instructions(owner, 'hashCode', '()I').some(value => value.name === 'invokestatic' && value.cp.owner === wrapper && value.cp.name === 'hashCode'));
  }
});
test('actual fresh guest executes all93 unchanged native CP equality/hash/ownership assertions', () => {
  const diagnostic = path.join(temporary, 'diagnostic'); fs.mkdirSync(diagnostic);
  checked('javac', ['--release', '9', '--patch-module', 'java.base=' + output + path.delimiter + path.join(root, 'ci'),
    '-d', diagnostic, path.join(root, 'ci/ClassFileAnnotationConstantPoolRegression.java')]);
  const result = runClassFileMetadataGuest({root, output, diagnostic, checked,
    className: 'classes.modern_test.ClassFileAnnotationConstantPoolRegression',
    requiredPackages: ['java/lang/classfile', 'java/lang/classfile/constantpool']});
  assert.equal(result.stdout.replaceAll('\r\n', '\n'), 'CLASSFILE_ANNOTATION_CONSTANT_POOL_REGRESSION_OK|93\n'); assert.equal(result.stderr, '');
});
