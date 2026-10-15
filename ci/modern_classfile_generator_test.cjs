'use strict';

const assert = require('node:assert/strict');
const {execFileSync, spawnSync} = require('node:child_process');
const crypto = require('node:crypto');
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

function generateFixtures(taskNames) {
  const tasks = new Map();
  const generated = new Map();
  loaded.exports({
    registerTask(name, description, task) { tasks.set(name, task); },
    registerMultiTask() {},
    file: {write(name, data) { generated.set(name, data); }},
    log: {ok() {}}
  });
  taskNames.forEach(name => {
    assert.ok(tasks.has(name), `Missing generator task: ${name}`);
    tasks.get(name)();
  });
  return generated;
}

test('generated version fixtures load, instantiate and execute on the native JVM', () => {
  const generated = generateFixtures(['generate_modern_classfile_versions', 'generate_modern_classfile_runtime_versions']);
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

const toolchainMarker = path.join(repoRoot, 'build/java-compatibility-toolchains/toolchains.json');
const requirePinnedNative = process.env.DOPPIO_REQUIRE_MODERN_GENERATOR_NATIVE === '1';
test('all generated runtime fixtures verify and execute on pinned Java 25 (Java 26 containers explicitly adapted)',
  {skip: !requirePinnedNative && !fs.existsSync(toolchainMarker) &&
    'Run ci/prepare_java_compatibility_toolchains.mjs for the pinned Java 25 native oracle.'}, context => {
    assert.ok(fs.existsSync(toolchainMarker), 'The required pinned native toolchain marker is missing.');
    const marker = JSON.parse(fs.readFileSync(toolchainMarker, 'utf8'));
    const lockBytes = fs.readFileSync(path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json'));
    const lock = JSON.parse(lockBytes);
    assert.equal(marker.lockSha256, crypto.createHash('sha256').update(lockBytes).digest('hex'));
    const native = marker.toolchains.find(entry => entry.feature === 25);
    const locked = lock.toolchains.find(entry => entry.feature === 25);
    assert.ok(native, 'Pinned Java 25 is required.');
    for (const name of ['id', 'feature', 'vendor', 'version', 'archiveSha256']) {
      assert.equal(native[name], locked[name], `Pinned Java 25 ${name}`);
    }
    const javaBin = path.join(native.home, 'bin/java');
    const version = spawnSync(javaBin, ['-version'], {encoding: 'utf8', timeout: 30000});
    assert.equal(version.status, 0, version.stderr || version.error?.message);
    assert.match(version.stderr, /version "25\./, 'The native oracle must actually be Java 25.');

    const generated = generateFixtures([
      'generate_modern_classfile_versions', 'generate_modern_classfile_runtime_versions',
      'generate_java18_unsigned_multiply_high', 'generate_java19_thread_id',
      'generate_java19_thread_sleep_duration', 'generate_java19_thread_sleep_duration_interrupt',
      'generate_java21_thread_is_virtual', 'generate_java21_list_sequenced',
      'generate_java21_deque_sequenced', 'generate_java21_sorted_set_sequenced',
      'generate_java21_sorted_map_sequenced'
    ]);
    const classFiles = [...generated].filter(([name]) => name.endsWith('.class'));
    assert.equal(classFiles.length, 27, 'Keep the complete synchronous runtime generator inventory.');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-modern-runtime-generator-'));
    const adapted = [];
    try {
      for (const [name, original] of classFiles) {
        const version = Number(/Java(\d+)/.exec(name)[1]);
        assert.equal(original.readUInt32BE(0), 0xcafebabe, name);
        assert.equal(original.readUInt16BE(4), 0, name);
        assert.equal(original.readUInt16BE(6), version + 44, `${name}: original major version`);
        const bytes = Buffer.from(original);
        if (version === 26) {
          // Only these straight-line container probes exceed the pinned JDK's
          // supported version. Preserve and assert their original major above;
          // adapt a copy for complete native structural/bytecode verification.
          bytes.writeUInt16BE(69, 6);
          adapted.push(name);
        }
        const destination = path.join(directory, name);
        fs.mkdirSync(path.dirname(destination), {recursive: true});
        fs.writeFileSync(destination, bytes);
        const runout = generated.get(name.replace(/\.class$/, '.runout'));
        if (runout !== undefined) fs.writeFileSync(destination.replace(/\.class$/, '.runout'), runout);
      }
      assert.deepEqual(adapted, ['classes/modern_test/Java26ClassFileVersion.class',
        'classes/modern_test/Java26ClassFileRuntime.class']);
      const driver = path.join(directory, 'ValidateRuntimeGenerated.java');
      fs.writeFileSync(driver, `
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public class ValidateRuntimeGenerated {
  public static void main(String[] paths) throws Exception {
    PrintStream output = System.out;
    int failures = 0, executed = 0;
    try (URLClassLoader loader = new URLClassLoader(new java.net.URL[] {Path.of(".").toUri().toURL()},
        ClassLoader.getPlatformClassLoader())) {
      for (String path : paths) {
        String name = path.substring(0, path.length() - 6).replace('/', '.');
        try {
          Class<?> fixture = Class.forName(name, false, loader);
          fixture.getDeclaredMethods(); // Force method verification, including worker classes.
          fixture.getConstructor().newInstance();
          Path runout = Path.of(path.substring(0, path.length() - 6) + ".runout");
          if (Files.exists(runout)) {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            try (PrintStream capture = new PrintStream(bytes, true, StandardCharsets.UTF_8)) {
              System.setOut(capture);
              fixture.getMethod("main", String[].class).invoke(null, (Object) new String[0]);
            } finally {
              System.setOut(output);
            }
            String actual = bytes.toString(StandardCharsets.UTF_8);
            String expected = Files.readString(runout, StandardCharsets.UTF_8);
            if (!actual.equals(expected)) throw new AssertionError("Output mismatch in " + name +
                ": expected=" + expected + "; actual=" + actual);
            executed++;
          }
        } catch (Throwable error) {
          System.setOut(output);
          failures++;
          System.err.println("INVALID GENERATED FIXTURE " + name);
          error.printStackTrace();
        }
      }
    }
    if (failures != 0) throw new AssertionError(failures + " invalid generated fixtures");
    System.out.println("native-generated-fixtures:" + paths.length + ":" + executed + ":ok");
  }
}
`);
      const output = execFileSync(javaBin, ['-Xverify:all', driver, ...classFiles.map(([name]) => name)], {
        cwd: directory, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024
      });
      assert.equal(output, 'native-generated-fixtures:27:16:ok\n');
      context.diagnostic('Verified original majors 62–70; Java 26 container copies alone adapted 70→69 for Java 25.');
      for (const [name, original] of classFiles) {
        assert.equal(original.readUInt16BE(6), Number(/Java(\d+)/.exec(name)[1]) + 44,
          `${name}: native validation must not mutate generated bytes`);
      }
    } finally {
      fs.rmSync(directory, {recursive: true, force: true});
    }
  });
