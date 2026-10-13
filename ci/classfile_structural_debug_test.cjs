'use strict';

const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {before, after, test} = require('node:test');
const {compileClassFileMetadata, runClassFileMetadataGuest} = require('./compile_classfile_metadata.cjs');
const root = path.resolve(__dirname, '..'), prefix = 'java/lang/classfile/', units = new Map();
let temporary, output, decodeCoreCode;
function checked(command, args, cwd = root, timeout = 60000) {
  const result = cp.spawnSync(command, args, {cwd, encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024});
  assert.equal(result.error, undefined, String(result.error)); assert.equal(result.signal, null);
  assert.equal(result.status, 0, (result.stderr || result.stdout).slice(-6000)); return result;
}
before(async () => {
  const {readStructureLayout} = await import('./java_class_structure_test.mjs');
  ({decodeCoreCode} = await import('./java_core_bytecode.mjs'));
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-classfile-structural-debug-')); fs.chmodSync(temporary, 0o700);
  output = path.join(temporary, 'compiled'); const support = path.join(temporary, 'support');
  fs.mkdirSync(output); fs.mkdirSync(support);
  compileClassFileMetadata({root, classlib: path.join(root, 'classes/modern_classlib'), output, support, checked});
  for (const name of ['DoppioClassFile', 'DoppioClassFileVerifier', 'DoppioClassReader', 'DoppioCodeFlow']) {
    const filename = path.join(output, prefix, name + '.class'), bytes = fs.readFileSync(filename);
    assert.equal(bytes.readUInt16BE(6), 53, 'Natural release9/target9 facade output, not rewritten headers');
    units.set(name, {bytes, layout: readStructureLayout(bytes)});
  }
});
after(() => { if (temporary) fs.rmSync(temporary, {recursive: true, force: true}); });
function instructions(owner, entry) {
  const unit = units.get(owner); assert.ok(entry.code, owner + '.' + entry.name + ' genuine Java body');
  assert.equal(entry.flags & 0x100, 0);
  return decodeCoreCode(unit.bytes.subarray(entry.code.instructionsOffset, entry.code.instructionsOffset + entry.code.codeLength),
    unit.layout.pool, unit.bytes);
}
function method(owner, name, descriptor) {
  const matches = units.get(owner).layout.methods.entries.filter(entry => entry.name === name && entry.descriptor === descriptor);
  assert.equal(matches.length, 1, owner + '.' + name + descriptor); return matches[0];
}
test('byte verification preserves configured parse options before structural verification', () => {
  const entry = method('DoppioClassFile', 'verify', '([B)Ljava/util/List;');
  const calls = instructions('DoppioClassFile', entry).filter(value => value.cp && value.name.startsWith('invoke'));
  assert.ok(calls.some(value => value.cp.owner === 'java.lang.classfile.DoppioClassFile' && value.cp.name === 'parse' &&
    value.cp.descriptor === '([B)Ljava/lang/classfile/ClassModel;'));
  assert.ok(calls.some(value => value.cp.owner === 'java.lang.classfile.DoppioClassFileVerifier' && value.cp.name === 'verify' &&
    value.cp.descriptor === '(Ljava/lang/classfile/ClassModel;Ljava/lang/classfile/ClassHierarchyResolver;)Ljava/util/List;'));
  assert.ok(!calls.some(value => value.cp.owner === 'java.lang.classfile.DoppioClassFileVerifier' &&
    value.cp.name === 'verify' && value.cp.descriptor.startsWith('([B')));
});
test('selected verifier uses held instruction boundaries and verify-purpose flow, never class definition', () => {
  const descriptor = '(Ljava/lang/classfile/ClassModel;Ljava/lang/classfile/MethodModel;' +
    'Ljava/lang/classfile/ClassHierarchyResolver;)V';
  const calls = instructions('DoppioClassFileVerifier', method('DoppioClassFileVerifier', 'verifyMethod', descriptor));
  assert.ok(calls.some(value => value.cp?.owner === 'java.lang.classfile.DoppioClassReader' &&
    value.cp.name === 'isInstructionBoundary' && value.cp.descriptor === '(Ljava/lang/classfile/CodeModel;I)Z'));
  assert.ok(calls.some(value => value.cp?.owner === 'java.lang.classfile.DoppioCodeFlow' && value.cp.name === 'analyzeForVerification'));
  for (const entry of units.get('DoppioClassFileVerifier').layout.methods.entries.filter(value => value.code))
    assert.ok(!instructions('DoppioClassFileVerifier', entry).some(value => value.cp &&
      /^(?:defineClass|defineHiddenClass|initialize|ensureClassInitialized)$/.test(value.cp.name)));
});
test('fresh-source guest replays all92 selected debug checks,21 own arrays and3 valid definitions', () => {
  const diagnostic = path.join(temporary, 'diagnostic'); fs.mkdirSync(diagnostic);
  checked('javac', ['--release', '9', '--patch-module', 'java.base=' + output + path.delimiter + path.join(root, 'ci') +
    path.delimiter + path.join(root, 'classes/modern_fixture'), '-d', diagnostic,
    path.join(root, 'classes/modern_fixture/classfile/ClassFileSupport.java'),
    path.join(root, 'classes/modern_fixture/ClassFileStructuralDebugFinal.java'),
    path.join(root, 'ci/ClassFileStructuralDebugRegression.java')]);
  const result = runClassFileMetadataGuest({root, output, diagnostic, checked,
    className: 'classes.modern_test.ClassFileStructuralDebugRegression',
    requiredPackages: ['java/lang/classfile', 'java/lang/classfile/attribute', 'java/lang/classfile/instruction',
      'java/lang/classfile/constantpool', 'java/lang/constant']});
  assert.equal(result.stderr, '');
  const lines = result.stdout.replaceAll('\r\n', '\n').split('\n').filter(Boolean);
  assert.deepEqual(lines.filter(value => value.startsWith('CASE|')).map(value => value.split('|')[1]),
    ['cf-struct-debug-valid', 'cf-struct-debug-lvt-start', 'cf-struct-debug-lvt-end', 'cf-struct-debug-lvt-reversed',
      'cf-struct-debug-slots', 'cf-struct-debug-type-text', 'cf-struct-debug-local-type-ranges', 'cf-struct-debug-line-ranges']);
  const artifacts = lines.filter(value => value.startsWith('CF_ARTIFACT|'));
  assert.equal(artifacts.length, 21);
  for (const artifact of artifacts) {
    const bytes = Buffer.from(artifact.split('|')[3], 'base64');
    assert.equal(bytes.readUInt32BE(0), 0xcafebabe); assert.equal(bytes.readUInt16BE(6), 69, 'Actually emitted API class version');
  }
  assert.deepEqual(lines.filter(value => !value.startsWith('CASE|') && !value.startsWith('CF_ARTIFACT|')),
    ['CLASSFILE_STRUCTURAL_DEBUG_OK|92|artifacts=21', 'CLASSFILE_STRUCTURAL_DEBUG_REGRESSION_OK|8']);
});
