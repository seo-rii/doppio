import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RELEASES = [21, 25];
const CHAPTER_TITLES = {
  JLS: [
    'Introduction', 'Grammars', 'Lexical Structure', 'Types, Values, and Variables',
    'Conversions and Contexts', 'Names', 'Packages and Modules', 'Classes',
    'Interfaces', 'Arrays', 'Exceptions', 'Execution', 'Binary Compatibility',
    'Blocks, Statements, and Patterns', 'Expressions', 'Definite Assignment',
    'Threads and Locks', 'Type Inference', 'Syntax',
  ],
  JVMS: [
    'Introduction', 'The Structure of the Java Virtual Machine',
    'Compiling for the Java Virtual Machine', 'The class File Format',
    'Loading, Linking, and Initializing', 'The Java Virtual Machine Instruction Set',
    'Opcode Mnemonics by Opcode',
  ],
};
const CHAPTER_COUNTS = Object.fromEntries(
  Object.entries(CHAPTER_TITLES).map(([spec, titles]) => [spec, titles.length]),
);
const REQUIRED_CROSS_CUTTING_GAPS = [
  'JAVA8-INHERITED-SEMANTICS',
  'EDITION-DELTA',
  'SERVICE-PROVIDER-CONTRACTS',
  'API-BEHAVIOR',
  'FEATURE-BOUNDARY',
];

function requireText(value, label) {
  assert.equal(typeof value, 'string', `${label} must be text`);
  assert.ok(value.trim(), `${label} must not be empty`);
}

function canonicalEdition(spec, release) {
  const slug = spec.toLowerCase();
  const root = `https://docs.oracle.com/javase/specs/${slug}/se${release}/html/`;
  return {
    id: `${spec}-${release}`,
    spec,
    release,
    contentsUrl: `${root}index.html`,
    chapterUrlPrefix: `${root}${slug}-`,
  };
}

export function chapterSourceUrl(ledger, spec, release, chapter) {
  const edition = ledger.editions.find((item) => item.spec === spec && item.release === release);
  assert.ok(edition, `Missing source edition ${spec}-${release}`);
  assert.ok(Number.isInteger(chapter) && chapter >= 1 && chapter <= CHAPTER_COUNTS[spec], 'Invalid chapter');
  return `${edition.chapterUrlPrefix}${chapter}.html#${spec.toLowerCase()}-${chapter}`;
}

