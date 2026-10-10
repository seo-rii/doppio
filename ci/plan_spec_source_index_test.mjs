import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  classifySourceUnit,
  hashChapterSpans,
  parseOfficialToc,
  validateSourceIndex,
} from './plan_spec_source_index.mjs';

const snapshotUrl = new URL('./plan_spec_source_index.json', import.meta.url);
const script = fileURLToPath(new URL('./plan_spec_source_index.mjs', import.meta.url));

function snapshot() {
  return JSON.parse(fs.readFileSync(snapshotUrl, 'utf8'));
}

test('official TOC parser includes chapter preamble and nested section anchors but not examples', () => {
  const html = '<div class="toc"><a href="jls-1.html">1. Introduction</a>'
    + '<a href="jls-1.html#jls-1.1">1.1. Organization of the Specification</a>'
    + '<a href="jls-1.html#jls-1.1.1">1.1.1. Nested &amp; Normative</a></div>'
    + '<div class="list-of-examples"><a href="jls-1.html#example">Example</a></div>';
  const parsed = parseOfficialToc(html, 'JLS');
  assert.deepEqual(parsed.units, [
    { chapter: 1, anchor: 'jls-1', title: 'Introduction', kind: 'chapter' },
    { chapter: 1, anchor: 'jls-1.1', title: 'Organization of the Specification', kind: 'section' },
    { chapter: 1, anchor: 'jls-1.1.1', title: 'Nested & Normative', kind: 'section' },
  ]);
  const page = '<h1><a name="jls-1"></a>Prelude</h1><h2><a name="jls-1.1"></a>First</h2>'
    + '<h3><a name="jls-1.1.1"></a>Nested</h3><div class="navfooter">footer</div>';
  const spans = hashChapterSpans(page, parsed.units);
  assert.equal(spans.length, 3);
  assert.match(spans[0].contentSha256, /^[0-9a-f]{64}$/);
  assert.notEqual(spans[0].contentSha256, spans[1].contentSha256);
  assert.throws(() => hashChapterSpans(page.replace('name="jls-1.1.1"', 'name="missing"'), parsed.units), /Missing chapter anchor/);
});

test('routes compiler, guest, memory-model, information and final-only boundaries explicitly', () => {
  assert.deepEqual(classifySourceUnit('JLS', 18, 'jls-18.5', 'Uses of Inference'), {
    route: 'external-javac', applicability: 'external-compiler-contract',
    applicabilityRationale: 'Pinned external javac owns source acceptance and diagnostics; hosted modern javac is deferred.',
    ownerPackageId: 'PLAN-001', assessmentStatus: 'unassessed',
    testPlanTemplateId: 'TP-JAVAC-DIAGNOSTICS',
  });
  assert.equal(classifySourceUnit('JLS', 17, 'jls-17.4', 'Memory Model').testPlanTemplateId, 'TP-MEMORY-MODEL');
  assert.equal(classifySourceUnit('JVMS', 4, 'jvms-4.1', 'The ClassFile Structure').ownerPackageId, 'JVM-001');
  assert.equal(classifySourceUnit('JVMS', 6, 'jvms-6.5.aaload', 'aaload').testPlanTemplateId, 'TP-OPCODE');
  assert.equal(classifySourceUnit('JVMS', 7, 'jvms-7', 'Opcode Mnemonics by Opcode').testPlanTemplateId, 'TP-OPCODE-TABLE');
  assert.equal(classifySourceUnit('JVMS', 7, 'jvms-7', 'Opcode Mnemonics by Opcode').ownerPackageId, 'JVM-002');
  assert.equal(classifySourceUnit('JLS', 1, 'jls-1.5.2', 'Current Preview Language Features').route, 'explicit-exclusion');
  assert.equal(classifySourceUnit('JVMS', 1, 'jvms-1.5.1', 'Restrictions on the Use of Preview Features').ownerPackageId, 'JVM-001');
});

test('pinned offline snapshot has complete anchors but does not claim semantic review', () => {
  assert.deepEqual(validateSourceIndex(snapshot()), {
    profile: 'java-se-21-25-final', sourceAnchorsComplete: true,
    semanticAssessmentComplete: false, editions: 4, units: 2078,
    editionDeltasPending: 1520, unassessedContracts: 2078, pendingTests: 2078,
  });
  const result = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).sourceAnchorsComplete, true);
});

test('rejects missing source rows, changed hashes, owner gaps and false completion', () => {
  const missing = snapshot();
  missing.units.pop();
  assert.throws(() => validateSourceIndex(missing), /Source projection digest mismatch/);

  const changedSource = snapshot();
  changedSource.units[0].contentSha256 = '0'.repeat(64);
  assert.throws(() => validateSourceIndex(changedSource), /Source projection digest mismatch/);

  const unowned = snapshot();
  unowned.units[0].ownerPackageId = '';
  assert.throws(() => validateSourceIndex(unowned), /Unclassified contract responsibility/);

  const unplanned = snapshot();
  unplanned.units[0].pendingTestId = '';
  assert.throws(() => validateSourceIndex(unplanned), /Missing unique test assignment/);

  const falseClaim = snapshot();
  falseClaim.semanticAssessmentComplete = true;
  assert.throws(() => validateSourceIndex(falseClaim), /Mechanical extraction cannot claim semantic review/);

  const wrongDelta = snapshot();
  wrongDelta.units[0].editionDelta = 'unchanged-text';
  wrongDelta.units[0].deltaAssessment = 'not-needed';
  assert.throws(() => validateSourceIndex(wrongDelta), /Incorrect edition delta classification/);
});
