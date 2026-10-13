'use strict';

const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {before, after, test} = require('node:test');
const {compileClassFileMetadata, runClassFileMetadataGuest} = require('./compile_classfile_metadata.cjs');
const root = path.resolve(__dirname, '..'), classlib = path.join(root, 'classes/modern_classlib');
let temporary, output, unit, decodeCoreCode;
function checked(command, args, cwd = root, timeout = 60000) {
  const result = cp.spawnSync(command, args, {cwd, encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024});
  assert.equal(result.error, undefined, String(result.error)); assert.equal(result.signal, null);
  assert.equal(result.status, 0, (result.stderr || result.stdout).slice(-6000)); return result;
}
before(async () => {
  const {readStructureLayout} = await import('./java_class_structure_test.mjs');
  ({decodeCoreCode} = await import('./java_core_bytecode.mjs'));
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-classfile-class-entry-')); fs.chmodSync(temporary, 0o700);
  output = path.join(temporary, 'compiled'); const support = path.join(temporary, 'support');
  fs.mkdirSync(output); fs.mkdirSync(support);
  compileClassFileMetadata({root, classlib, output, support, checked});
  const filename = path.join(output, 'java/lang/classfile/constantpool/DoppioConstantPool$ClassValue.class');
  const stat = fs.lstatSync(filename); assert.ok(stat.isFile() && !stat.isSymbolicLink());
  const bytes = fs.readFileSync(filename); assert.equal(bytes.readUInt16BE(6), 53, 'Natural release9 ClassEntry output');
  unit = {bytes, layout: readStructureLayout(bytes)};
});
after(() => { if (temporary) fs.rmSync(temporary, {recursive: true, force: true}); });
function method(name, descriptor) {
  const matches = unit.layout.methods.entries.filter(entry => entry.name === name && entry.descriptor === descriptor);
  assert.equal(matches.length, 1, 'ClassValue.' + name + descriptor); return matches[0];
}
function instructions(name, descriptor) {
  const entry = method(name, descriptor); assert.ok(entry.code);
  assert.equal(entry.flags & 0x100, 0, 'Real Java implementation, never an injected native');
  return decodeCoreCode(unit.bytes.subarray(entry.code.instructionsOffset,
    entry.code.instructionsOffset + entry.code.codeLength), unit.layout.pool, unit.bytes);
}
test('ClassEntry has genuine typed semantic equals and descriptor-content hash implementations', () => {
  assert.equal(method('equals', '(Ljava/lang/Object;)Z').flags, 1);
  assert.equal(method('hashCode', '()I').flags, 1);
  assert.ok(instructions('equals', '(Ljava/lang/Object;)Z').some(value => value.name === 'instanceof'));
  const hash = instructions('hashCode', '()I');
  assert.ok(hash.some(value => value.name === 'invokevirtual' && value.cp.owner === 'java.lang.String' && value.cp.name === 'hashCode'));
  assert.ok(!hash.some(value => /^invoke/.test(value.name) && value.cp.name === 'index'), 'Class hashes are independent of CP child indexes');
  assert.ok(!hash.some(value => /^invoke/.test(value.name) && value.cp.name === 'asSymbol'), 'Hashing does not introduce symbol validation');
});
test('fresh guest executes all281 unchanged native ClassEntry equality/hash/ownership assertions', () => {
  const diagnostic = path.join(temporary, 'diagnostic'); fs.mkdirSync(diagnostic);
  checked('javac', ['--release', '9', '--patch-module', 'java.base=' + output + path.delimiter + path.join(root, 'ci'),
    '-d', diagnostic, path.join(root, 'ci/ClassFileClassEntryRegression.java')]);
  const result = runClassFileMetadataGuest({root, output, diagnostic, checked,
    className: 'classes.modern_test.ClassFileClassEntryRegression',
    requiredPackages: ['java/lang/classfile', 'java/lang/classfile/attribute', 'java/lang/classfile/constantpool']});
  assert.equal(result.stdout.replaceAll('\r\n', '\n'), 'CLASSFILE_CLASS_ENTRY_REGRESSION_OK|281\n'); assert.equal(result.stderr, '');
});
