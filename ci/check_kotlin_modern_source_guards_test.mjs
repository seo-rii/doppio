import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const checkerPath = path.join(path.dirname(__filename), 'check_kotlin_modern_source_guards.mjs');

function writeSource(root, relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function runChecker(root) {
  return spawnSync(process.execPath, [checkerPath], {
    encoding: 'utf8',
    env: {
      ...process.env,
      KOTLIN_MODERN_SOURCE_GUARD_ROOT: root,
    },
  });
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-kotlin-source-guard-'));
try {
  writeSource(root, 'classes/kotlin_safe_smoke/SafeSmoke.kt', `
fun summary(): String {
  val optional = java.util.Optional.of("ok")
  return optional.orElseThrow() + ":" + optional.isEmpty
}
`);
  const completeResult = runChecker(root);
  if (completeResult.status !== 0) {
    throw new Error(`expected safe fixture to pass:\n${completeResult.stdout}\n${completeResult.stderr}`);
  }

  writeSource(root, 'classes/kotlin_modern_java_interop_smoke/ModernJavaInteropSmoke.kt', `
fun modernJavaInteropSummary(): Int = Runtime.version().feature()
`);
  const runtimeFeatureResult = runChecker(root);
  if (runtimeFeatureResult.status !== 0) {
    throw new Error(`expected guarded Runtime.version fixture to pass:\n${runtimeFeatureResult.stdout}\n${runtimeFeatureResult.stderr}`);
  }

  writeSource(root, 'classes/kotlin_modern_java_interop_smoke/ModernJavaInteropSmoke.kt', `
fun modernJavaInteropSummary(): String = Runtime.version().toString()
`);
  const incompleteRuntimeFeatureResult = runChecker(root);
  if (
    incompleteRuntimeFeatureResult.status === 0 ||
    !incompleteRuntimeFeatureResult.stderr.includes('Runtime.version().feature() fixture requirement')
  ) {
    throw new Error(
      `expected incomplete Runtime.version fixture to fail:\n${incompleteRuntimeFeatureResult.stdout}\n${incompleteRuntimeFeatureResult.stderr}`,
    );
  }

  fs.rmSync(path.join(root, 'classes', 'kotlin_modern_java_interop_smoke'), { recursive: true, force: true });
  writeSource(root, 'classes/kotlin_bad_runtime_smoke/BadRuntimeSmoke.kt', `
fun bad(): Int = Runtime.version().feature()
`);
  const misplacedRuntimeFeatureResult = runChecker(root);
  if (
    misplacedRuntimeFeatureResult.status === 0 ||
    !misplacedRuntimeFeatureResult.stderr.includes('Runtime.version direct call')
  ) {
    throw new Error(
      `expected misplaced Runtime.version fixture to fail:\n${misplacedRuntimeFeatureResult.stdout}\n${misplacedRuntimeFeatureResult.stderr}`,
    );
  }

  writeSource(root, 'classes/kotlin_bad_runtime_smoke/BadRuntimeSmoke.kt', `
fun bad(): Int = Runtime
  .version()
  .feature()
`);
  const multilineRuntimeFeatureResult = runChecker(root);
  if (
    multilineRuntimeFeatureResult.status === 0 ||
    !multilineRuntimeFeatureResult.stderr.includes('Runtime.version direct call')
  ) {
    throw new Error(
      `expected multiline Runtime.version fixture to fail:\n${multilineRuntimeFeatureResult.stdout}\n${multilineRuntimeFeatureResult.stderr}`,
    );
  }

  fs.rmSync(path.join(root, 'classes', 'kotlin_bad_runtime_smoke'), { recursive: true, force: true });
  writeSource(root, 'classes/kotlin_bad_optional_smoke/BadOptionalSmoke.kt', `
fun bad(optionalValue: java.util.Optional<String>): Long {
  optionalValue.ifPresentOrElse({ }, { })
  return optionalValue.stream().count()
}
`);
  const optionalResult = runChecker(root);
  if (
    optionalResult.status === 0 ||
    !optionalResult.stderr.includes('Optional.ifPresentOrElse') ||
    !optionalResult.stderr.includes('Optional.stream')
  ) {
    throw new Error(`expected Optional fixture to fail:\n${optionalResult.stdout}\n${optionalResult.stderr}`);
  }

  fs.rmSync(path.join(root, 'classes', 'kotlin_bad_optional_smoke'), { recursive: true, force: true });
  writeSource(root, 'classes/kotlin_bad_objects_smoke/BadObjectsSmoke.kt', `
import java.util.Objects

fun bad(): Int {
  return Objects.checkFromIndexSize(0, 1, 2)
}
`);
  const objectsResult = runChecker(root);
  if (objectsResult.status === 0 || !objectsResult.stderr.includes('Objects modern helper')) {
    throw new Error(`expected Objects fixture to fail:\n${objectsResult.stdout}\n${objectsResult.stderr}`);
  }

  fs.rmSync(path.join(root, 'classes', 'kotlin_bad_objects_smoke'), { recursive: true, force: true });
  writeSource(root, 'classes/kotlin_bad_copy_smoke/BadCopySmoke.kt', `
import java.nio.file.StandardCopyOption.COPY_ATTRIBUTES

fun bad(): Any = COPY_ATTRIBUTES
`);
  const copyResult = runChecker(root);
  if (copyResult.status === 0 || !copyResult.stderr.includes('COPY_ATTRIBUTES')) {
    throw new Error(`expected COPY_ATTRIBUTES fixture to fail:\n${copyResult.stdout}\n${copyResult.stderr}`);
  }
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('Kotlin modern source guard tests passed.');
