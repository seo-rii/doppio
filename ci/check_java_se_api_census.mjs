import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createGzip, gzipSync } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { prepareToolchains } from './prepare_java_compatibility_toolchains.mjs';
import { projectCensus } from './java_se_api_projection.mjs';
import { fetchOracleIndexes, reconcileOracleIndexes } from './reconcile_java_se_api_docs.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const helperPath = path.join(repoRoot, 'ci/JavaSeApiCensus.java');
const lockPath = path.join(repoRoot, 'ci/java_compatibility_toolchains.lock.json');
const baselinePath = path.join(repoRoot, 'ci/java_se_api_census.lock.json');
const ownerRulesPath = path.join(repoRoot, 'ci/java_se_api_owner_rules.json');
const artifactDir = path.join(repoRoot, 'build/java-se-api-census');

export const JAVA_SE_MODULES = Object.freeze([
  'java.base', 'java.compiler', 'java.datatransfer', 'java.desktop',
  'java.instrument', 'java.logging', 'java.management', 'java.management.rmi',
  'java.naming', 'java.net.http', 'java.prefs', 'java.rmi', 'java.scripting',
  'java.se', 'java.security.jgss', 'java.security.sasl', 'java.smartcardio',
  'java.sql', 'java.sql.rowset', 'java.transaction.xa', 'java.xml', 'java.xml.crypto',
]);
const JAVA_SE_SET = new Set(JAVA_SE_MODULES);
const FIELD_COUNTS = Object.freeze({
  module: 3, requires: 4, exports: 4, opens: 4, uses: 3, provides: 4,
  classFile: 3, type: 7, member: 11, excludedModule: 3,
});

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function fail(message) {
  throw new Error(`Java SE API census: ${message}`);
}

export function summarizeCensus(text) {
  if (!text.endsWith('\n') || text.includes('\r') || text.includes('\0')) {
    fail('records must be LF-terminated UTF-8 text without CR or NUL.');
  }
  const rows = text.slice(0, -1).split('\n');
  const moduleRows = new Map(JAVA_SE_MODULES.map((name) => [name, []]));
  const countByKind = {};
  const exportedPackages = new Map(JAVA_SE_MODULES.map((name) => [name, new Set()]));
  const classFilesByPackage = new Map();
  const typesByPackage = new Map();
  const excludedModules = [];
  const installed = new Set();
  const apiRows = [];
  let previous = '';
  for (const row of rows) {
    if (!row || (previous && previous >= row)) fail('records must be nonempty, sorted and unique.');
    previous = row;
    const fields = row.split('\t');
    const [kind, moduleName] = fields;
    // Empty module versions and member extras are intentionally permitted.
    if (fields.length !== FIELD_COUNTS[kind] ||
        fields.some((field, index) => !field && !((kind === 'module' && index === 2) ||
          (kind === 'type' && index === 6) ||
          (kind === 'member' && (index === 9 || index === 10)) ||
          (kind === 'requires' && index === 3)))) {
      fail(`malformed ${kind || 'unknown'} record.`);
    }
    if (kind === 'excludedModule') {
      if (!moduleName.startsWith('jdk.') || JAVA_SE_SET.has(moduleName) ||
          fields[2] !== (moduleName.startsWith('jdk.incubator.') ? 'incubator' : 'jdk-specific')) {
        fail(`invalid excluded module ${moduleName}.`);
      }
      excludedModules.push([moduleName, fields[2]]);
      continue;
    }
    if (!JAVA_SE_SET.has(moduleName)) fail(`unclassified module ${moduleName}.`);
    moduleRows.get(moduleName).push(row);
    countByKind[kind] = (countByKind[kind] || 0) + 1;
    if (kind === 'module') {
      if (installed.has(moduleName)) fail(`duplicate module ${moduleName}.`);
      installed.add(moduleName);
    } else if (kind === 'exports' && fields[3] === '*') {
      exportedPackages.get(moduleName).add(fields[2]);
    } else if (kind === 'classFile' || kind === 'type' || kind === 'member') {
      apiRows.push(fields);
    }
  }
  for (const fields of apiRows) {
      const [kind, moduleName, name] = fields;
      const packages = exportedPackages.get(moduleName);
      const matches = [...packages].filter((pkg) => name.startsWith(`${pkg}.`));
      if (matches.length === 0) fail(`${kind} ${name} is not in an unqualified export of ${moduleName}.`);
      const selected = matches.sort((left, right) => right.length - left.length)[0];
      const key = `${moduleName}/${selected}`;
      const target = kind === 'classFile' ? classFilesByPackage : typesByPackage;
      if (kind !== 'member') target.set(key, (target.get(key) || 0) + 1);
  }
  if (installed.size !== JAVA_SE_MODULES.length ||
      JAVA_SE_MODULES.some((moduleName) => !installed.has(moduleName))) {
    fail('the complete 22-module Java SE set, including java.smartcardio, is required.');
  }
  for (const [moduleName, packages] of exportedPackages) {
    for (const pkg of packages) {
      const key = `${moduleName}/${pkg}`;
      if (!classFilesByPackage.get(key) || !typesByPackage.get(key)) {
        fail(`unresolved exported package ${key}.`);
      }
    }
  }
  const modules = JAVA_SE_MODULES.map((moduleName) => {
    const records = moduleRows.get(moduleName);
    const counts = {};
    for (const record of records) {
      const kind = record.split('\t', 1)[0];
      counts[kind] = (counts[kind] || 0) + 1;
    }
    return {
      name: moduleName,
      records: records.length,
      sha256: sha256(`${records.join('\n')}\n`),
      counts,
    };
  });
  return {
    records: rows.length,
    sha256: sha256(text),
    countByKind,
    excludedModules,
    modules,
  };
}

