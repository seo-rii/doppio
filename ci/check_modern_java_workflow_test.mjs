import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const checkerPath = path.join(repoRoot, 'ci', 'check_modern_java_workflow.mjs');
const artifactToolPath = path.join(repoRoot, 'ci', 'modern_java_runtime_artifact.mjs');
const runtimeSelfTestPath = path.join(repoRoot, 'ci', 'modern_java_runtime_self_test.mjs');
const shardRunnerPath = path.join(repoRoot, 'ci', 'run_modern_java_smoke_shard.mjs');
const compilerInputToolPath = path.join(repoRoot, 'ci', 'prepare_modern_java_compiler_inputs.mjs');
const realWorkflow = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'modern-java.yml'), 'utf8');
const realCompilerLock = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'ci', 'modern_java_compiler_inputs.lock.json'), 'utf8')
);

function smokeScript(language, suffix, compileSeconds = 300) {
  const prefix = `${language}_${suffix}`.toUpperCase();
  return `#!/usr/bin/env bash
set -euo pipefail
compile_timeout="\${${prefix}_COMPILE_TIMEOUT_SECONDS:-${compileSeconds}}"
run_timeout="\${${prefix}_RUN_TIMEOUT_SECONDS:-60}"
kill_after="\${${prefix}_KILL_AFTER_SECONDS:-30}"
timeout -k "\${kill_after}s" -s INT "\${compile_timeout}s" true
timeout -k "\${kill_after}s" -s INT "\${run_timeout}s" true
`;
}

function baseManifest() {
  return {
    schemaVersion: 1,
    shards: Array.from({ length: 8 }, (_, index) => {
      const number = String(index + 1).padStart(2, '0');
      return {
        id: `compiler-${number}`,
        scripts: [
          `ci/kotlin_a${number}_smoke.sh`,
          `ci/kotlin_b${number}_smoke.sh`,
          `ci/scala_a${number}_smoke.sh`,
          `ci/scala_b${number}_smoke.sh`,
        ],
      };
    }),
  };
}

function writeCheckerFixture(options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-modern-workflow-'));
  const ciDir = path.join(root, 'ci');
  fs.mkdirSync(ciDir, { recursive: true });
  for (let index = 1; index <= 8; index += 1) {
    const number = String(index).padStart(2, '0');
    for (const language of ['kotlin', 'scala']) {
      for (const letter of ['a', 'b']) {
        const name = `${language}_${letter}${number}_smoke.sh`;
        const override = options.scriptOverrides?.[name];
        fs.writeFileSync(
          path.join(ciDir, name),
          override || smokeScript(language, `${letter}${number}`)
        );
      }
    }
  }
  for (const [name, contents] of Object.entries(options.extraScripts || {})) {
    fs.writeFileSync(path.join(ciDir, name), contents);
  }

  const workflowPath = path.join(root, 'modern-java.yml');
  const manifestPath = path.join(root, 'modern_java_smoke_shards.json');
  const compilerLockPath = path.join(root, 'modern_java_compiler_inputs.lock.json');
  fs.writeFileSync(workflowPath, options.workflow || realWorkflow);
  fs.writeFileSync(manifestPath, `${JSON.stringify(options.manifest || baseManifest(), null, 2)}\n`);
  fs.writeFileSync(
    compilerLockPath,
    `${JSON.stringify(options.compilerLock || realCompilerLock, null, 2)}\n`
  );
  return { root, ciDir, workflowPath, manifestPath, compilerLockPath };
}

function runChecker(options = {}) {
  const fixture = writeCheckerFixture(options);
  const result = spawnSync(process.execPath, [checkerPath], {
    encoding: 'utf8',
    env: {
      ...process.env,
      MODERN_JAVA_WORKFLOW_CI_DIR: fixture.ciDir,
      MODERN_JAVA_WORKFLOW_PATH: fixture.workflowPath,
      MODERN_JAVA_WORKFLOW_MANIFEST_PATH: fixture.manifestPath,
      MODERN_JAVA_WORKFLOW_COMPILER_LOCK_PATH: fixture.compilerLockPath,
    },
  });
  fs.rmSync(fixture.root, { recursive: true, force: true });
  return result;
}

function expectCheckerFailure(label, options, expectedMessage) {
  const result = runChecker(options);
  if (result.status === 0 || !result.stderr.includes(expectedMessage)) {
    throw new Error(
      `${label} should fail with ${JSON.stringify(expectedMessage)}:\n${result.stdout}\n${result.stderr}`
    );
  }
}

function replaceRequired(text, before, after) {
  if (!text.includes(before)) {
    throw new Error(`Test fixture token not found: ${before}`);
  }
  return text.replace(before, after);
}

function swapAdjacentSteps(workflow, firstName, secondName) {
  const firstStart = workflow.indexOf(`      - name: ${firstName}\n`);
  const secondStart = workflow.indexOf(`      - name: ${secondName}\n`, firstStart + 1);
  if (firstStart < 0 || secondStart < 0) {
    throw new Error(`Unable to find steps to swap: ${firstName}, ${secondName}`);
  }
  const nextStart = workflow.indexOf('\n      - name:', secondStart + 1);
  const secondEnd = nextStart < 0 ? workflow.length : nextStart + 1;
  const firstBlock = workflow.slice(firstStart, secondStart);
  const secondBlock = workflow.slice(secondStart, secondEnd);
  return workflow.slice(0, firstStart) + secondBlock + firstBlock + workflow.slice(secondEnd);
}

const completeResult = runChecker();
if (completeResult.status !== 0) {
  throw new Error(`Complete sharded workflow should pass:\n${completeResult.stderr}`);
}

expectCheckerFailure(
  'workflow write permission',
  { workflow: replaceRequired(realWorkflow, 'permissions:\n  contents: read', 'permissions:\n  contents: write') },
  'permissions must be exactly contents: read'
);

expectCheckerFailure(
  'old checkout action',
  { workflow: replaceRequired(realWorkflow, 'actions/checkout@v7', 'actions/checkout@v6') },
  'runtime job must use checkout@v7'
);

expectCheckerFailure(
  'inline-comment-only checkout action',
  {
    workflow: replaceRequired(
      realWorkflow,
      'uses: actions/checkout@v7',
      'uses: actions/checkout@v6 # uses: actions/checkout@v7'
    ),
  },
  'runtime job must use checkout@v7'
);

expectCheckerFailure(
  'short runtime timeout',
  { workflow: replaceRequired(realWorkflow, '  runtime:\n', '  runtime:\n').replace('    timeout-minutes: 150', '    timeout-minutes: 90') },
  'runtime job timeout must be between 120 and 180 minutes'
);

expectCheckerFailure(
  'insufficient compiler setup headroom',
  { workflow: replaceRequired(realWorkflow, '    timeout-minutes: 180', '    timeout-minutes: 150') },
  'must be 180 minutes and leave at least 45 minutes beyond the maximum declared outer shard budget'
);

expectCheckerFailure(
  'missing legacy oracle task',
  { workflow: replaceRequired(realWorkflow, 'run_java:default', 'run_java_removed:default') },
  'legacy gate must run run_java:default'
);

expectCheckerFailure(
  'comment-only legacy oracle task',
  {
    workflow: replaceRequired(
      realWorkflow,
      '          check_jdk find_native_java run_java:default lineending:default',
      '          check_jdk find_native_java run_java_removed:default lineending:default\n' +
        '          # run_java:default'
    ),
  },
  'legacy gate must run run_java:default'
);

