import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  chapterSourceUrl,
  checkSpecGapLedger,
  validateSpecGapLedger,
} from './check_plan_spec_obligations.mjs';

const ledgerUrl = new URL('./plan_spec_obligations.json', import.meta.url);
const checkerPath = fileURLToPath(new URL('./check_plan_spec_obligations.mjs', import.meta.url));

function copyLedger() {
  return JSON.parse(fs.readFileSync(ledgerUrl, 'utf8'));
}

test('indexes both editions of every JLS/JVMS chapter while keeping obligations open', () => {
  const ledger = copyLedger();
  assert.deepEqual(validateSpecGapLedger(ledger), {
    profile: 'java-se-21-25-final',
    sourceEditions: 4,
    indexedChapters: 26,
    openEditionChapterGaps: 52,
    openCrossCuttingGaps: 5,
    completeJavaSeInventory: false,
  });
  assert.equal(checkSpecGapLedger().completeJavaSeInventory, false);
  assert.equal(
    chapterSourceUrl(ledger, 'JVMS', 25, 4),
    'https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-4.html#jvms-4',
  );
  assert.equal(
    chapterSourceUrl(ledger, 'JLS', 21, 17),
    'https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html#jls-17',
  );
});

test('fails closed on missing, duplicate or unowned source chapters', () => {
  const missing = copyLedger();
  missing.chapterGaps = missing.chapterGaps.filter((gap) => gap.id !== 'JLS-17');
  assert.throws(() => validateSpecGapLedger(missing), /Missing or extra source-chapter gap/);

  const duplicate = copyLedger();
  duplicate.chapterGaps[1] = structuredClone(duplicate.chapterGaps[0]);
  assert.throws(() => validateSpecGapLedger(duplicate), /Duplicate chapter gap/);

  const unowned = copyLedger();
  unowned.chapterGaps[0].censusOwner = '';
  assert.throws(() => validateSpecGapLedger(unowned), /enumeration owner/);

  const wrongTitle = copyLedger();
  wrongTitle.chapterGaps[0].title = 'Placeholder';
  assert.throws(() => validateSpecGapLedger(wrongTitle), /official chapter title changed/);

  const oneEdition = copyLedger();
  oneEdition.chapterGaps[0].releases = [25];
  assert.throws(() => validateSpecGapLedger(oneEdition), /both source editions/);
});

test('rejects source substitution and missing inherited, service or exclusion gaps', () => {
  const source = copyLedger();
  source.editions[0].contentsUrl = 'https://example.com/jls';
  assert.throws(() => validateSpecGapLedger(source), /Non-canonical official source/);

  for (const id of ['JAVA8-INHERITED-SEMANTICS', 'SERVICE-PROVIDER-CONTRACTS', 'FEATURE-BOUNDARY']) {
    const missing = copyLedger();
    missing.crossCuttingGaps = missing.crossCuttingGaps.filter((gap) => gap.id !== id);
    assert.throws(() => validateSpecGapLedger(missing), /Missing or extra cross-cutting gap/);
  }

  const noEvidence = copyLedger();
  noEvidence.crossCuttingGaps[0].missingEvidence = '';
  assert.throws(() => validateSpecGapLedger(noEvidence), /missingEvidence must not be empty/);
});

test('schema v1 cannot silently claim clause-level PLAN-001 completion', () => {
  const claimed = copyLedger();
  claimed.completeJavaSeInventory = true;
  assert.throws(() => validateSpecGapLedger(claimed), /cannot claim a complete inventory/);

  const closedChapter = copyLedger();
  closedChapter.chapterGaps[0].state = 'complete';
  assert.throws(() => validateSpecGapLedger(closedChapter), /cannot be closed in schema v1/);

  assert.throws(() => checkSpecGapLedger({ requireComplete: true }), /PLAN-001 remains open/);
  const result = spawnSync(process.execPath, [checkerPath, '--require-complete'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /52 edition\/chapter gaps and 5 cross-cutting gaps/);
});
