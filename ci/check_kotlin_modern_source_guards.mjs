import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const sourceRoot = process.env.KOTLIN_MODERN_SOURCE_GUARD_ROOT || path.join(repoRoot, 'classes');

const bannedPatterns = [
  {
    label: 'Runtime.version direct call',
    pattern: /\bRuntime\s*\.\s*version\s*\(/,
    guidance: 'Use the runtime reflection overlay design before exposing Runtime.version to Kotlin source.',
  },
  {
    label: 'Runtime.Version.parse direct call',
    pattern: /\bRuntime\s*\.\s*Version\s*\.\s*parse\s*\(/,
    guidance: 'Keep Runtime.Version probes in Java fixtures or reflection-backed smoke code until compiler startup is gated.',
  },
  {
    label: 'Optional.ifPresentOrElse direct call',
    pattern: /\.ifPresentOrElse\s*\(/,
    guidance: 'Use reflection-backed Optional coverage or a Java fixture; this direct Kotlin source path has timed out locally.',
  },
  {
    label: 'Optional.or direct call',
    pattern: /\.`or`\s*\(/,
    guidance: 'Use reflection-backed Optional coverage or a Java fixture; this direct Kotlin source path has timed out locally.',
  },
  {
    label: 'Optional.stream direct call',
    pattern: /\boptional[A-Za-z0-9_]*\s*\.\s*stream\s*\(/i,
    guidance: 'Use reflection-backed Optional coverage or a Java fixture; this direct Kotlin source path has timed out locally.',
  },
  {
    label: 'Objects modern helper direct call',
    pattern: /\b(?:java\.util\.)?Objects\s*\.\s*(?:requireNonNullElse(?:Get)?|checkIndex|checkFromToIndex|checkFromIndexSize)\s*\(/,
    guidance: 'Use a Java fixture or reflection-backed Kotlin probe until direct Kotlin compiler resolution has headroom.',
  },
  {
    label: 'COPY_ATTRIBUTES direct Kotlin probe',
    pattern: /\b(?:StandardCopyOption\s*\.\s*)?COPY_ATTRIBUTES\b/,
    guidance: 'Split filesystem metadata coverage into a separately budgeted smoke before using COPY_ATTRIBUTES from Kotlin.',
  },
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function listKotlinSmokeSources(root) {
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
        entry.name.endsWith('.kt') &&
        /(^|[/\\])kotlin_[^/\\]+_smoke[/\\]/.test(entryPath)
      ) {
        results.push(entryPath);
      }
    }
  }

  visit(root);
  return results.sort();
}

const violations = [];
const sourcePaths = listKotlinSmokeSources(sourceRoot);
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
  console.error('Kotlin smoke sources contain timeout-sensitive direct modern Java calls:');
  for (const violation of violations) {
    console.error(`  - ${path.relative(repoRoot, violation.sourcePath)}:${violation.line}: ${violation.label}`);
    console.error(`    ${violation.guidance}`);
  }
  fail('Move this coverage to a Java fixture or reflection-backed Kotlin smoke before adding it to CI.');
}

console.log(`Kotlin modern source guard checked ${sourcePaths.length} Kotlin smoke source files.`);
