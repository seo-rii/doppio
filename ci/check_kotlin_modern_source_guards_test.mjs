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
