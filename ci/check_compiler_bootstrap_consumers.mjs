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
];

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

  for (const line of content.split(/\r?\n/)) {
    if (/^\s*runtime_cp=/.test(line) && line.includes('$modern_overlay_jar')) {
      fail(`ci/${scriptName} must not add modern-bootstrap.jar to the runtime classpath.`);
    }
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

console.log(
  `Compiler bootstrap consumer checker validated ${kotlinConsumers.size} Kotlin and ${scalaConsumers.length} Scala smokes.`
);