expectCheckerFailure(
  'inline-comment-only legacy oracle task',
  {
    workflow: replaceRequired(
      realWorkflow,
      '          check_jdk find_native_java run_java:default lineending:default',
      '          check_jdk find_native_java true # run_java:default lineending:default'
    ),
  },
  'legacy gate must run run_java:default'
);

expectCheckerFailure(
  'externally cached legacy oracle',
  { workflow: replaceRequired(realWorkflow, 'run_java:default', 'newer:run_java:default') },
  'fingerprint cache directly'
);

expectCheckerFailure(
  'old upload action',
  { workflow: replaceRequired(realWorkflow, 'actions/upload-artifact@v7', 'actions/upload-artifact@v6') },
  'upload one raw deterministic runtime tar with upload-artifact@v7'
);

expectCheckerFailure(
  'comment-only upload action',
  {
    workflow: replaceRequired(
      realWorkflow,
      '        uses: actions/upload-artifact@v7',
      '        uses: actions/upload-artifact@v6\n        # uses: actions/upload-artifact@v7'
    ),
  },
  'upload one raw deterministic runtime tar with upload-artifact@v7'
);

expectCheckerFailure(
  'inline-comment-only upload action',
  {
    workflow: replaceRequired(
      realWorkflow,
      '        uses: actions/upload-artifact@v7',
      '        uses: actions/upload-artifact@v6 # uses: actions/upload-artifact@v7'
    ),
  },
  'upload one raw deterministic runtime tar with upload-artifact@v7'
);

expectCheckerFailure(
  'ignored raw upload name',
  {
    workflow: replaceRequired(
      realWorkflow,
      '        with:\n          path: ${{ steps.bundle_runtime.outputs.archive_path }}',
      '        with:\n          name: ignored-runtime-name\n          path: ${{ steps.bundle_runtime.outputs.archive_path }}'
    ),
  },
  'upload-artifact@v7 ignores name'
);

expectCheckerFailure(
  'old raw download action',
  { workflow: replaceRequired(realWorkflow, 'actions/download-artifact@v8', 'actions/download-artifact@v7') },
  'download the raw runtime artifact with download-artifact@v8'
);

expectCheckerFailure(
  'comment-only raw download action',
  {
    workflow: replaceRequired(
      realWorkflow,
      '        uses: actions/download-artifact@v8',
      '        uses: actions/download-artifact@v7\n        # uses: actions/download-artifact@v8'
    ),
  },
  'download the raw runtime artifact with download-artifact@v8'
);

expectCheckerFailure(
  'inline-comment-only raw download action',
  {
    workflow: replaceRequired(
      realWorkflow,
      '        uses: actions/download-artifact@v8',
      '        uses: actions/download-artifact@v7 # uses: actions/download-artifact@v8'
    ),
  },
  'download the raw runtime artifact with download-artifact@v8'
);

expectCheckerFailure(
  'fail-fast compiler matrix',
  { workflow: replaceRequired(realWorkflow, 'fail-fast: false', 'fail-fast: true') },
  'compiler matrix must set fail-fast: false'
);

expectCheckerFailure(
  'matrix manifest drift',
  { workflow: replaceRequired(realWorkflow, ', compiler-08]', ']') },
  'compiler matrix must exactly match the checked-in shard manifest order'
);

expectCheckerFailure(
  'missing explicit artifact digest verification',
  {
    workflow: replaceRequired(
      realWorkflow,
      '--sha256 "${{ needs.runtime.outputs.runtime-archive-sha256 }}"',
      '--transport-digest "${{ needs.runtime.outputs.runtime-archive-sha256 }}"'
    ),
  },
  'artifact integrity gate is missing --sha256'
);

expectCheckerFailure(
  'comment-only artifact verifier',
  {
    workflow: replaceRequired(
      realWorkflow,
      '          node ci/modern_java_runtime_artifact.mjs verify\n',
      '          node ci/unverified_runtime_artifact.mjs install\n' +
        '          # node ci/modern_java_runtime_artifact.mjs verify\n'
    ),
  },
  'compiler artifact integrity gate is missing node ci/modern_java_runtime_artifact.mjs verify'
);

expectCheckerFailure(
  'inline-comment-only artifact verifier',
  {
    workflow: replaceRequired(
      realWorkflow,
      '          node ci/modern_java_runtime_artifact.mjs verify\n',
      '          true # node ci/modern_java_runtime_artifact.mjs verify\n'
    ),
  },
  'compiler artifact integrity gate is missing node ci/modern_java_runtime_artifact.mjs verify'
);

expectCheckerFailure(
  'runtime publication ordering',
  {
    workflow: swapAdjacentSteps(
      realWorkflow,
      'Verify compiler bootstrap overlay',
      'Bundle deterministic compiler runtime inputs'
    ),
  },
  'runtime gates and artifact publication must remain in dependency order'
);

expectCheckerFailure(
  'compiler verification ordering',
  {
    workflow: swapAdjacentSteps(
      realWorkflow,
      'Self-test transferred compiler runtime inputs',
      'Run compiler smoke shard'
    ),
  },
  'verify the artifact before running sequential shard scripts'
);

expectCheckerFailure(
  'missing run-attempt artifact identity',
  { workflow: replaceRequired(realWorkflow, '--run-attempt "$GITHUB_RUN_ATTEMPT"', '--run-attempt "1"') },
  'runtime artifact bundle step is missing --run-attempt'
);

expectCheckerFailure(
  'compiler uses consumer rerun attempt',
  {
    workflow: replaceRequired(
      realWorkflow,
      '--run-attempt "${{ needs.runtime.outputs.runtime-run-attempt }}"',
      '--run-attempt "$GITHUB_RUN_ATTEMPT"'
    ),
  },
  'compiler artifact integrity gate is missing --run-attempt'
);

expectCheckerFailure(
  'missing source snapshot verification',
  {
    workflow: replaceRequired(
      realWorkflow,
      'node ci/modern_java_runtime_artifact.mjs verify-source',
      'node ci/modern_java_runtime_artifact.mjs verify-label-only'
    ),
  },
  'source snapshot integrity gate is missing'
);

expectCheckerFailure(
  'short runtime artifact retention',
  { workflow: replaceRequired(realWorkflow, 'retention-days: 7', 'retention-days: 1') },
  'upload one raw deterministic runtime tar'
);

expectCheckerFailure(
  'missing compiler input preparation',
  {
    workflow: replaceRequired(
      realWorkflow,
      'node ci/prepare_modern_java_compiler_inputs.mjs',
      'node ci/prepare_unverified_compiler_inputs.mjs'
    ),
  },
  'verified compiler input preparation is missing'
);

expectCheckerFailure(
  'compiler cache is not keyed by lock',
  {
    workflow: replaceRequired(
      realWorkflow,
      "key: kotlin-compiler-${{ runner.os }}-${{ hashFiles('ci/modern_java_compiler_inputs.lock.json') }}",
      'key: kotlin-compiler-${{ runner.os }}-stale'
    ),
  },
  'must cache the Kotlin compiler'
);

