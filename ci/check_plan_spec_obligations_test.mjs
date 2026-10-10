import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  chapterSourceUrl,
  checkSpecGapLedger,
  validateSpecGapLedger,
} from './check_plan_spec_obligations.mjs';

const ledgerUrl = new URL('./plan_spec_obligations.json', import.meta.url);

function copyLedger() {
  return JSON.parse(fs.readFileSync(ledgerUrl, 'utf8'));
}

test('resolves every JLS/JVMS chapter to full source contracts without claiming conformance', () => {
  const ledger = copyLedger();
  assert.deepEqual(validateSpecGapLedger(ledger), {
    profile: 'java-se-21-25-final',
    sourceEditions: 4,
    indexedChapters: 26,
    resolvedEditionChapterCells: 52,
    resolvedCrossCuttingItems: 5,
    resolutionMapComplete: true,
    semanticAssessmentComplete: false,
  });
  assert.equal(checkSpecGapLedger().resolutionMapComplete, true);
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
  noEvidence.crossCuttingGaps[0].resolution = '';
  assert.throws(() => validateSpecGapLedger(noEvidence), /resolution must not be empty/);
});

test('a resolution declaration cannot substitute for the complete source inventories', () => {
  const claimed = copyLedger();
  claimed.completeJavaSeInventory = true;
  assert.throws(() => validateSpecGapLedger(claimed), /cannot claim inventory completion/);

  const closedChapter = copyLedger();
  closedChapter.chapterGaps[0].state = 'complete';
  assert.throws(() => validateSpecGapLedger(closedChapter), /needs source-contract coverage/);

  const missingComponent = copyLedger();
  delete missingComponent.components.supplementary;
  assert.throws(() => validateSpecGapLedger(missingComponent), /All three inventory components/);
  const unlinked = copyLedger();
  unlinked.crossCuttingGaps[0].evidence = ['specification'];
  assert.throws(() => validateSpecGapLedger(unlinked), /needs all source components/);
  const semanticClaim = copyLedger();
  semanticClaim.semanticAssessmentComplete = true;
  assert.throws(() => validateSpecGapLedger(semanticClaim), /not implementation assessment/);
});
