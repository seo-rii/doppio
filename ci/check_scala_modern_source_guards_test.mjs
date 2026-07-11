import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const checkerPath = path.join(path.dirname(__filename), 'check_scala_modern_source_guards.mjs');

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
      SCALA_MODERN_SOURCE_GUARD_ROOT: root,
    },
  });
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-scala-source-guard-'));
try {
  writeSource(root, 'classes/scala_safe_smoke/SafeSmoke.scala', `
object SafeSmoke {
  def summary(): String = java.util.Optional.of("ok").orElseThrow()
}
`);
  const completeResult = runChecker(root);
  if (completeResult.status !== 0) {
    throw new Error(`expected safe fixture to pass:\n${completeResult.stdout}\n${completeResult.stderr}`);
  }

  writeSource(root, 'classes/scala_bad_runtime_smoke/BadRuntimeSmoke.scala', `
object BadRuntimeSmoke {
  def summary(): String = Runtime.Version.parse("17").toString
}
`);
  const runtimeResult = runChecker(root);
  if (runtimeResult.status === 0 || !runtimeResult.stderr.includes('Runtime.Version.parse')) {
    throw new Error(`expected Runtime.Version fixture to fail:\n${runtimeResult.stdout}\n${runtimeResult.stderr}`);
  }

  fs.rmSync(path.join(root, 'classes', 'scala_bad_runtime_smoke'), { recursive: true, force: true });
  writeSource(root, 'classes/scala_bad_duration_smoke/BadDurationSmoke.scala', `
import scala.jdk.DurationConverters._

object BadDurationSmoke {
  def summary(): Long = scala.concurrent.duration.DurationInt(1).second.toJava.toMillis
}
`);
  const durationResult = runChecker(root);
  if (durationResult.status === 0 || !durationResult.stderr.includes('DurationConverters')) {
    throw new Error(`expected DurationConverters fixture to fail:\n${durationResult.stdout}\n${durationResult.stderr}`);
  }

  fs.rmSync(path.join(root, 'classes', 'scala_bad_duration_smoke'), { recursive: true, force: true });
  writeSource(root, 'classes/scala_bad_copy_smoke/BadCopySmoke.scala', `
import java.nio.file.StandardCopyOption.COPY_ATTRIBUTES

object BadCopySmoke {
  def summary(): Any = COPY_ATTRIBUTES
}
`);
  const copyResult = runChecker(root);
  if (copyResult.status === 0 || !copyResult.stderr.includes('COPY_ATTRIBUTES')) {
    throw new Error(`expected COPY_ATTRIBUTES fixture to fail:\n${copyResult.stdout}\n${copyResult.stderr}`);
  }
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('Scala modern source guard tests passed.');