expectCheckerFailure(
  'missing terminal always gate',
  { workflow: replaceRequired(realWorkflow, '    if: always()\n    needs: [runtime, compiler]', '    if: success()\n    needs: [runtime, compiler]') },
  'terminal test job must run with if: always()'
);

expectCheckerFailure(
  'terminal gate ignores compiler result',
  { workflow: replaceRequired(realWorkflow, 'test "$COMPILER_RESULT" = success', 'test "$COMPILER_RESULT" != cancelled') },
  'fail unless both dependency results are success'
);

expectCheckerFailure(
  'comment-only terminal success checks',
  {
    workflow: replaceRequired(
      realWorkflow,
      '          test "$RUNTIME_RESULT" = success\n          test "$COMPILER_RESULT" = success',
      '          true\n' +
        '          # test "$RUNTIME_RESULT" = success\n' +
        '          # test "$COMPILER_RESULT" = success'
    ),
  },
  'fail unless both dependency results are success'
);

expectCheckerFailure(
  'inline-comment-only terminal success check',
  {
    workflow: replaceRequired(
      realWorkflow,
      '          test "$COMPILER_RESULT" = success',
      '          true # test "$COMPILER_RESULT" = success'
    ),
  },
  'fail unless both dependency results are success'
);

{
  const manifest = baseManifest();
  manifest.shards[0].scripts.splice(1, 1);
  expectCheckerFailure('missing smoke', { manifest }, 'shard manifest is missing smoke scripts');
}

{
  const manifest = baseManifest();
  manifest.shards[0].scripts.splice(1, 0, manifest.shards[0].scripts[0]);
  expectCheckerFailure('duplicate smoke', { manifest }, 'shard manifest contains duplicate script');
}

{
  const manifest = baseManifest();
  manifest.shards[0].scripts[0] = 'ci/kotlin_aa01_smoke.sh';
  expectCheckerFailure('unknown smoke', { manifest }, 'references unknown smoke script');
}

expectCheckerFailure(
  'compiler smoke inventory drift',
  {
    extraScripts: {
      'kotlin_inventory_drift_smoke.sh': smokeScript('kotlin', 'inventory_drift'),
    },
  },
  'shard manifest is missing smoke scripts'
);

expectCheckerFailure(
  'hyphenated unsafe smoke inventory name',
  { extraScripts: { 'kotlin-new_smoke.sh': smokeScript('kotlin', 'new') } },
  'inventory contains an unsafe script filename'
);

expectCheckerFailure(
  'whitespace unsafe smoke inventory name',
  { extraScripts: { 'scala new_smoke.sh': smokeScript('scala', 'new') } },
  'inventory contains an unsafe script filename'
);

{
  const manifest = baseManifest();
  manifest.shards[0].scripts[0] = 'ci/../kotlin_a01_smoke.sh';
  expectCheckerFailure('unsafe smoke path', { manifest }, 'contains an unsafe script path');
}

{
  const manifest = baseManifest();
  manifest.shards[0].scripts.reverse();
  expectCheckerFailure('non-deterministic script order', { manifest }, 'deterministic lexical order');
}

expectCheckerFailure(
  'missing compiler forced kill',
  {
    scriptOverrides: {
      'kotlin_a01_smoke.sh': smokeScript('kotlin', 'a01').replace(
        'timeout -k "${kill_after}s" -s INT "${compile_timeout}s" true',
        'node compiler.js'
      ),
    },
  },
  'must preserve timeout -k protection'
);

expectCheckerFailure(
  'unbounded shard budget',
  {
    scriptOverrides: {
      'kotlin_a01_smoke.sh': smokeScript('kotlin', 'a01', 6000),
    },
  },
  'declared timeout budget must not exceed 90 minutes'
);

{
  const compilerLock = structuredClone(realCompilerLock);
  compilerLock.kotlin.sha256 = 'unhashed';
  expectCheckerFailure(
    'unhashed compiler archive',
    { compilerLock },
    'compiler input lock metadata is incomplete or unpinned'
  );
}

{
  const compilerLock = structuredClone(realCompilerLock);
  compilerLock.scala.files.push({
    name: 'scala-unknown-2.13.18.jar',
    url: 'https://repo1.maven.org/maven2/org/scala-lang/scala-unknown/2.13.18/scala-unknown-2.13.18.jar',
    sha256: 'a'.repeat(64),
  });
  expectCheckerFailure(
    'extra Scala compiler input',
    { compilerLock },
    'must contain exactly five JARs'
  );
}

{
  const compilerLock = structuredClone(realCompilerLock);
  compilerLock.scala.files[0].url = 'https://example.invalid/compiler.jar';
  expectCheckerFailure(
    'unapproved compiler URL',
    { compilerLock },
    'unsafe or unhashed file'
  );
}

const compilerInputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-compiler-inputs-'));
try {
  const sourceRoot = path.join(compilerInputRoot, 'source');
  const kotlinPackageRoot = path.join(sourceRoot, 'package', 'lib');
  fs.mkdirSync(kotlinPackageRoot, { recursive: true });
  const kotlinContents = new Map([
    ['kotlin-compiler.jar', 'fixture kotlin compiler\n'],
    ['kotlin-reflect.jar', 'fixture kotlin reflect\n'],
    ['kotlin-stdlib.jar', 'fixture kotlin stdlib\n'],
  ]);
  for (const [name, contents] of kotlinContents) {
    fs.writeFileSync(path.join(kotlinPackageRoot, name), contents);
  }
  const kotlinArchiveSource = path.join(sourceRoot, 'kotlin-compiler-9.9.9.tgz');
  const tarResult = spawnSync(
    'tar',
    ['--create', '--gzip', '--file', kotlinArchiveSource, '--directory', sourceRoot, 'package'],
    { encoding: 'utf8' }
  );
  if (tarResult.error || tarResult.status !== 0) {
    throw new Error(`Unable to create compiler input fixture: ${tarResult.stderr}`);
  }

  const scalaSources = new Map([
    ['java-diff-utils-4.16.jar', 'fixture diff utils\n'],
    ['jline-3.29.0-jdk8.jar', 'fixture jline\n'],
    ['scala-compiler-9.9.9.jar', 'fixture scala compiler\n'],
    ['scala-library-9.9.9.jar', 'fixture scala library\n'],
    ['scala-reflect-9.9.9.jar', 'fixture scala reflect\n'],
  ]);
  for (const [name, contents] of scalaSources) {
    fs.writeFileSync(path.join(sourceRoot, name), contents);
  }

  const fixtureLock = {
    schemaVersion: 1,
    kotlin: {
      version: '9.9.9',
      url: pathToFileURL(kotlinArchiveSource).href,
      archiveName: 'kotlin-compiler-9.9.9.tgz',
      sha256: sha256(fs.readFileSync(kotlinArchiveSource)),
      extractedDirectory: 'kotlin-compiler-9.9.9',
      jars: Object.fromEntries(
        [...kotlinContents.keys()].sort().map((name) => [
          `package/lib/${name}`,
          sha256(fs.readFileSync(path.join(kotlinPackageRoot, name))),
        ])
      ),
    },
    scala: {
      version: '9.9.9',
      files: [...scalaSources.keys()].sort().map((name) => ({
        name,
        url: pathToFileURL(path.join(sourceRoot, name)).href,
        sha256: sha256(fs.readFileSync(path.join(sourceRoot, name))),
      })),
    },
  };
  const lockPath = path.join(compilerInputRoot, 'ci', 'modern_java_compiler_inputs.lock.json');
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  fs.writeFileSync(lockPath, `${JSON.stringify(fixtureLock, null, 2)}\n`);
  const kotlinCache = path.join(compilerInputRoot, 'build', 'kotlin-cache');
  const scalaCache = path.join(compilerInputRoot, 'build', 'scala-cache');
  const markerPath = path.join(compilerInputRoot, 'build', 'marker.json');
  const prepareArguments = [
    '--repo-root', compilerInputRoot,
    '--lock', 'ci/modern_java_compiler_inputs.lock.json',
    '--kotlin-cache', 'build/kotlin-cache',
    '--scala-cache', 'build/scala-cache',
    '--marker', 'build/marker.json',
  ];
  const runPrepare = () => spawnSync(process.execPath, [compilerInputToolPath, ...prepareArguments], {
    encoding: 'utf8',
    env: { ...process.env, MODERN_JAVA_COMPILER_INPUT_ALLOW_FILE_URLS: '1' },
  });
  const firstPrepare = runPrepare();
  if (firstPrepare.status !== 0) {
    throw new Error(`Verified compiler input preparation should pass:\n${firstPrepare.stderr}`);
  }
  fs.writeFileSync(
    path.join(kotlinCache, 'kotlin-compiler-9.9.9', 'package', 'lib', 'kotlin-compiler.jar'),
    'corrupted extracted jar\n'
  );
  fs.writeFileSync(path.join(scalaCache, 'scala-compiler-9.9.9.jar'), 'corrupted scala cache\n');
  const unlockedScalaJar = path.join(scalaCache, 'scala-unlocked-9.9.9.jar');
  fs.writeFileSync(unlockedScalaJar, 'unlocked scala cache input\n');
  fs.writeFileSync(path.join(kotlinCache, 'kotlin-compiler-9.9.9.tgz'), 'corrupted archive\n');
  const restoredPrepare = runPrepare();
  if (restoredPrepare.status !== 0) {
    throw new Error(`Corrupt compiler caches should be restored:\n${restoredPrepare.stderr}`);
  }
  if (
    sha256(fs.readFileSync(path.join(kotlinCache, 'kotlin-compiler-9.9.9.tgz'))) !== fixtureLock.kotlin.sha256 ||
    sha256(fs.readFileSync(path.join(
      kotlinCache,
      'kotlin-compiler-9.9.9',
      'package',
      'lib',
      'kotlin-compiler.jar'
    ))) !== fixtureLock.kotlin.jars['package/lib/kotlin-compiler.jar'] ||
    sha256(fs.readFileSync(path.join(scalaCache, 'scala-compiler-9.9.9.jar'))) !==
      fixtureLock.scala.files.find((file) => file.name === 'scala-compiler-9.9.9.jar').sha256 ||
    !fs.statSync(markerPath).isFile() ||
    !JSON.parse(fs.readFileSync(markerPath, 'utf8')).environmentSha256 ||
    fs.existsSync(unlockedScalaJar) ||
    fs.readdirSync(scalaCache).filter((name) => name.endsWith('.jar')).length !== 5
  ) {
    throw new Error('Compiler input preparation must rehash and restore cache hits from locked sources.');
  }

  const oversizedScalaLock = structuredClone(fixtureLock);
  oversizedScalaLock.scala.files.push({
    name: 'scala-extra-9.9.9.jar',
    url: pathToFileURL(path.join(sourceRoot, 'scala-compiler-9.9.9.jar')).href,
    sha256: sha256(fs.readFileSync(path.join(sourceRoot, 'scala-compiler-9.9.9.jar'))),
  });
  fs.writeFileSync(lockPath, `${JSON.stringify(oversizedScalaLock, null, 2)}\n`);
  const oversizedScalaPrepare = runPrepare();
  if (
    oversizedScalaPrepare.status === 0 ||
    !oversizedScalaPrepare.stderr.includes('Scala compiler lock metadata is invalid')
  ) {
    throw new Error(
      `Compiler input preparation must reject a sixth Scala JAR:\n${oversizedScalaPrepare.stderr}`
    );
  }
  fs.writeFileSync(lockPath, `${JSON.stringify(fixtureLock, null, 2)}\n`);

  const unsafeArchiveEntries = [
    {
      label: 'symbolic link',
      name: 'unsafe-symlink.jar',
      create: (entryPath) => fs.symlinkSync('kotlin-compiler.jar', entryPath),
    },
    {
      label: 'hard link',
      name: 'unsafe-hardlink.jar',
      create: (entryPath) => fs.linkSync(path.join(kotlinPackageRoot, 'kotlin-compiler.jar'), entryPath),
    },
    {
      label: 'special device',
      name: 'unsafe-special.jar',
      create: (entryPath) => {
        const fifoResult = spawnSync('mkfifo', [entryPath], { encoding: 'utf8' });
        if (fifoResult.error || fifoResult.status !== 0) {
          throw new Error(`Unable to create compiler archive FIFO fixture: ${fifoResult.stderr}`);
        }
      },
    },
  ];
  for (const unsafeEntry of unsafeArchiveEntries) {
    const entryPath = path.join(kotlinPackageRoot, unsafeEntry.name);
    const unsafeArchive = path.join(sourceRoot, `${unsafeEntry.name}.tgz`);
    unsafeEntry.create(entryPath);
    const unsafeTarResult = spawnSync(
      'tar',
      ['--create', '--gzip', '--file', unsafeArchive, '--directory', sourceRoot, 'package'],
      { encoding: 'utf8' }
    );
    fs.unlinkSync(entryPath);
    if (unsafeTarResult.error || unsafeTarResult.status !== 0) {
      throw new Error(`Unable to create unsafe compiler archive fixture: ${unsafeTarResult.stderr}`);
    }
    const unsafeLock = structuredClone(fixtureLock);
    unsafeLock.kotlin.url = pathToFileURL(unsafeArchive).href;
    unsafeLock.kotlin.sha256 = sha256(fs.readFileSync(unsafeArchive));
    fs.writeFileSync(lockPath, `${JSON.stringify(unsafeLock, null, 2)}\n`);
    fs.writeFileSync(
      path.join(kotlinCache, 'kotlin-compiler-9.9.9', 'package', 'lib', 'kotlin-compiler.jar'),
      'force archive extraction\n'
    );
    const unsafePrepare = runPrepare();
    if (
      unsafePrepare.status === 0 ||
      !unsafePrepare.stderr.includes('unsupported link or device entry type')
    ) {
      throw new Error(
        `Kotlin archive ${unsafeEntry.label} should be rejected before extraction:\n` +
        unsafePrepare.stderr
      );
    }
  }
} finally {
  fs.rmSync(compilerInputRoot, { recursive: true, force: true });
}

const shardRunnerRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-modern-shard-runner-'));
try {
  const shardRunnerCi = path.join(shardRunnerRoot, 'ci');
  const orderPath = path.join(shardRunnerRoot, 'order.txt');
  fs.mkdirSync(shardRunnerCi, { recursive: true });
  const timedScript = (prefix, body) => `#!/usr/bin/env bash
set -euo pipefail
compile_timeout="\${${prefix}_COMPILE_TIMEOUT_SECONDS:-1}"
run_timeout="\${${prefix}_RUN_TIMEOUT_SECONDS:-1}"
kill_after="\${${prefix}_KILL_AFTER_SECONDS:-1}"
timeout -k "\${kill_after}s" -s INT "\${compile_timeout}s" true
timeout -k "\${kill_after}s" -s INT "\${run_timeout}s" true
${body}
`;
  fs.writeFileSync(
    path.join(shardRunnerCi, 'kotlin_first_smoke.sh'),
    timedScript('KOTLIN_FIRST', 'printf "first\\n" >> "$SHARD_ORDER_FILE"')
  );
  fs.writeFileSync(
    path.join(shardRunnerCi, 'scala_second_smoke.sh'),
    timedScript('SCALA_SECOND', 'printf "second\\n" >> "$SHARD_ORDER_FILE"')
  );
  fs.writeFileSync(
    path.join(shardRunnerCi, 'kotlin_timeout_smoke.sh'),
    timedScript(
      'KOTLIN_TIMEOUT',
      '( trap "" INT TERM; sleep 4; printf "leaked\\n" >> "$SHARD_LEAK_FILE" ) &\nwait'
    )
  );
  fs.writeFileSync(
    path.join(shardRunnerCi, 'kotlin_mutate_smoke.sh'),
    timedScript('KOTLIN_MUTATE', 'printf "mutated\\n" > "$SHARD_EXTRA_KOTLIN_JAR"')
  );
  fs.writeFileSync(
    path.join(shardRunnerCi, 'kotlin_quick_timeout_smoke.sh'),
    timedScript('KOTLIN_QUICK_TIMEOUT', 'sleep 4')
  );
  fs.writeFileSync(
    path.join(shardRunnerCi, 'kotlin_interrupt_smoke.sh'),
    timedScript('KOTLIN_INTERRUPT', 'sleep 10')
  );
  fs.writeFileSync(
    path.join(shardRunnerCi, 'scala_inventory_mutate_smoke.sh'),
    timedScript(
      'SCALA_INVENTORY_MUTATE',
      'printf "unlocked\\n" > "$SHARD_SCALA_CACHE/scala-unlocked.jar"'
    )
  );
  const shardRunnerManifest = path.join(shardRunnerCi, 'manifest.json');
  fs.writeFileSync(
    shardRunnerManifest,
    JSON.stringify({
      schemaVersion: 1,
      shards: [{
        id: 'compiler-01',
        scripts: ['ci/kotlin_first_smoke.sh', 'ci/scala_second_smoke.sh'],
      }, {
        id: 'compiler-02',
        scripts: ['ci/kotlin_timeout_smoke.sh'],
      }, {
        id: 'compiler-03',
        scripts: ['ci/kotlin_mutate_smoke.sh'],
      }, {
        id: 'compiler-04',
        scripts: ['ci/kotlin_quick_timeout_smoke.sh'],
      }, {
        id: 'compiler-05',
        scripts: ['ci/kotlin_interrupt_smoke.sh'],
      }, {
        id: 'compiler-06',
        scripts: ['ci/scala_inventory_mutate_smoke.sh'],
      }],
    })
  );
  const compilerLockPath = path.join(shardRunnerCi, 'compiler-inputs.lock');
  const compilerInputNames = {
    KOTLIN_COMPILER_JAR: ['kotlin', 'kotlin-compiler.jar'],
    KOTLIN_STDLIB_JAR: ['kotlin', 'kotlin-stdlib.jar'],
    KOTLIN_REFLECT_JAR: ['kotlin', 'kotlin-reflect.jar'],
    SCALA_COMPILER_JAR: ['scala', 'scala-compiler-9.9.9.jar'],
    SCALA_LIBRARY_JAR: ['scala', 'scala-library-9.9.9.jar'],
    SCALA_REFLECT_JAR: ['scala', 'scala-reflect-9.9.9.jar'],
    SCALA_DIFF_UTILS_JAR: ['scala', 'java-diff-utils-4.16.jar'],
    SCALA_JLINE_JAR: ['scala', 'jline-3.29.0-jdk8.jar'],
  };
  const compilerEnvironment = {};
  for (const [name, [language, filename]] of Object.entries(compilerInputNames)) {
    const inputPath = path.join(shardRunnerRoot, 'build', 'compiler-inputs', language, filename);
    fs.mkdirSync(path.dirname(inputPath), { recursive: true });
    fs.writeFileSync(inputPath, name);
    compilerEnvironment[name] = inputPath;
  }
  const extraKotlinInput = path.join(
    shardRunnerRoot,
    'build',
    'compiler-inputs',
    'kotlin',
    'kotlin-extra.jar'
  );
  fs.writeFileSync(extraKotlinInput, 'KOTLIN_EXTRA_JAR');
  const compilerLock = {
    kotlin: {
      jars: Object.fromEntries(
        [
          ['package/lib/kotlin-compiler.jar', compilerEnvironment.KOTLIN_COMPILER_JAR],
          ['package/lib/kotlin-extra.jar', extraKotlinInput],
          ['package/lib/kotlin-reflect.jar', compilerEnvironment.KOTLIN_REFLECT_JAR],
          ['package/lib/kotlin-stdlib.jar', compilerEnvironment.KOTLIN_STDLIB_JAR],
        ].map(([name, inputPath]) => [name, sha256(fs.readFileSync(inputPath))])
      ),
    },
    scala: {
      version: '9.9.9',
      files: Object.entries(compilerInputNames)
        .filter(([name]) => name.startsWith('SCALA_'))
        .map(([, [, filename]]) => ({
          name: filename,
          sha256: sha256(fs.readFileSync(path.join(
            shardRunnerRoot,
            'build',
            'compiler-inputs',
            'scala',
            filename
          ))),
        })),
    },
  };
  fs.writeFileSync(compilerLockPath, JSON.stringify(compilerLock));
  const compilerMarkerPath = path.join(shardRunnerRoot, 'build', 'compiler-marker.json');
  fs.writeFileSync(
    compilerMarkerPath,
    JSON.stringify({
      schemaVersion: 1,
      lockSha256: sha256(fs.readFileSync(compilerLockPath)),
      environment: compilerEnvironment,
      environmentSha256: Object.fromEntries(
        Object.entries(compilerEnvironment).map(([name, inputPath]) => [
          name,
          sha256(fs.readFileSync(inputPath)),
        ])
      ),
    })
  );
  const runnerEnvironment = {
    ...process.env,
    MODERN_JAVA_SHARD_REPO_ROOT: shardRunnerRoot,
    MODERN_JAVA_SHARD_MANIFEST_PATH: shardRunnerManifest,
    MODERN_JAVA_COMPILER_INPUT_LOCK_PATH: compilerLockPath,
    MODERN_JAVA_COMPILER_INPUT_MARKER_PATH: compilerMarkerPath,
    GITHUB_RUN_ID: '42',
    GITHUB_RUN_ATTEMPT: '2',
  };
  const result = spawnSync(process.execPath, [shardRunnerPath, 'compiler-01'], {
    encoding: 'utf8',
    env: {
      ...runnerEnvironment,
      SHARD_ORDER_FILE: orderPath,
    },
  });
  if (result.status !== 0 || fs.readFileSync(orderPath, 'utf8') !== 'first\nsecond\n') {
    throw new Error(`Compiler shard runner must execute manifest scripts sequentially:\n${result.stderr}`);
  }
  const passedLedger = JSON.parse(
    fs.readFileSync(
      path.join(
        shardRunnerRoot,
        'build',
        'compiler-smoke-results',
        'compiler-smoke-42-2-compiler-01.json'
      ),
      'utf8'
    )
  );
  if (
    passedLedger.status !== 'passed' ||
    passedLedger.compilerInputLockSha256 !== sha256(fs.readFileSync(compilerLockPath)) ||
    passedLedger.scripts.some((script) => script.status !== 'passed')
  ) {
    throw new Error('Compiler shard runner must write a passing per-script result ledger.');
  }

  const compilerMarker = JSON.parse(fs.readFileSync(compilerMarkerPath, 'utf8'));
  const tamperedInput = compilerEnvironment.KOTLIN_COMPILER_JAR;
  const originalInput = fs.readFileSync(tamperedInput);
  fs.writeFileSync(tamperedInput, 'changed after compiler input preparation\n');
  const tamperedResult = spawnSync(process.execPath, [shardRunnerPath, 'compiler-01'], {
    encoding: 'utf8',
    env: { ...runnerEnvironment, SHARD_ORDER_FILE: orderPath },
  });
  fs.writeFileSync(tamperedInput, originalInput);
  if (
    tamperedResult.status === 0 ||
    !tamperedResult.stderr.includes('SHA-256 changed after preparation')
  ) {
    throw new Error(`Compiler shard runner must rehash prepared inputs:\n${tamperedResult.stderr}`);
  }

  const escapedRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-escaped-compiler-input-'));
  try {
    const escapedInput = path.join(escapedRoot, 'compiler.jar');
    fs.writeFileSync(escapedInput, fs.readFileSync(compilerEnvironment.KOTLIN_COMPILER_JAR));
    const linkPath = path.join(shardRunnerRoot, 'build', 'escaped-compiler-inputs');
    fs.symlinkSync(escapedRoot, linkPath, 'dir');
    compilerMarker.environment.KOTLIN_COMPILER_JAR = path.join(linkPath, 'compiler.jar');
    fs.writeFileSync(compilerMarkerPath, JSON.stringify(compilerMarker));
    const escapedResult = spawnSync(process.execPath, [shardRunnerPath, 'compiler-01'], {
      encoding: 'utf8',
      env: { ...runnerEnvironment, SHARD_ORDER_FILE: orderPath },
    });
    if (
      escapedResult.status === 0 ||
      !escapedResult.stderr.includes('escapes the checkout through a symbolic link')
    ) {
      throw new Error(`Compiler shard runner must reject escaping input paths:\n${escapedResult.stderr}`);
    }
    fs.unlinkSync(linkPath);
  } finally {
    fs.rmSync(escapedRoot, { recursive: true, force: true });
    fs.writeFileSync(compilerMarkerPath, JSON.stringify({
      ...compilerMarker,
      environment: compilerEnvironment,
      environmentSha256: Object.fromEntries(
        Object.entries(compilerEnvironment).map(([name, inputPath]) => [
          name,
          sha256(fs.readFileSync(inputPath)),
        ])
      ),
    }));
  }

  const originalExtraKotlinInput = fs.readFileSync(extraKotlinInput);
  const mutationResult = spawnSync(process.execPath, [shardRunnerPath, 'compiler-03'], {
    encoding: 'utf8',
    env: {
      ...runnerEnvironment,
      SHARD_EXTRA_KOTLIN_JAR: extraKotlinInput,
    },
  });
  fs.writeFileSync(extraKotlinInput, originalExtraKotlinInput);
  if (
    mutationResult.status === 0 ||
    !mutationResult.stderr.includes('stopped after a failed compiler smoke')
  ) {
    throw new Error(`Compiler shard runner must detect post-script input mutation:\n${mutationResult.stderr}`);
  }
  const mutationLedger = JSON.parse(fs.readFileSync(path.join(
    shardRunnerRoot,
    'build',
    'compiler-smoke-results',
    'compiler-smoke-42-2-compiler-03.json'
  ), 'utf8'));
  if (
    mutationLedger.status !== 'failed' ||
    !mutationLedger.scripts[0]?.compilerInputIntegrityError?.includes('SHA-256 changed after preparation')
  ) {
    throw new Error('Compiler shard ledger must record post-script compiler input corruption.');
  }

  const scalaCacheDirectory = path.dirname(compilerEnvironment.SCALA_COMPILER_JAR);
  const unlockedScalaInput = path.join(scalaCacheDirectory, 'scala-unlocked.jar');
  const scalaMutationResult = spawnSync(process.execPath, [shardRunnerPath, 'compiler-06'], {
    encoding: 'utf8',
    env: {
      ...runnerEnvironment,
      SHARD_SCALA_CACHE: scalaCacheDirectory,
    },
  });
  fs.rmSync(unlockedScalaInput, { force: true });
  if (
    scalaMutationResult.status === 0 ||
    !scalaMutationResult.stderr.includes('stopped after a failed compiler smoke')
  ) {
    throw new Error(
      `Compiler shard runner must detect post-script Scala inventory mutation:\n${scalaMutationResult.stderr}`
    );
  }
  const scalaMutationLedger = JSON.parse(fs.readFileSync(path.join(
    shardRunnerRoot,
    'build',
    'compiler-smoke-results',
    'compiler-smoke-42-2-compiler-06.json'
  ), 'utf8'));
  if (
    scalaMutationLedger.status !== 'failed' ||
    !scalaMutationLedger.scripts[0]?.compilerInputIntegrityError?.includes(
      'Scala compiler cache JAR inventory changed'
    )
  ) {
    throw new Error('Compiler shard ledger must record post-script Scala inventory corruption.');
  }

  const quickTimeoutStarted = Date.now();
  const quickTimeoutResult = spawnSync(process.execPath, [shardRunnerPath, 'compiler-04'], {
    encoding: 'utf8',
    env: {
      ...runnerEnvironment,
      MODERN_JAVA_SHARD_OUTER_TIMEOUT_SECONDS: '1',
      MODERN_JAVA_SHARD_KILL_GRACE_SECONDS: '30',
    },
    timeout: 8_000,
  });
  if (
    quickTimeoutResult.error?.code === 'ETIMEDOUT' ||
    quickTimeoutResult.status === 0 ||
    Date.now() - quickTimeoutStarted >= 8_000
  ) {
    throw new Error(
      `Compiler shard runner retained a stale forced-kill timer after child close:\n${quickTimeoutResult.stderr}`
    );
  }

  const interruptedStarted = Date.now();
  const interruptedResult = spawnSync(
    'timeout',
    ['-k', '8s', '-s', 'TERM', '1s', process.execPath, shardRunnerPath, 'compiler-05'],
    {
      encoding: 'utf8',
      env: runnerEnvironment,
      timeout: 10_000,
    }
  );
  if (
    interruptedResult.error?.code === 'ETIMEDOUT' ||
    Date.now() - interruptedStarted >= 8_000 ||
    !interruptedResult.stderr.includes('interrupted compiler smoke')
  ) {
    throw new Error(
      `Compiler shard runner retained a stale signal kill timer after child close:\n${interruptedResult.stderr}`
    );
  }

  const leakPath = path.join(shardRunnerRoot, 'leaked.txt');
  const timeoutResult = spawnSync(process.execPath, [shardRunnerPath, 'compiler-02'], {
    encoding: 'utf8',
    env: {
      ...runnerEnvironment,
      SHARD_LEAK_FILE: leakPath,
      MODERN_JAVA_SHARD_OUTER_TIMEOUT_SECONDS: '1',
      MODERN_JAVA_SHARD_KILL_GRACE_SECONDS: '1',
    },
    timeout: 10_000,
  });
  if (timeoutResult.status === 0 || !timeoutResult.stderr.includes('timeout compiler smoke')) {
    throw new Error(`Compiler shard outer timeout must fail the shard:\n${timeoutResult.stderr}`);
  }
  spawnSync(process.execPath, ['-e', 'setTimeout(() => {}, 4500)']);
  if (fs.existsSync(leakPath)) {
    throw new Error('Compiler shard outer timeout must terminate the entire descendant process group.');
  }
  const timeoutLedger = JSON.parse(
    fs.readFileSync(
      path.join(
        shardRunnerRoot,
        'build',
        'compiler-smoke-results',
        'compiler-smoke-42-2-compiler-02.json'
      ),
      'utf8'
    )
  );
  if (timeoutLedger.status !== 'timeout' || timeoutLedger.scripts[0]?.status !== 'timeout') {
    throw new Error('Compiler shard runner must record outer timeout results in its ledger.');
  }
} finally {
  fs.rmSync(shardRunnerRoot, { recursive: true, force: true });
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function runArtifactTool(args) {
  return spawnSync(process.execPath, [artifactToolPath, ...args], { encoding: 'utf8' });
}

function expectArtifactFailure(label, args, expectedMessage) {
  const result = runArtifactTool(args);
  if (result.status === 0 || !result.stderr.includes(expectedMessage)) {
    throw new Error(
      `${label} should fail with ${JSON.stringify(expectedMessage)}:\n${result.stdout}\n${result.stderr}`
    );
  }
}

function writeArtifactFixture(root) {
  const files = new Map([
    [
      'build/release-cli/console/runner.js',
      "if (process.argv.includes('-help')) { console.log('Usage: fixture'); } else { process.exitCode = 1; }\n",
    ],
    ['build/release-cli/console/test_runner.js', 'test runner\n'],
    [
      'build/release-cli/src/doppiojvm.js',
      'module.exports = { Testing: {}, VM: {}, Heap: {}, Debug: {} };\n',
    ],
    [
      'build/release-cli/src/jvm.js',
      "class JVM { static getJDKInfo() { return { classpath: ['lib/rt.jar'] }; } } exports.default = JVM;\n",
    ],
    ['build/release-cli/src/natives/java_lang.js', 'native\n'],
    ['build/modern-bootstrap-overlay/modern-bootstrap.jar', 'overlay\n'],
    ['vendor/java_home/jdk.json', '{}\n'],
    ['vendor/java_home/lib/doppio.jar', 'doppio\n'],
    ['vendor/java_home/lib/rt.jar', 'runtime\n'],
  ]);
  for (const [relativePath, contents] of files) {
    const absolutePath = path.join(root, ...relativePath.split('/'));
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, contents);
  }
  fs.mkdirSync(path.join(root, 'ci'), { recursive: true });
  fs.writeFileSync(path.join(root, 'ci', 'modern_java_smoke_shards.json'), '{"fixture":true}\n');
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"doppiojvm","version":"0.0.0"}\n');
  for (const args of [
    ['init', '-q'],
    ['config', 'user.name', 'Doppio CI'],
    ['config', 'user.email', 'doppio-ci@example.invalid'],
    ['add', '.'],
    ['commit', '-q', '-m', 'test fixture'],
  ]) {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    if (result.error || result.status !== 0) {
      throw new Error(`Unable to initialize artifact test checkout: ${result.stderr}`);
    }
  }
  return spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
}