// This validates the resolution map. Only the aggregate gate verifies the
// generated source inventories; the declaration alone cannot close PLAN-001.
export function validateSpecGapLedger(ledger) {
  assert.ok(ledger && typeof ledger === 'object' && !Array.isArray(ledger), 'Ledger must be an object');
  assert.equal(ledger.schemaVersion, 2, 'Unknown PLAN-001 ledger schema');
  assert.equal(ledger.profile, 'java-se-21-25-final', 'Unexpected target profile');
  assert.equal(ledger.completeJavaSeInventory, undefined, 'A resolution map cannot claim inventory completion');
  assert.equal(ledger.inventoryGranularity, 'whole-source-contract', 'Complete contracts are the inventory unit');
  assert.equal(ledger.semanticAssessmentComplete, false, 'Inventory is not implementation assessment');
  assert.equal(ledger.completionGate, 'ci/check_phase_a_inventory.mjs');
  assert.deepEqual(ledger.components, {
    specification: 'ci/plan_spec_source_index.json',
    api: 'ci/java_se_api_census.lock.json',
    supplementary: 'ci/java_se_contract_sources.lock.json',
  }, 'All three inventory components are required');
  requireText(ledger.purpose, 'purpose');
  requireText(ledger.chapterExitRule, 'chapterExitRule');

  assert.ok(Array.isArray(ledger.editions), 'editions must be an array');
  assert.equal(ledger.editions.length, 4, 'Expected JLS/JVMS 21 and 25 source editions');
  const actualEditionIds = new Set();
  for (const edition of ledger.editions) {
    assert.ok(Object.hasOwn(CHAPTER_COUNTS, edition.spec), `Unknown specification ${edition.spec}`);
    assert.ok(RELEASES.includes(edition.release), `Unknown release ${edition.release}`);
    const expected = canonicalEdition(edition.spec, edition.release);
    assert.deepEqual(edition, expected, `Non-canonical official source for ${expected.id}`);
    assert.ok(!actualEditionIds.has(edition.id), `Duplicate source edition ${edition.id}`);
    actualEditionIds.add(edition.id);
  }
  for (const spec of Object.keys(CHAPTER_COUNTS)) {
    for (const release of RELEASES) {
      assert.ok(actualEditionIds.has(`${spec}-${release}`), `Missing ${spec}-${release}`);
    }
  }

  const expectedChapterCount = Object.values(CHAPTER_COUNTS).reduce((sum, count) => sum + count, 0);
  assert.ok(Array.isArray(ledger.chapterGaps), 'chapterGaps must be an array');
  assert.equal(ledger.chapterGaps.length, expectedChapterCount, 'Missing or extra source-chapter gap');
  const seenChapters = new Set();
  for (const gap of ledger.chapterGaps) {
    assert.ok(Object.hasOwn(CHAPTER_COUNTS, gap.spec), `Unknown specification ${gap.spec}`);
    assert.ok(Number.isInteger(gap.chapter) && gap.chapter >= 1 && gap.chapter <= CHAPTER_COUNTS[gap.spec], `Invalid ${gap.spec} chapter`);
    const id = `${gap.spec}-${String(gap.chapter).padStart(2, '0')}`;
    assert.equal(gap.id, id, `Unstable chapter gap ID for ${gap.spec} ${gap.chapter}`);
    assert.ok(!seenChapters.has(id), `Duplicate chapter gap ${id}`);
    seenChapters.add(id);
    assert.equal(gap.title, CHAPTER_TITLES[gap.spec][gap.chapter - 1], `${id} official chapter title changed`);
    assert.deepEqual(gap.releases, RELEASES, `${id} must retain both source editions`);
    assert.equal(gap.censusOwner, 'PLAN-001', `${id} needs an enumeration owner`);
    assert.equal(gap.state, 'source-contracts-indexed', `${id} needs source-contract coverage`);
    assert.deepEqual(gap.evidence, ['specification'], `${id} needs source-index evidence`);
    for (const release of gap.releases) chapterSourceUrl(ledger, gap.spec, release, gap.chapter);
  }
  for (const spec of Object.keys(CHAPTER_COUNTS)) {
    for (let chapter = 1; chapter <= CHAPTER_COUNTS[spec]; chapter++) {
      assert.ok(seenChapters.has(`${spec}-${String(chapter).padStart(2, '0')}`), `Missing ${spec} chapter ${chapter}`);
    }
  }

  assert.ok(Array.isArray(ledger.crossCuttingGaps), 'crossCuttingGaps must be an array');
  assert.equal(ledger.crossCuttingGaps.length, REQUIRED_CROSS_CUTTING_GAPS.length, 'Missing or extra cross-cutting gap');
  const seenCrossCutting = new Set();
  for (const gap of ledger.crossCuttingGaps) {
    assert.ok(REQUIRED_CROSS_CUTTING_GAPS.includes(gap.id), `Unknown cross-cutting gap ${gap.id}`);
    assert.ok(!seenCrossCutting.has(gap.id), `Duplicate cross-cutting gap ${gap.id}`);
    seenCrossCutting.add(gap.id);
    assert.equal(gap.censusOwner, 'PLAN-001', `${gap.id} needs an enumeration owner`);
    assert.equal(gap.state, 'source-contracts-indexed', `${gap.id} needs source-contract coverage`);
    requireText(gap.resolution, `${gap.id} resolution`);
    assert.deepEqual(gap.evidence, ['API-BEHAVIOR', 'SERVICE-PROVIDER-CONTRACTS'].includes(gap.id)
      ? ['api', 'supplementary'] : ['specification', 'api', 'supplementary'], `${gap.id} needs all source components`);
    assert.ok(Array.isArray(gap.sourceUrls) && gap.sourceUrls.length > 0, `${gap.id} needs source URLs`);
    for (const source of gap.sourceUrls) {
      const url = new URL(source);
      assert.equal(url.protocol, 'https:', `${gap.id} source must use HTTPS`);
      assert.equal(url.hostname, 'docs.oracle.com', `${gap.id} source must be official`);
    }
  }
  for (const id of REQUIRED_CROSS_CUTTING_GAPS) {
    assert.ok(seenCrossCutting.has(id), `Missing cross-cutting gap ${id}`);
  }

  return {
    profile: ledger.profile,
    sourceEditions: ledger.editions.length,
    indexedChapters: ledger.chapterGaps.length,
    resolvedEditionChapterCells: ledger.chapterGaps.reduce((sum, gap) => sum + gap.releases.length, 0),
    resolvedCrossCuttingItems: ledger.crossCuttingGaps.length,
    resolutionMapComplete: true,
    semanticAssessmentComplete: false,
  };
}

export function checkSpecGapLedger({ requireComplete = false, ledgerPath = new URL('./plan_spec_obligations.json', import.meta.url) } = {}) {
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const summary = validateSpecGapLedger(ledger);
  if (requireComplete) {
    assert.equal(String(ledgerPath), String(new URL('./plan_spec_obligations.json', import.meta.url)),
      'Complete inventory validation requires the repository resolution map');
    const checker = fileURLToPath(new URL('./check_phase_a_inventory.mjs', import.meta.url));
    return JSON.parse(execFileSync(process.execPath, [checker], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  }
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.ok(process.argv.slice(2).every((arg) => arg === '--require-complete'), 'Unknown argument');
    const summary = checkSpecGapLedger({ requireComplete: process.argv.includes('--require-complete') });
    process.stdout.write(`${JSON.stringify(summary)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
