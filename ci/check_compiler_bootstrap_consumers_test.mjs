import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const checkerPath = path.join(path.dirname(__filename), 'check_compiler_bootstrap_consumers.mjs');
const kotlinConsumers = new Map([
  ['kotlin_smoke.sh', '$stdlib_jar'],
  ['kotlin_modern_java_interop_smoke.sh', '$stdlib_jar'],
  ['kotlin_duration_smoke.sh', '$stdlib_jar'],
  ['kotlin_diagnostic_smoke.sh', '$stdlib_jar'],
  ['kotlin_bytecode_smoke.sh', '$stdlib_jar'],
  ['kotlin_bytecode_runtime_smoke.sh', '$stdlib_jar'],
  ['kotlin_value_class_smoke.sh', '$stdlib_jar'],
  ['kotlin_reified_array_smoke.sh', '$stdlib_jar'],
  ['kotlin_inline_control_smoke.sh', '$stdlib_jar'],
  ['kotlin_delegation_bridge_smoke.sh', '$stdlib_jar'],
  ['kotlin_readonly_delegate_smoke.sh', '$stdlib_jar'],
  ['kotlin_when_mapping_smoke.sh', '$stdlib_jar'],
  ['kotlin_annotation_reflection_smoke.sh', '$stdlib_jar'],
  ['kotlin_capture_shape_smoke.sh', '$stdlib_jar'],
  ['kotlin_proxy_smoke.sh', '$stdlib_jar'],
  ['kotlin_sequence_builder_smoke.sh', '$stdlib_jar'],
  ['kotlin_reflection_shape_smoke.sh', '$stdlib_jar'],
  ['kotlin_receiver_lambda_smoke.sh', '$stdlib_jar'],
  ['kotlin_annotation_metadata_smoke.sh', '$stdlib_jar'],
  ['kotlin_collection_builder_smoke.sh', '$stdlib_jar'],
  ['kotlin_control_flow_smoke.sh', '$stdlib_jar'],
  ['kotlin_result_exception_smoke.sh', '$stdlib_jar'],
  ['kotlin_initialization_delegate_smoke.sh', '$stdlib_jar'],
  ['kotlin_multifile_facade_smoke.sh', '$stdlib_jar'],
  ['kotlin_sam_smoke.sh', '$stdlib_jar'],
  ['kotlin_extension_variance_smoke.sh', '$stdlib_jar'],
  ['kotlin_completable_future_smoke.sh', '$stdlib_jar'],
  ['kotlin_concurrency_smoke.sh', '$stdlib_jar'],
  ['kotlin_unsigned_smoke.sh', '$stdlib_jar'],
  ['kotlin_text_regex_smoke.sh', '$stdlib_jar'],
  ['kotlin_basic_construct_smoke.sh', '$stdlib_jar'],
  ['kotlin_advanced_construct_smoke.sh', '$stdlib_jar'],
  ['kotlin_local_interop_smoke.sh', '$stdlib_jar'],
  ['kotlin_modern_construct_smoke.sh', '$stdlib_jar'],
  ['kotlin_default_synthetic_smoke.sh', '$stdlib_jar'],
  ['kotlin_jvm_default_smoke.sh', '$stdlib_jar'],
  ['kotlin_indy_concat_smoke.sh', '$stdlib_jar'],
  ['kotlin_jvm_interop_smoke.sh', '$stdlib_jar'],
  ['kotlin_contract_smoke.sh', '$stdlib_jar'],
  ['kotlin_enum_smoke.sh', '$stdlib_jar'],
  ['kotlin_mutable_delegate_smoke.sh', '$stdlib_jar'],
  ['kotlin_reference_sequence_smoke.sh', '$stdlib_jar'],
  ['kotlin_coroutine_smoke.sh', '$stdlib_jar'],
  ['kotlin_suspend_smoke.sh', '$stdlib_jar'],
  ['kotlin_suspend_control_smoke.sh', '$stdlib_jar'],
  ['kotlin_suspend_inline_smoke.sh', '$stdlib_jar'],
  ['kotlin_io_smoke.sh', '$stdlib_jar'],
  ['kotlin_reflect_smoke.sh', '$stdlib_jar:$reflect_jar'],
  ['kotlin_methodhandle_smoke.sh', '$stdlib_jar'],
  ['kotlin_record_smoke.sh', '$stdlib_jar:$support_dir'],
]);
const scalaConsumers = [
  'scala_smoke.sh',
  'scala_modern_interop_smoke.sh',
  'scala_duration_smoke.sh',
  'scala_diagnostic_smoke.sh',
  'scala_core_smoke.sh',
  'scala_methodhandle_smoke.sh',
  'scala_record_smoke.sh',
  'scala_stackwalker_smoke.sh',
  'scala_annotation_smoke.sh',
  'scala_collection_smoke.sh',
  'scala_concurrent_smoke.sh',
  'scala_functional_smoke.sh',
  'scala_interop_smoke.sh',
  'scala_io_smoke.sh',
  'scala_lambda_serialization_smoke.sh',
  'scala_language_smoke.sh',
  'scala_library_smoke.sh',
  'scala_macro_smoke.sh',
  'scala_nio_smoke.sh',
  'scala_package_smoke.sh',
  'scala_proxy_smoke.sh',
  'scala_reflect_smoke.sh',
  'scala_reflection_shape_smoke.sh',
];

