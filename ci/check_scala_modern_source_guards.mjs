import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const sourceRoot = process.env.SCALA_MODERN_SOURCE_GUARD_ROOT || path.join(repoRoot, 'classes');
const runtimeVersionFixture = 'scala_modern_interop_smoke/ScalaModernJavaInteropSmoke.scala';
const runtimeVersionCallPattern = /\b(?:java\.lang\.)?Runtime\s*\.\s*version\s*\(\s*\)/g;
const runtimeFeatureCallPattern = /\b(?:java\.lang\.)?Runtime\s*\.\s*version\s*\(\s*\)\s*\.\s*feature\s*\(\s*\)/g;

const bannedPatterns = [
  {
    label: 'Runtime.Version.parse direct call',
    pattern: /\b(?:java\.lang\.)?Runtime\s*\.\s*Version\s*\.\s*parse\s*\(/,
    guidance: 'Keep Runtime.Version probes in Java fixtures or reflection-backed smoke code until compiler startup is gated.',
  },
  {
    label: 'scala.jdk.DurationConverters import',
    pattern: /\bscala\s*\.\s*jdk\s*\.\s*DurationConverters\b/,
    guidance: 'Move DurationConverters coverage to a separately budgeted smoke before using it from Scala compiler CI.',
  },
  {
    label: 'COPY_ATTRIBUTES direct Scala probe',
    pattern: /\b(?:StandardCopyOption\s*\.\s*)?COPY_ATTRIBUTES\b/,
    guidance: 'Split filesystem metadata coverage into a separately budgeted smoke before using COPY_ATTRIBUTES from Scala.',
  },
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function listScalaSmokeSources(root) {
  const results = [];
  if (!fs.existsSync(root)) {
    return results;
  }

  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
      } else if (
        entry.isFile() &&
        entry.name.endsWith('.scala') &&
        /(^|[/\\])scala_[^/\\]+_smoke[/\\]/.test(entryPath)
      ) {
        results.push(entryPath);
      }
    }
  }

  visit(root);
  return results.sort();
}

const violations = [];
const sourcePaths = listScalaSmokeSources(sourceRoot);
for (const sourcePath of sourcePaths) {
  const content = fs.readFileSync(sourcePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const relativeSourcePath = path.relative(sourceRoot, sourcePath).split(path.sep).join('/').replace(/^classes\//, '');
  const runtimeVersionCalls = content.match(runtimeVersionCallPattern) || [];
  const runtimeFeatureCalls = content.match(runtimeFeatureCallPattern) || [];

  if (relativeSourcePath === runtimeVersionFixture) {
    if (runtimeVersionCalls.length !== 1 || runtimeFeatureCalls.length !== 1) {
      violations.push({
        sourcePath,
        line: 1,
        label: 'Runtime.version().feature() fixture requirement',
        guidance: 'Keep exactly one direct Runtime.version().feature() call in the Scala modern Java interop fixture.',
      });
    }
  } else if (runtimeVersionCalls.length > 0) {
    for (let index = 0; index < lines.length; index++) {
      if (/\b(?:java\.lang\.)?Runtime\s*\.\s*version\s*\(\s*\)/.test(lines[index])) {
        violations.push({
          sourcePath,
          line: index + 1,
          label: 'Runtime.version direct call',
          guidance: 'Keep direct Runtime.version coverage in the Scala modern Java interop fixture.',
        });
      }
    }
  }

  for (const bannedPattern of bannedPatterns) {
    for (let index = 0; index < lines.length; index++) {
      if (bannedPattern.pattern.test(lines[index])) {
        violations.push({
          sourcePath,
          line: index + 1,
          label: bannedPattern.label,
          guidance: bannedPattern.guidance,
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Scala smoke sources violate modern Java direct-call requirements:');
  for (const violation of violations) {
    console.error(`  - ${path.relative(repoRoot, violation.sourcePath)}:${violation.line}: ${violation.label}`);
    console.error(`    ${violation.guidance}`);
  }
  fail('Fix the guarded call shape or move unsupported direct coverage out of Scala smoke sources.');
}

console.log(`Scala modern source guard checked ${sourcePaths.length} Scala smoke source files.`);
