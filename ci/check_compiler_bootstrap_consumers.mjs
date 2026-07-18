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
  ['kotlin_methodhandle_smoke.sh', '$stdlib_jar'],
  ['kotlin_record_smoke.sh', '$stdlib_jar:$support_dir'],
]);
const scalaConsumers = [
  'scala_smoke.sh',
  'scala_modern_interop_smoke.sh',
  'scala_duration_smoke.sh',
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