function run(executable, args, env, timeout) {
  const result = spawnSync(executable, args, {
    cwd: repoRoot, encoding: 'utf8', env, timeout, maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    fail(`${path.basename(executable)} exited ${result.status ?? 'without status'}: ` +
      `${result.error?.message || result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

export async function generateCensus({
  outputDir = artifactDir,
  cache = path.join(repoRoot, 'build/java-compatibility-toolchains'),
} = {}) {
  const marker = await prepareToolchains({ lockPath, cache });
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const result = {
    schemaVersion: 1,
    scope: 'Java SE API structural/source component; not by itself PLAN-001 completion',
    completeJavaSeInventory: false,
    runnerSha256: sha256(fs.readFileSync(fileURLToPath(import.meta.url))),
    helperSha256: sha256(fs.readFileSync(helperPath)),
    projectionSha256: sha256(fs.readFileSync(path.join(repoRoot, 'ci/java_se_api_projection.mjs'))),
    reconciliationSha256: sha256(fs.readFileSync(path.join(repoRoot, 'ci/reconcile_java_se_api_docs.mjs'))),
    ownerRulesSha256: sha256(fs.readFileSync(ownerRulesPath)),
    toolchainLockSha256: marker.lockSha256,
    toolchains: [],
  };
  const ownerRules = JSON.parse(fs.readFileSync(ownerRulesPath, 'utf8'));
  fs.mkdirSync(outputDir, { recursive: true });
  for (const toolchain of marker.toolchains) {
    const pinned = lock.toolchains.find((entry) => entry.id === toolchain.id);
    if (!pinned || pinned.archiveSha256 !== toolchain.archiveSha256) {
      fail(`verified toolchain marker does not match lock for ${toolchain.id}.`);
    }
    const temporary = fs.mkdtempSync(path.join(
      fs.existsSync('/dev/shm') ? '/dev/shm' : os.tmpdir(),
      `doppio-${toolchain.id}-census-`,
    ));
    try {
      const env = { ...process.env, JAVA_HOME: toolchain.home, LC_ALL: 'C', TZ: 'UTC' };
      for (const name of ['JAVA_TOOL_OPTIONS', '_JAVA_OPTIONS', 'JDK_JAVA_OPTIONS', 'CLASSPATH']) {
        delete env[name];
      }
      const classes = path.join(temporary, 'classes');
      fs.mkdirSync(classes);
      run(path.join(toolchain.home, 'bin/javac'), ['-d', classes, helperPath], env, 60_000);
      const sourceArtifact = path.join(temporary, `${toolchain.id}.tsv`);
      run(path.join(toolchain.home, 'bin/java'), [
        '-Xmx2048m', '-cp', classes, 'JavaSeApiCensus', sourceArtifact,
      ], env, 600_000);
      const sourceText = fs.readFileSync(sourceArtifact, 'utf8');
      const census = summarizeCensus(sourceText);
      const indexes = await fetchOracleIndexes(toolchain.feature);
      const official = reconcileOracleIndexes(sourceText, toolchain.feature, indexes);
      for (const kind of ['type', 'member', 'preview']) {
        fs.writeFileSync(path.join(outputDir, `${toolchain.id}.oracle-${kind}.gz`),
          gzipSync(indexes[kind], { level: 9 }));
      }
      fs.writeFileSync(path.join(outputDir, `${toolchain.id}.oracle-reflective.json.gz`),
        gzipSync(JSON.stringify(Object.fromEntries(
          Object.entries(indexes.reflective).sort(([left], [right]) => left.localeCompare(right)),
        ), null, 2), { level: 9 }));
      const projectedRaw = path.join(temporary, `${toolchain.id}.catalogue.jsonl`);
      const descriptor = fs.openSync(projectedRaw, 'wx', 0o600);
      const ledgerHash = crypto.createHash('sha256');
      let projectedRecords = 0;
      let projection;
      try {
        projection = projectCensus(sourceText, toolchain.feature, ownerRules, JAVA_SE_MODULES, {
          documentedAnchors: official.documentedAnchors,
          onRecord(record) {
            const row = Buffer.from(`${JSON.stringify(record)}\n`);
            if (fs.writeSync(descriptor, row) !== row.length) fail('short catalogue write.');
            ledgerHash.update(row);
            projectedRecords++;
          },
        });
      } finally {
        fs.closeSync(descriptor);
      }
      if (projectedRecords !== census.records) fail(`${toolchain.id} projected record count differs.`);
      fs.writeFileSync(path.join(outputDir, `${toolchain.id}.tsv.gz`),
        gzipSync(sourceText, { level: 9 }));
      await pipeline(createReadStream(projectedRaw), createGzip({ level: 9 }),
        createWriteStream(path.join(outputDir, `${toolchain.id}.catalogue.jsonl.gz`), { mode: 0o600 }));
      result.toolchains.push({
        id: toolchain.id,
        feature: toolchain.feature,
        version: toolchain.version,
        archiveSha256: pinned.archiveSha256,
        treeSha256: pinned.treeSha256,
        ...census,
        oracle: official.summary,
        projection,
        catalogueRecords: projectedRecords,
        catalogueSha256: ledgerHash.digest('hex'),
      });
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  }
  fs.writeFileSync(path.join(outputDir, 'summary.json'), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

export function verifyBaseline(actual, expected) {
  if (expected?.completeJavaSeInventory !== false ||
      expected?.scope !== 'Java SE API structural/source component; not by itself PLAN-001 completion') {
    fail('the component baseline must not claim PLAN-001 completion on its own.');
  }
  assert.deepEqual(actual, expected, 'Pinned Java SE structural census changed; review and update the baseline.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--propose-baseline')) {
      fail('Usage: node ci/check_java_se_api_census.mjs [--propose-baseline]');
    }
    const actual = await generateCensus();
    if (process.argv[2] === '--propose-baseline') {
      const proposal = path.join(artifactDir, 'proposed-baseline.json');
      fs.writeFileSync(proposal, `${JSON.stringify(actual, null, 2)}\n`);
      console.log(`Review the proposed structural/API baseline at ${proposal}.`);
    } else {
      verifyBaseline(actual, JSON.parse(fs.readFileSync(baselinePath, 'utf8')));
      console.log('Java SE 21/25 API census matches pinned baseline; this component alone does not establish PLAN-001 completion.');
    }
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