function kotlinFixture(targetSuffix = '$stdlib_jar', runtimeClasspath = 'runtime_cp="$out_dir:$stdlib_jar"') {
  return `#!/usr/bin/env bash
modern_overlay_jar="$repo_root/build/modern-bootstrap-overlay/modern-bootstrap.jar"
modern_boot_jar="$repo_root/vendor/java_home/lib/doppio.jar"
runtime_boot_jar="$repo_root/vendor/java_home/lib/rt.jar"
compiler_target_cp="$modern_overlay_jar:$modern_boot_jar:$runtime_boot_jar:${targetSuffix}"
compile_timeout="\${FIXTURE_COMPILE_TIMEOUT_SECONDS:-60}"
run_timeout="\${FIXTURE_RUN_TIMEOUT_SECONDS:-60}"
kill_after="\${FIXTURE_KILL_AFTER_SECONDS:-30}"
timeout -k "\${kill_after}s" -s INT "\${compile_timeout}s" \\
org.jetbrains.kotlin.cli.jvm.K2JVMCompiler \\
  -no-jdk \\
  -classpath "$compiler_target_cp" \\
  -d "$out_dir"
${runtimeClasspath}
timeout -k "\${kill_after}s" -s INT "\${run_timeout}s" node runner.js
`;
}

function scalaFixture(runtimeClasspath = 'runtime_cp="$out_dir:$library_jar"') {
  return `#!/usr/bin/env bash
modern_overlay_jar="$repo_root/build/modern-bootstrap-overlay/modern-bootstrap.jar"
modern_boot_jar="$repo_root/vendor/java_home/lib/doppio.jar"
runtime_boot_jar="$repo_root/vendor/java_home/lib/rt.jar"
compiler_boot_cp="$modern_overlay_jar:$modern_boot_jar:$runtime_boot_jar"
compile_timeout="\${FIXTURE_COMPILE_TIMEOUT_SECONDS:-60}"
run_timeout="\${FIXTURE_RUN_TIMEOUT_SECONDS:-60}"
kill_after="\${FIXTURE_KILL_AFTER_SECONDS:-30}"
timeout -k "\${kill_after}s" -s INT "\${compile_timeout}s" \\
scala.tools.nsc.Main \\
  -javabootclasspath "$compiler_boot_cp" \\
  -classpath "$source_cp"
${runtimeClasspath}
timeout -k "\${kill_after}s" -s INT "\${run_timeout}s" node runner.js
`;
}

