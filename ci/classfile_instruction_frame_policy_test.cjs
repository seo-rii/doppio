'use strict';
const assert = require('node:assert/strict'), cp = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {before, after, test} = require('node:test');
const {compileClassFileMetadata, runClassFileMetadataGuest} = require('./compile_classfile_metadata.cjs');
const root = path.resolve(__dirname, '..');
let temporary, output, diagnostic;
function checked(command, args, cwd = root, timeout = 120000) {
  const result = cp.spawnSync(command, args, {cwd, encoding:'utf8', timeout, maxBuffer:16 * 1024 * 1024});
  assert.equal(result.error, undefined, String(result.error)); assert.equal(result.signal, null);
  assert.equal(result.status, 0, (result.stderr || result.stdout).slice(-6000)); return result;
}
before(() => {
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-instruction-frame-policy-')); fs.chmodSync(temporary, 0o700);
  output = path.join(temporary, 'compiled'); const support = path.join(temporary, 'support');
  diagnostic = path.join(temporary, 'diagnostic');
  for (const directory of [output, support, diagnostic]) fs.mkdirSync(directory);
  compileClassFileMetadata({root, classlib:path.join(root, 'classes/modern_classlib'), output, support, checked});
  checked('javac', ['--release', '9', '--patch-module', 'java.base=' + output + path.delimiter + path.join(root, 'ci'),
    '-d', diagnostic, path.join(root, 'ci/ClassFileInstructionWriterRegression.java')]);
});
after(() => { if (temporary) fs.rmSync(temporary, {recursive:true, force:true}); });
for (const [entry, profile, count] of [['Labels', 'labels', 4], ['Dead', 'dead', 3], ['Transform', 'transform', 1]])
  test('fresh real guest matches native writer policy profile: ' + profile, () => {
    const result = runClassFileMetadataGuest({root, output, diagnostic, checked,
      className:'classes.modern_test.ClassFileInstructionWriterRegression$' + entry,
      requiredPackages:['java/lang/classfile', 'java/lang/classfile/instruction', 'java/lang/classfile/constantpool']});
    assert.equal(result.stdout.replaceAll('\r\n', '\n'), 'CLASSFILE_INSTRUCTION_WRITER_REGRESSION_OK|' + profile + '|' + count + '\n');
    assert.equal(result.stderr, '');
  });
