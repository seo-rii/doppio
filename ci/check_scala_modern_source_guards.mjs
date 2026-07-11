import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const sourceRoot = process.env.SCALA_MODERN_SOURCE_GUARD_ROOT || path.join(repoRoot, 'classes');

const bannedPatterns = [
  {
    label: 'Runtime.version direct call',
    pattern: /\b(?:java\.lang\.)?Runtime\s*\.\s*version\s*\(/,
    guidance: 'Use the runtime reflection overlay design before exposing Runtime.version to Scala source.',
  },
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
  console.error('Scala smoke sources contain timeout-sensitive direct modern Java calls:');
  for (const violation of violations) {
    console.error(`  - ${path.relative(repoRoot, violation.sourcePath)}:${violation.line}: ${violation.label}`);
    console.error(`    ${violation.guidance}`);
  }
  fail('Move this coverage to a Java fixture or reflection-backed Scala smoke before adding it to CI.');
}

console.log(`Scala modern source guard checked ${sourcePaths.length} Scala smoke source files.`);