function writeConsumers(ciDir) {
  fs.mkdirSync(ciDir, { recursive: true });
  for (const [scriptName, targetSuffix] of kotlinConsumers) {
    fs.writeFileSync(path.join(ciDir, scriptName), kotlinFixture(targetSuffix));
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
  if (!completeResult.stdout.includes('validated 50 Kotlin and 23 Scala smokes')) {
    throw new Error(`expected expanded compiler bootstrap inventory:\n${completeResult.stdout}`);
  }

  fs.writeFileSync(
    path.join(ciDir, 'kotlin_diagnostic_smoke.sh'),
    kotlinFixture()
      .replace('run_timeout="${FIXTURE_RUN_TIMEOUT_SECONDS:-60}"\n', '')
      .replace('timeout -k "${kill_after}s" -s INT "${run_timeout}s" node runner.js\n', '')
  );
  fs.writeFileSync(
    path.join(ciDir, 'scala_diagnostic_smoke.sh'),
    scalaFixture()
      .replace('run_timeout="${FIXTURE_RUN_TIMEOUT_SECONDS:-60}"\n', '')
      .replace('timeout -k "${kill_after}s" -s INT "${run_timeout}s" node runner.js\n', '')
  );
  const compileOnlyResult = runChecker(ciDir);
  if (compileOnlyResult.status !== 0) {
    throw new Error(`expected diagnostic compile-only consumers to pass:\n${compileOnlyResult.stdout}\n${compileOnlyResult.stderr}`);
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
  fs.writeFileSync(
    path.join(ciDir, 'kotlin_record_smoke.sh'),
    kotlinFixture('$stdlib_jar')
  );
  expectFailure(runChecker(ciDir), 'ordered Kotlin compiler target classpath', 'missing Kotlin record support path');

  writeConsumers(ciDir);
  fs.writeFileSync(
    path.join(ciDir, 'kotlin_reflect_smoke.sh'),
    kotlinFixture('$stdlib_jar')
  );
  expectFailure(runChecker(ciDir), 'ordered Kotlin compiler target classpath', 'missing Kotlin reflect path');

  writeConsumers(ciDir);
  fs.writeFileSync(path.join(ciDir, 'kotlin_duration_smoke.sh'), kotlinFixture().replace('  -no-jdk \\\n', ''));
  expectFailure(runChecker(ciDir), 'disable host JDK target metadata', 'missing Kotlin -no-jdk');

  writeConsumers(ciDir);
  fs.writeFileSync(
    path.join(ciDir, 'kotlin_duration_smoke.sh'),
    kotlinFixture().replace(
      'timeout -k "${kill_after}s" -s INT "${compile_timeout}s" \\\n',
      ''
    )
  );
  expectFailure(runChecker(ciDir), 'missing compile timeout enforcement', 'missing compile timeout');

  writeConsumers(ciDir);
  fs.writeFileSync(
    path.join(ciDir, 'kotlin_duration_smoke.sh'),
    kotlinFixture().replace(
      'timeout -k "${kill_after}s" -s INT "${compile_timeout}s"',
      'timeout -s INT "${compile_timeout}s"'
    )
  );
  expectFailure(runChecker(ciDir), 'force-kill the compile timeout', 'missing forced kill compile timeout');

  writeConsumers(ciDir);
  fs.writeFileSync(
    path.join(ciDir, 'kotlin_duration_smoke.sh'),
    kotlinFixture().replace(
      'timeout -k "${kill_after}s" -s INT "${run_timeout}s" node runner.js\n',
      ''
    )
  );
  expectFailure(runChecker(ciDir), 'missing run timeout enforcement', 'missing runtime timeout');

  writeConsumers(ciDir);
  fs.writeFileSync(
    path.join(ciDir, 'kotlin_duration_smoke.sh'),
    kotlinFixture().replace(
      'timeout -k "${kill_after}s" -s INT "${run_timeout}s"',
      'timeout -s INT "${run_timeout}s"'
    )
  );
  expectFailure(runChecker(ciDir), 'force-kill the run timeout', 'missing forced kill runtime timeout');

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
  expectFailure(runChecker(ciDir), 'must not add compiler bootstrap classes', 'runtime overlay contamination');

  writeConsumers(ciDir);
  fs.writeFileSync(
    path.join(ciDir, 'scala_modern_interop_smoke.sh'),
    scalaFixture('runtime_cp="$out_dir:${compiler_boot_cp}:$library_jar"')
  );
  expectFailure(runChecker(ciDir), 'must not add compiler bootstrap classes', 'runtime aggregate contamination');

  writeConsumers(ciDir);
  fs.writeFileSync(
    path.join(ciDir, 'kotlin_modern_java_interop_smoke.sh'),
    kotlinFixture().replace(
      'timeout -k "${kill_after}s" -s INT "${run_timeout}s" node runner.js',
      'timeout -k "${kill_after}s" -s INT "${run_timeout}s" node runner.js -cp "$compiler_target_cp"'
    )
  );
  expectFailure(runChecker(ciDir), 'runtime command must not reference', 'runtime command contamination');

  writeConsumers(ciDir);
  fs.rmSync(path.join(ciDir, 'kotlin_modern_java_interop_smoke.sh'));
  expectFailure(runChecker(ciDir), 'Missing compiler bootstrap consumer', 'missing consumer script');

  writeConsumers(ciDir);
  fs.writeFileSync(path.join(ciDir, 'scala_untracked_smoke.sh'), scalaFixture());
  expectFailure(runChecker(ciDir), 'inventory is missing Scala smoke scripts', 'untracked Scala consumer');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('Compiler bootstrap consumer checker tests passed.');
