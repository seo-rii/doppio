'use strict';

const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const Module = require('node:module');
const os = require('node:os');
const path = require('node:path');
const {test} = require('node:test');
const typescript = require('typescript');

const repoRoot = path.resolve(__dirname, '..');
const filename = path.join(repoRoot, 'tasks/modern_java.ts');
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(typescript.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: {target: typescript.ScriptTarget.ES2015, module: typescript.ModuleKind.CommonJS}
}).outputText, filename);

test('generated version fixtures load, instantiate and execute on the native JVM', () => {
  const tasks = new Map();
  const generated = new Map();
  loaded.exports({
    registerTask(name, description, task) { tasks.set(name, task); },
    registerMultiTask() {},
    file: {write(name, data) { generated.set(name, data); }},
    log: {ok() {}}
  });
  tasks.get('generate_modern_classfile_versions')();
  tasks.get('generate_modern_classfile_runtime_versions')();

  const classFiles = [...generated].filter(([name]) => name.endsWith('.class'));
  assert.equal(classFiles.length, 16);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-modern-generator-'));
  try {
    const expectedOutput = [];
    for (const [name, bytes] of classFiles) {
      const version = Number(/Java(\d+)ClassFile/.exec(name)[1]);
      assert.equal(bytes.readUInt32BE(0), 0xcafebabe, name);
      assert.equal(bytes.readUInt16BE(4), 0, name);
      assert.equal(bytes.readUInt16BE(6), version + 44, name);
      const destination = path.join(directory, name);
      fs.mkdirSync(path.dirname(destination), {recursive: true});
      fs.writeFileSync(destination, bytes);
      const runout = generated.get(name.replace(/\.class$/, '.runout'));
      if (runout !== undefined) expectedOutput.push(runout);
    }
    const driver = path.join(directory, 'ValidateGenerated.java');
    fs.writeFileSync(driver, `
import java.nio.file.Files;
import java.nio.file.Paths;

public class ValidateGenerated extends ClassLoader {
  public static void main(String[] paths) throws Exception {
    ValidateGenerated loader = new ValidateGenerated();
    for (String path : paths) {
      byte[] bytes = Files.readAllBytes(Paths.get(path));
      // These fixtures probe newer containers, not newer instructions. Java 17
      // validates their complete structure after changing only the major version.
      // The original version bytes are asserted independently by the JS harness.
      bytes[6] = 0;
      bytes[7] = 61;
      Class<?> fixture = loader.defineClass(null, bytes, 0, bytes.length);
      fixture.getConstructor().newInstance();
      if (path.contains("Runtime")) {
        fixture.getMethod("main", String[].class).invoke(null, (Object) new String[0]);
      }
    }
  }
}
`);
    const javaBin = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'java') : 'java';
    const output = execFileSync(javaBin, [driver, ...classFiles.map(([name]) => path.join(directory, name))], {
      encoding: 'utf8', timeout: 30000
    });
    assert.equal(output, expectedOutput.join(''));
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});
