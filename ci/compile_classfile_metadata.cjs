'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const special = new Set(['java/lang/System$Logger.java', 'java/lang/System$DoppioLogger.java',
  'sun/invoke/util/VerifyAccess.java']);
const covarianceSources = ['java/lang/classfile/instruction/ConstantInstruction.java',
  'java/lang/classfile/instruction/DoppioConstantInstructions.java'];
const supportEntries = ['java/nio/file/FileTreeIterator.class', 'java/nio/file/FileTreeWalker.class',
  'java/nio/file/FileTreeWalker$1.class', 'java/nio/file/FileTreeWalker$DirectoryNode.class',
  'java/nio/file/FileTreeWalker$Event.class', 'java/nio/file/FileTreeWalker$EventType.class'];
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const slash = value => value.split(path.sep).join('/');

function sourceFiles(directory) {
  const files = [];
  for (const name of fs.readdirSync(directory).sort()) {
    if (name === 'out') continue;
    const filename = path.join(directory, name), stat = fs.lstatSync(filename);
    assert.ok(!stat.isSymbolicLink(), 'Compiler source closure never follows a symbolic link');
    if (stat.isDirectory()) files.push(...sourceFiles(filename));
    else if (name.endsWith('.java')) { assert.ok(stat.isFile()); files.push(filename); }
  }
  return files;
}

/** Genuine source compilation with the same two phases as production.
 * Only the exact covariance declarations see system boxed-constant types.
 * Every remaining classlib source retains the release-9 API compilation floor.
 */
function compileClassFileMetadata({root, classlib, output, support, inputs, checked}) {
  const expected = sourceFiles(classlib).filter(file => !special.has(slash(path.relative(classlib, file))));
  if (inputs === undefined) inputs = expected;
  assert.deepEqual([...inputs].sort(), [...expected].sort(), 'Exact retained source closure, not a hand-picked substitute');
  assert.equal(new Set(inputs).size, inputs.length, 'Source closure contains no duplicates');
  const sourceHashes = inputs.map(file => [file, sha(fs.readFileSync(file))]);
  const runtime = path.join(root, 'vendor/java_home/lib/rt.jar'), runtimeHash = sha(fs.readFileSync(runtime));
  const narrow = covarianceSources.map(relative => path.join(classlib, relative));
  assert.ok(narrow.every(file => inputs.includes(file)));
  const normal = inputs.filter(file => !narrow.includes(file));
  const operations = [
    {command: 'jar', arguments: ['--extract', '--file', runtime, ...supportEntries], cwd: support},
    {command: 'javac', arguments: ['-J-Dfile.encoding=UTF8', '-source', '9', '-target', '9', '-implicit:none',
      '--patch-module', 'java.base=' + classlib, '-d', output, ...narrow], cwd: root},
    {command: 'javac', arguments: ['-J-Dfile.encoding=UTF8', '--release', '9', '--patch-module',
      'java.base=' + output + path.delimiter + classlib + path.delimiter + support,
      '-d', output, ...normal], cwd: root}
  ];
  for (const operation of operations) checked(operation.command, operation.arguments, operation.cwd);
  assert.deepEqual(inputs.map(file => [file, sha(fs.readFileSync(file))]), sourceHashes,
    'Source declarations were not rewritten to force a compiler ABI');
  assert.equal(sha(fs.readFileSync(runtime)), runtimeHash, 'Retained SDK/runtime JAR was not modified');
  for (const relative of ['ConstantInstruction', 'ConstantInstruction$ArgumentConstantInstruction',
    'DoppioConstantInstructions', 'DoppioConstantInstructions$ArgumentValue']) {
    const filename = path.join(output, 'java/lang/classfile/instruction', relative + '.class');
    const stat = fs.lstatSync(filename); assert.ok(stat.isFile() && !stat.isSymbolicLink());
    const bytes = fs.readFileSync(filename);
    assert.equal(bytes.readUInt32BE(0), 0xcafebabe);
    assert.equal(bytes.readUInt16BE(6), 53, 'Naturally target-9 bytecode, not a rewritten class header');
  }
  return {inputs, sourceHashes, runtimeHash, operations};
}

/** Run the real CLI/JVM API and check its actual successful-definition providers.
 * Class.getResource is a separate resource path, not proof of a loaded class's
 * defining classpath item. getPackages records those items after defineClass.
 */
function runClassFileMetadataGuest({root, output, diagnostic, className, checked,
  timeout = 60000, requiredPackages = ['java/lang/classfile']}) {
  assert.ok(path.isAbsolute(output) && path.isAbsolute(diagnostic));
  assert.ok(requiredPackages.length > 0);
  assert.ok(requiredPackages.every(name => name === 'java/lang/classfile' || name.startsWith('java/lang/classfile/')));
  const options = {runtime: path.join(root, 'build/release-cli'), output, diagnostic, className, requiredPackages};
  const script = `
    'use strict';
    const assert=require('node:assert/strict'),os=require('node:os'),path=require('node:path');
    const options=${JSON.stringify(options)};
    const javaCLI=require(path.join(options.runtime,'src/java_cli')).default;
    let instance;
    javaCLI(['-Xbootclasspath/a:'+options.output,'-cp',options.diagnostic,options.className],{
      doppioHomePath:options.runtime,nativeClasspath:[],launcherName:'classfile-metadata-guest',
      intMode:false,dumpJITStats:false,tmpDir:os.tmpdir()
    },status=>{
      assert.equal(status,0,'Actual Java diagnostic exited successfully');
      assert.ok(instance,'Actual JVM instance, not a test loader');
      const packages=instance.getBootstrapClassLoader().getPackages();
      for(const name of options.requiredPackages){
        const entry=packages.find(value=>value[0]===name);
        assert.ok(entry,'Required classfile namespace was genuinely loaded: '+name);
        assert.deepEqual(entry[1],[options.output],'Actual successful definitions came only from fresh compiled source: '+name);
      }
      process.exit(0);
    },jvm=>{instance=jvm;});
  `;
  return checked(process.execPath, ['--no-deprecation', '-e', script], root, timeout);
}

module.exports = {compileClassFileMetadata, runClassFileMetadataGuest};
