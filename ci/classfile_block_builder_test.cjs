'use strict';
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {before, after, test} = require('node:test');
const {compileClassFileMetadata, runClassFileMetadataGuest} = require('./compile_classfile_metadata.cjs');
const root = path.resolve(__dirname, '..');
let temporary, output, readStructureLayout;
function checked(command, args, cwd = root, timeout = 60000) {
  const result = cp.spawnSync(command, args, {cwd, encoding:'utf8', timeout, maxBuffer:16 * 1024 * 1024});
  assert.equal(result.error, undefined, String(result.error)); assert.equal(result.signal, null);
  assert.equal(result.status, 0, (result.stderr || result.stdout).slice(-5000)); return result;
}
before(async () => {
  ({readStructureLayout} = await import('./java_class_structure_test.mjs'));
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-classfile-block-builder-')); fs.chmodSync(temporary, 0o700);
  output = path.join(temporary, 'compiled'); const support = path.join(temporary, 'support');
  fs.mkdirSync(output); fs.mkdirSync(support);
  compileClassFileMetadata({root, classlib:path.join(root, 'classes/modern_classlib'), output, support, checked});
});
after(() => { if (temporary) fs.rmSync(temporary, {recursive:true, force:true}); });
test('real scoped implementation implements the exact public block interface and typed with bridge', () => {
  const bytes = fs.readFileSync(path.join(output, 'java/lang/classfile/DoppioBuilders$BlockCode.class'));
  const layout = readStructureLayout(bytes), pool = layout.pool;
  assert.equal(bytes.readUInt16BE(6), 53);
  assert.equal(layout.interfaceCount, 1);
  const entry = pool[bytes.readUInt16BE(layout.interfacesOffset)]; assert.equal(entry.tag, 7);
  assert.equal(pool[entry.first].value, 'java/lang/classfile/CodeBuilder$BlockCodeBuilder');
  for (const descriptor of ['(Ljava/lang/classfile/CodeElement;)Ljava/lang/classfile/CodeBuilder;',
    '(Ljava/lang/classfile/ClassFileElement;)Ljava/lang/classfile/ClassFileBuilder;']) {
    const found = layout.methods.entries.find(method => method.name === 'with' && method.descriptor === descriptor);
    assert.ok(found?.code, 'Actual Java forwarding/bridge body'); assert.equal(found.flags & 256, 0);
  }
});
test('actual fresh-source guest preserves all19 native block/catch/local/transform lifecycle diagnostics', () => {
  const diagnostic = path.join(temporary, 'diagnostic'); fs.mkdirSync(diagnostic);
  checked('javac', ['--release','9','--patch-module','java.base=' + output + path.delimiter + path.join(root, 'ci'),
    '-d',diagnostic,path.join(root, 'ci/ClassFileBlockBuilderRegression.java')]);
  const result = runClassFileMetadataGuest({root, output, diagnostic, checked,
    className:'classes.modern_test.ClassFileBlockBuilderRegression',
    requiredPackages:['java/lang/classfile','java/lang/classfile/instruction','java/lang/classfile/constantpool']});
  assert.equal(result.stdout.replaceAll('\r\n','\n'), 'CLASSFILE_BLOCK_BUILDER_REGRESSION_OK|19\n');
  assert.equal(result.stderr, '');
});
