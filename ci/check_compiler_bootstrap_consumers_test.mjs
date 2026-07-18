import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const checkerPath = path.join(path.dirname(__filename), 'check_compiler_bootstrap_consumers.mjs');
const kotlinConsumers = [
  'kotlin_smoke.sh',
  'kotlin_modern_java_interop_smoke.sh',
  'kotlin_duration_smoke.sh',
];
const scalaConsumers = [
  'scala_smoke.sh',
  'scala_modern_interop_smoke.sh',
  'scala_duration_smoke.sh',
];

function kotlinFixture(runtimeClasspath = 'runtime_cp="$out_dir:$stdlib_jar"') {
  return `#!/usr/bin/env bash
modern_overlay_jar="$repo_root/build/modern-bootstrap-overlay/modern-bootstrap.jar"
modern_boot_jar="$repo_root/vendor/java_home/lib/doppio.jar"
runtime_boot_jar="$repo_root/vendor/java_home/lib/rt.jar"
compiler_target_cp="$modern_overlay_jar:$modern_boot_jar:$runtime_boot_jar:$stdlib_jar"
org.jetbrains.kotlin.cli.jvm.K2JVMCompiler \\
  -no-jdk \\
  -classpath "$compiler_target_cp" \\
  -d "$out_dir"
${runtimeClasspath}
`;
}

function scalaFixture(runtimeClasspath = 'runtime_cp="$out_dir:$library_jar"') {
  return `#!/usr/bin/env bash
modern_overlay_jar="$repo_root/build/modern-bootstrap-overlay/modern-bootstrap.jar"
modern_boot_jar="$repo_root/vendor/java_home/lib/doppio.jar"
runtime_boot_jar="$repo_root/vendor/java_home/lib/rt.jar"
compiler_boot_cp="$modern_overlay_jar:$modern_boot_jar:$runtime_boot_jar"
scala.tools.nsc.Main \\
  -javabootclasspath "$compiler_boot_cp" \\
  -classpath "$source_cp"
${runtimeClasspath}
`;
}

function writeConsumers(ciDir) {
  fs.mkdirSync(ciDir, { recursive: true });
  for (const scriptName of kotlinConsumers) {
    fs.writeFileSync(path.join(ciDir, scriptName), kotlinFixture());
  }
  for (const scriptName of scalaConsumers) {
    fs.writeFileSync(path.join(ciDir, scriptName), scalaFixture());
  }
}

function runChecker(ciDir) {
  return spawnSync(process.execPath, [checkerPath], {
    encoding: 'utf8',
    env: { ...process.env, COMPILER_BOOTSTRAP_CONSUMER_CI_DIR: ciDir },
  });
}

function expectFailure(result, message, label) {
  if (result.status === 0 || !result.stderr.includes(message)) {
    throw new Error(`expected ${label} to fail:\n${result.stdout}\n${result.stderr}`);
  }
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-bootstrap-consumers-'));
const ciDir = path.join(root, 'ci');
try {
  writeConsumers(ciDir);
  const completeResult = runChecker(ciDir);
  if (completeResult.status !== 0) {
    throw new Error(`expected complete consumers to pass:\n${completeResult.stdout}\n${completeResult.stderr}`);
  }

  fs.writeFileSync(
    path.join(ciDir, 'kotlin_smoke.sh'),
    kotlinFixture().replace(
      '$modern_overlay_jar:$modern_boot_jar:$runtime_boot_jar:$stdlib_jar',
      '$modern_boot_jar:$modern_overlay_jar:$runtime_boot_jar:$stdlib_jar'
    )
  );
  expectFailure(runChecker(ciDir), 'ordered Kotlin compiler target classpath', 'reordered Kotlin bootstrap');

  writeConsumers(ciDir);
  fs.writeFileSync(path.join(ciDir, 'kotlin_duration_smoke.sh'), kotlinFixture().replace('  -no-jdk \\\n', ''));
  expectFailure(runChecker(ciDir), 'disable host JDK target metadata', 'missing Kotlin -no-jdk');

  writeConsumers(ciDir);
  fs.writeFileSync(
    path.join(ciDir, 'kotlin_modern_java_interop_smoke.sh'),
    kotlinFixture().replace('  -classpath "$compiler_target_cp" \\\n', '')
  );
  expectFailure(runChecker(ciDir), 'pass the Doppio compiler target classpath', 'missing Kotlin target classpath');

  writeConsumers(ciDir);
  fs.writeFileSync(
    path.join(ciDir, 'scala_smoke.sh'),
    scalaFixture().replace(
      '$modern_overlay_jar:$modern_boot_jar:$runtime_boot_jar',
      '$modern_boot_jar:$runtime_boot_jar:$modern_overlay_jar'
    )
  );
  expectFailure(runChecker(ciDir), 'ordered Scala compiler boot classpath', 'reordered Scala bootstrap');

  writeConsumers(ciDir);
  fs.writeFileSync(
    path.join(ciDir, 'scala_duration_smoke.sh'),
    scalaFixture().replace('  -javabootclasspath "$compiler_boot_cp" \\\n', '')
  );
  expectFailure(runChecker(ciDir), 'pass the Doppio compiler boot classpath', 'missing Scala boot classpath');

  writeConsumers(ciDir);
  fs.writeFileSync(
    path.join(ciDir, 'scala_modern_interop_smoke.sh'),
    scalaFixture('runtime_cp="$out_dir:$modern_overlay_jar:$library_jar"')
  );
  expectFailure(runChecker(ciDir), 'must not add modern-bootstrap.jar', 'runtime overlay contamination');

  writeConsumers(ciDir);
  fs.rmSync(path.join(ciDir, 'kotlin_modern_java_interop_smoke.sh'));
  expectFailure(runChecker(ciDir), 'Missing compiler bootstrap consumer', 'missing consumer script');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('Compiler bootstrap consumer checker tests passed.');