function rewriteTarHeader(archivePath, mutateHeader) {
  const archive = fs.readFileSync(archivePath);
  const header = archive.subarray(0, 512);
  mutateHeader(header);
  header.fill(32, 148, 156);
  let checksum = 0;
  for (const byte of header) {
    checksum += byte;
  }
  header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'ascii');
  fs.writeFileSync(archivePath, archive);
  return sha256(archive);
}

const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-modern-artifact-test-'));
try {
  const commitSha = writeArtifactFixture(artifactRoot);
  const runId = '123456';
  const runAttempt = '3';
  const artifactName = `modern-java-runtime-${runId}-${runAttempt}-${commitSha.slice(0, 12)}.tar`;
  const outputOne = path.join(artifactRoot, 'artifacts-one');
  const outputTwo = path.join(artifactRoot, 'artifacts-two');
  const archiveOne = path.join(outputOne, artifactName);
  const archiveTwo = path.join(outputTwo, artifactName);
  const githubOutputPath = path.join(artifactRoot, 'create.outputs');
  const createArguments = [
    'create',
    '--repo-root', artifactRoot,
    '--manifest', 'ci/modern_java_smoke_shards.json',
    '--commit', commitSha,
    '--run-id', runId,
    '--run-attempt', runAttempt,
  ];
  expectArtifactFailure(
    'wrong checkout HEAD provenance',
    [
      ...createArguments.slice(0, createArguments.indexOf('--commit') + 1),
      'b'.repeat(40),
      '--run-id', runId,
      '--run-attempt', runAttempt,
      '--output-dir', path.join(artifactRoot, 'wrong-head'),
    ],
    'does not match checkout HEAD'
  );
  for (const [index, outputDirectory] of [outputOne, outputTwo].entries()) {
    const result = runArtifactTool([
      ...createArguments,
      '--output-dir', outputDirectory,
      ...(index === 0 ? ['--github-output', githubOutputPath] : []),
    ]);
    if (result.status !== 0) {
      throw new Error(`Artifact creation should pass:\n${result.stderr}`);
    }
  }
  const archiveSha = sha256(fs.readFileSync(archiveOne));
  if (archiveSha !== sha256(fs.readFileSync(archiveTwo))) {
    throw new Error('Runtime artifacts created from identical inputs must be byte-for-byte deterministic.');
  }
  const githubOutputs = fs.readFileSync(githubOutputPath, 'utf8');
  if (
    !githubOutputs.includes(`artifact_name=${artifactName}\n`) ||
    !githubOutputs.includes(`sha256=${archiveSha}\n`) ||
    !githubOutputs.includes(`run_id=${runId}\n`) ||
    !githubOutputs.includes(`run_attempt=${runAttempt}\n`)
  ) {
    throw new Error('Runtime artifact create must publish its filename, SHA-256, and producer run identity.');
  }

  const verifyArguments = [
    'verify',
    '--repo-root', artifactRoot,
    '--manifest', 'ci/modern_java_smoke_shards.json',
    '--archive', archiveOne,
    '--sha256', archiveSha,
    '--commit', commitSha,
    '--run-id', runId,
    '--run-attempt', runAttempt,
    '--artifact-name', artifactName,
  ];
  const wrongAttempt = '4';
  const wrongAttemptName = `modern-java-runtime-${runId}-${wrongAttempt}-${commitSha.slice(0, 12)}.tar`;
  const wrongAttemptPath = path.join(artifactRoot, 'wrong-attempt', wrongAttemptName);
  fs.mkdirSync(path.dirname(wrongAttemptPath), { recursive: true });
  fs.copyFileSync(archiveOne, wrongAttemptPath);
  expectArtifactFailure(
    'wrong producer attempt provenance',
    [
      'verify',
      '--repo-root', artifactRoot,
      '--manifest', 'ci/modern_java_smoke_shards.json',
      '--archive', wrongAttemptPath,
      '--sha256', archiveSha,
      '--commit', commitSha,
      '--run-id', runId,
      '--run-attempt', wrongAttempt,
      '--artifact-name', wrongAttemptName,
      '--extract-root', artifactRoot,
    ],
    'provenance does not match'
  );
  expectArtifactFailure(
    'wrong extraction root',
    [...verifyArguments, '--extract-root', path.join(artifactRoot, 'wrong-root')],
    'must exactly match the verified repository root'
  );

  const sourceRunnerPath = path.join(artifactRoot, 'build', 'release-cli', 'console', 'runner.js');
  const sourceRunner = fs.readFileSync(sourceRunnerPath, 'utf8');
  const sourceVerifyArguments = ['verify-source', ...verifyArguments.slice(1)];
  const sourceVerifyResult = runArtifactTool(sourceVerifyArguments);
  if (sourceVerifyResult.status !== 0) {
    throw new Error(`Unchanged source snapshot verification should pass:\n${sourceVerifyResult.stderr}`);
  }
  fs.writeFileSync(sourceRunnerPath, `${sourceRunner}changed after bundle\n`);
  expectArtifactFailure(
    'post-bundle source mutation',
    sourceVerifyArguments,
    'source snapshot changed after bundling'
  );
  fs.writeFileSync(sourceRunnerPath, sourceRunner);

  const escapedInstallRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-runtime-install-escape-'));
  const buildPath = path.join(artifactRoot, 'build');
  const savedBuildPath = path.join(artifactRoot, 'build-before-symlink-test');
  try {
    fs.writeFileSync(path.join(escapedInstallRoot, 'sentinel'), 'outside checkout\n');
    fs.renameSync(buildPath, savedBuildPath);
    fs.symlinkSync(escapedInstallRoot, buildPath, 'dir');
    expectArtifactFailure(
      'symbolic-link install parent',
      [...verifyArguments, '--extract-root', artifactRoot],
      'unsafe symbolic-link directory'
    );
    if (fs.readFileSync(path.join(escapedInstallRoot, 'sentinel'), 'utf8') !== 'outside checkout\n') {
      throw new Error('Runtime artifact verifier modified a symlinked directory outside the checkout.');
    }
  } finally {
    if (fs.lstatSync(buildPath).isSymbolicLink()) {
      fs.unlinkSync(buildPath);
    }
    fs.renameSync(savedBuildPath, buildPath);
    fs.rmSync(escapedInstallRoot, { recursive: true, force: true });
  }

  const verifyResult = runArtifactTool([...verifyArguments, '--extract-root', artifactRoot]);
  if (verifyResult.status !== 0) {
    throw new Error(`Artifact verification should pass:\n${verifyResult.stderr}`);
  }
  if (fs.readFileSync(path.join(artifactRoot, 'build', 'release-cli', 'console', 'runner.js'), 'utf8') !== sourceRunner) {
    throw new Error('Verified runtime runner contents were not installed.');
  }
  const vendorLink = path.join(artifactRoot, 'build', 'release-cli', 'vendor');
  if (!fs.lstatSync(vendorLink).isSymbolicLink() || fs.readlinkSync(vendorLink) !== '../../vendor') {
    throw new Error('Verifier must recreate only the checked relative vendor symlink.');
  }
  const installedMode = fs.statSync(
    path.join(artifactRoot, 'vendor', 'java_home', 'lib', 'rt.jar')
  ).mode & 0o777;
  if (installedMode !== 0o644) {
    throw new Error(`Verifier must normalize installed file modes to 0644, got ${installedMode.toString(8)}.`);
  }
  const selfTestResult = spawnSync(process.execPath, [runtimeSelfTestPath], {
    encoding: 'utf8',
    env: {
      ...process.env,
      MODERN_JAVA_RUNTIME_SELF_TEST_REPO_ROOT: artifactRoot,
    },
  });
  if (selfTestResult.status !== 0) {
    throw new Error(`Installed runtime artifact self-test should pass:\n${selfTestResult.stderr}`);
  }

  const corruptedDirectory = path.join(artifactRoot, 'corrupted');
  fs.mkdirSync(corruptedDirectory);
  const corruptedArchive = path.join(corruptedDirectory, artifactName);
  const corrupted = fs.readFileSync(archiveOne);
  corrupted[corrupted.length - 1] ^= 1;
  fs.writeFileSync(corruptedArchive, corrupted);
  expectArtifactFailure(
    'transport integrity corruption',
    [
      ...verifyArguments.slice(0, verifyArguments.indexOf('--archive')),
      '--archive', corruptedArchive,
      '--sha256', archiveSha,
      '--commit', commitSha,
      '--run-id', runId,
      '--run-attempt', runAttempt,
      '--artifact-name', artifactName,
      '--extract-root', artifactRoot,
    ],
    'SHA-256 mismatch'
  );

  const unsafeDirectory = path.join(artifactRoot, 'unsafe');
  fs.mkdirSync(unsafeDirectory);
  const unsafeArchive = path.join(unsafeDirectory, artifactName);
  fs.copyFileSync(archiveOne, unsafeArchive);
  const unsafeSha = rewriteTarHeader(unsafeArchive, (header) => {
    header.fill(0, 0, 100);
    header.write('../escape', 0, 'ascii');
  });
  expectArtifactFailure(
    'unsafe archive path',
    [
      'verify',
      '--repo-root', artifactRoot,
      '--manifest', 'ci/modern_java_smoke_shards.json',
      '--archive', unsafeArchive,
      '--sha256', unsafeSha,
      '--commit', commitSha,
      '--run-id', runId,
      '--run-attempt', runAttempt,
      '--artifact-name', artifactName,
      '--extract-root', artifactRoot,
    ],
    'contains an unsafe path'
  );

  const symlinkDirectory = path.join(artifactRoot, 'symlink');
  fs.mkdirSync(symlinkDirectory);
  const symlinkArchive = path.join(symlinkDirectory, artifactName);
  fs.copyFileSync(archiveOne, symlinkArchive);
  const symlinkSha = rewriteTarHeader(symlinkArchive, (header) => {
    header[156] = '2'.charCodeAt(0);
  });
  expectArtifactFailure(
    'archived symbolic link',
    [
      'verify',
      '--repo-root', artifactRoot,
      '--manifest', 'ci/modern_java_smoke_shards.json',
      '--archive', symlinkArchive,
      '--sha256', symlinkSha,
      '--commit', commitSha,
      '--run-id', runId,
      '--run-attempt', runAttempt,
      '--artifact-name', artifactName,
      '--extract-root', artifactRoot,
    ],
    'may contain only regular files'
  );

  fs.writeFileSync(path.join(artifactRoot, 'ci', 'modern_java_smoke_shards.json'), '{"fixture":false}\n');
  expectArtifactFailure(
    'manifest provenance drift',
    [...verifyArguments, '--extract-root', artifactRoot],
    'does not match the checked-in shard manifest'
  );
} finally {
  fs.rmSync(artifactRoot, { recursive: true, force: true });
}

console.log('Modern Java workflow checker and runtime artifact tests passed.');
