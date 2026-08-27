import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const ciDir = process.env.COMPILER_BOOTSTRAP_CONSUMER_CI_DIR || path.join(repoRoot, 'ci');

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
const compileOnlyConsumers = new Set([
  'kotlin_diagnostic_smoke.sh',
  'scala_diagnostic_smoke.sh',
]);
const forbiddenRuntimeClasspathPattern =
  /\$(?:\{(?:modern_overlay_jar|modern_boot_jar|runtime_boot_jar|compiler_boot_cp|compiler_target_cp)\}|(?:modern_overlay_jar|modern_boot_jar|runtime_boot_jar|compiler_boot_cp|compiler_target_cp)\b)/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readConsumer(scriptName) {
  const scriptPath = path.join(ciDir, scriptName);
  if (!fs.existsSync(scriptPath)) {
    fail(`Missing compiler bootstrap consumer: ci/${scriptName}`);
  }
  return fs.readFileSync(scriptPath, 'utf8');
}

function checkTimeoutPolicy(scriptName, content) {
  if (!/^kill_after="\$\{[A-Z0-9_]+_KILL_AFTER_SECONDS:-30\}"$/m.test(content)) {
    fail(`ci/${scriptName} is missing the 30-second forced-kill timeout assignment.`);
  }

  const lines = content.split(/\r?\n/);
  const requiredPhases = ['compile'];
  if (!compileOnlyConsumers.has(scriptName)) {
    requiredPhases.push('run');
  }
  for (const phase of requiredPhases) {
    const timeoutToken = '${' + phase + '_timeout}s';
    const timeoutLines = lines.filter(
      (line) => /\btimeout\b/.test(line) && line.includes(timeoutToken)
    );
    if (timeoutLines.length === 0) {
      fail(`ci/${scriptName} is missing ${phase} timeout enforcement.`);
    }
    for (const line of timeoutLines) {
      if (!line.includes('timeout -k "${kill_after}s" -s INT')) {
        fail(`ci/${scriptName} must force-kill the ${phase} timeout after the grace period.`);
      }
    }
  }
}

function checkCommon(scriptName, content) {
  const requiredAssignments = [
    'modern_overlay_jar="$repo_root/build/modern-bootstrap-overlay/modern-bootstrap.jar"',
    'modern_boot_jar="$repo_root/vendor/java_home/lib/doppio.jar"',
    'runtime_boot_jar="$repo_root/vendor/java_home/lib/rt.jar"',
  ];
  for (const assignment of requiredAssignments) {
    if (!content.includes(assignment)) {
      fail(`ci/${scriptName} is missing compiler bootstrap assignment: ${assignment}`);
    }
  }

  if (content.includes('classes/modern_classlib/out')) {
    fail(`ci/${scriptName} must not reference producer-only loose build output.`);
  }

  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (/^\s*runtime_cp=/.test(line) && forbiddenRuntimeClasspathPattern.test(line)) {
      fail(`ci/${scriptName} must not add compiler bootstrap classes to the runtime classpath.`);
    }
    if (/\btimeout\b/.test(line) && line.includes('${run_timeout}s') && forbiddenRuntimeClasspathPattern.test(line)) {
      fail(`ci/${scriptName} runtime command must not reference the compiler bootstrap classpath.`);
    }
  }

  checkTimeoutPolicy(scriptName, content);
}

function checkCompleteInventory(language, expectedNames) {
  const prefix = `${language.toLowerCase()}_`;
  const expected = new Set(expectedNames);
  const unexpected = fs.readdirSync(ciDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('_smoke.sh'))
    .filter((name) => !expected.has(name));
  if (unexpected.length !== 0) {
    fail(
      `Compiler bootstrap consumer inventory is missing ${language} smoke scripts: ` +
      unexpected.sort().map((name) => `ci/${name}`).join(', ')
    );
  }
}

for (const [scriptName, targetSuffix] of kotlinConsumers) {
  const content = readConsumer(scriptName);
  checkCommon(scriptName, content);
  const expectedTargetClasspath =
    `compiler_target_cp="$modern_overlay_jar:$modern_boot_jar:$runtime_boot_jar:${targetSuffix}"`;
  if (!content.includes(expectedTargetClasspath)) {
    fail(`ci/${scriptName} must keep the ordered Kotlin compiler target classpath.`);
  }
  if (!/^[ \t]*-no-jdk[ \t]*\\?[ \t]*$/m.test(content)) {
    fail(`ci/${scriptName} must disable host JDK target metadata with -no-jdk.`);
  }
  if (!/^[ \t]*-classpath[ \t]+"\$compiler_target_cp"[ \t]*\\?[ \t]*$/m.test(content)) {
    fail(`ci/${scriptName} must pass the Doppio compiler target classpath to Kotlin.`);
  }
}

for (const scriptName of scalaConsumers) {
  const content = readConsumer(scriptName);
  checkCommon(scriptName, content);
  if (!content.includes('compiler_boot_cp="$modern_overlay_jar:$modern_boot_jar:$runtime_boot_jar"')) {
    fail(`ci/${scriptName} must keep the ordered Scala compiler boot classpath.`);
  }
  if (!/^[ \t]*-javabootclasspath[ \t]+"\$compiler_boot_cp"[ \t]*\\?[ \t]*$/m.test(content)) {
    fail(`ci/${scriptName} must pass the Doppio compiler boot classpath to Scala.`);
  }
}

checkCompleteInventory('Kotlin', kotlinConsumers.keys());
checkCompleteInventory('Scala', scalaConsumers);

console.log(
  `Compiler bootstrap consumer checker validated ${kotlinConsumers.size} Kotlin and ${scalaConsumers.length} Scala smokes.`
);
