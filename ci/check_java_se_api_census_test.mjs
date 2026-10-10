import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  JAVA_SE_MODULES, summarizeCensus, verifyBaseline,
} from './check_java_se_api_census.mjs';
import {
  projectCensus, stableMemberId,
} from './java_se_api_projection.mjs';
import { reconcileOracleIndexes } from './reconcile_java_se_api_docs.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const rules = JSON.parse(fs.readFileSync(path.join(directory, 'java_se_api_owner_rules.json')));

function syntheticCensus({ omitSmartcard = false, omitType = false } = {}) {
  const rows = JAVA_SE_MODULES.filter((module) =>
    !(omitSmartcard && module === 'java.smartcardio')).map((module) => `module\t${module}\t21`);
  rows.push('exports\tjava.base\tjava.lang\t*');
  rows.push('classFile\tjava.base\tjava.lang.Foo');
  if (!omitType) {
    rows.push('type\tjava.base\tjava.lang.Foo\tCLASS\tPUBLIC\tjava.lang.Foo<T>\tjdk.internal.javac.PreviewFeature');
    rows.push('member\tjava.base\tjava.lang.Foo\tMETHOD\taccept\tjava.lang.Foo\tPUBLIC\t(T,java.util.List<T>)void\tthrows=;default=null\tjdk.internal.javac.PreviewFeature\tjava.lang.Object,java.util.List');
  }
  return `${rows.sort().join('\n')}\n`;
}

function syntheticIndexes() {
  return {
    type: 'typeSearchIndex = [{"p":"java.lang","l":"Foo"}];updateSearchResults();',
    member: 'memberSearchIndex = [{"p":"java.lang","c":"Foo","l":"accept(T, List)","u":"accept(T,java.util.List)"}];updateSearchResults();',
    preview: '<div class="col-summary-item-name even-row-color"><a href="java.base/java/lang/Foo.html">Foo</a></div>' +
      '<div class="col-summary-item-name odd-row-color"><a href="java.base/java/lang/Foo.html#accept(T,java.util.List)">accept</a></div>',
  };
}

test('requires all 22 Java SE modules, including java.smartcardio', () => {
  const summary = summarizeCensus(syntheticCensus());
  assert.equal(summary.modules.length, 22);
  assert.equal(summary.countByKind.type, 1);
  assert.throws(() => summarizeCensus(syntheticCensus({ omitSmartcard: true })), /complete 22-module/);
});

test('fails on missing exported API type, duplicate records and unclassified modules', () => {
  assert.throws(() => summarizeCensus(syntheticCensus({ omitType: true })), /unresolved exported package/);
  const duplicate = `${syntheticCensus()}module\tjava.base\t21\n`;
  assert.throws(() => summarizeCensus(duplicate), /sorted and unique/);
  const unclassified = `${syntheticCensus()}module\tjava.unknown\t21\n`;
  assert.throws(() => summarizeCensus(unclassified), /unclassified module|sorted and unique/);
});

test('matches official member overload and preview index, and preserves exact anchor', () => {
  const census = syntheticCensus();
  const reconciled = reconcileOracleIndexes(census, 21, syntheticIndexes());
  assert.equal(reconciled.summary.documentedTypes, 1);
  assert.equal(reconciled.summary.documentedMembers, 1);
  assert.equal(reconciled.summary.exactMemberMatches, 1);
  assert.equal(reconciled.summary.previewDocumentedTypes, 1);
  assert.equal(reconciled.summary.previewDocumentedMembers, 1);
  const member = census.split('\n').find((row) => row.startsWith('member\t')).split('\t');
  assert.match(reconciled.documentedAnchors.get(stableMemberId(member)), /Foo.html#accept\(T,java.util.List\)$/);
  const badIndexes = syntheticIndexes();
  badIndexes.member = badIndexes.member.replace('accept(T,java.util.List)', 'accept(java.lang.String)');
  assert.throws(() => reconcileOracleIndexes(census, 21, badIndexes), /documented overload absent/);
  const missingPreview = syntheticIndexes();
  missingPreview.preview = missingPreview.preview.replace(/<div class="col-summary-item-name odd-row-color">.*?<\/div>/, '');
  assert.throws(() => reconcileOracleIndexes(census, 21, missingPreview), /preview-list and JDK annotations differ/);
});

test('projects each declaration to stable ID, owner, source, explicit state and test plan', () => {
  const census = syntheticCensus();
  const reconciled = reconcileOracleIndexes(census, 21, syntheticIndexes());
  const records = [];
  const projection = projectCensus(census, 21, rules, JAVA_SE_MODULES, {
    documentedAnchors: reconciled.documentedAnchors,
    onRecord(record) { records.push(record); },
  });
  assert.equal(projection.records, records.length);
  const member = records.find((record) => record.kind === 'member');
  assert.equal(member.ownerPackage, 'LIB-008');
  assert.equal(member.classification, 'preview-excluded-from-final-only-profile');
  assert.equal(member.implementationState, 'unassessed');
  assert.equal(member.verificationState, 'pending-specification-derived-test');
  assert.equal(member.sourceLocator.documentedAnchor, true);
  assert.match(member.specificationRef, /Foo.html#accept\(T,java.util.List\)$/);
  assert.match(member.testPlanDescription, /Node and Chromium/);
});

test('routes the foreign API family to LIB-010 without claiming implementation', () => {
  const rows = syntheticCensus().trimEnd().split('\n');
  rows.push('exports\tjava.base\tjava.lang.foreign\t*');
  rows.push('classFile\tjava.base\tjava.lang.foreign.MemorySegment');
  rows.push('type\tjava.base\tjava.lang.foreign.MemorySegment\tINTERFACE\tPUBLIC\tjava.lang.foreign.MemorySegment\t');
  const census = `${rows.sort().join('\n')}\n`;
  summarizeCensus(census);
  const records = [];
  projectCensus(census, 25, rules, JAVA_SE_MODULES, { onRecord(record) { records.push(record); } });
  const foreign = records.find((record) => record.kind === 'type' &&
    record.declaration[0] === 'java.lang.foreign.MemorySegment');
  assert.equal(foreign.ownerPackage, 'LIB-010');
  assert.equal(foreign.implementationState, 'unassessed');
  assert.match(foreign.specificationRef, /java.base\/java\/lang\/foreign\/MemorySegment.html$/);
});

test('classifies Java 25 reflective-preview visitors and their members by edition', () => {
  const name = 'javax.lang.model.util.AbstractTypeVisitorPreview';
  const rows = syntheticCensus().trimEnd().split('\n');
  rows.push('exports\tjava.compiler\tjavax.lang.model.util\t*');
  rows.push(`classFile\tjava.compiler\t${name}`);
  rows.push(`type\tjava.compiler\t${name}\tCLASS\tPUBLIC\t${name}\t`);
  rows.push(`member\tjava.compiler\t${name}\tMETHOD\tvisit\t${name}\tPUBLIC\t()void\tthrows=;default=null\t\t`);
  const census = `${rows.sort().join('\n')}\n`;
  const projected = (feature) => {
    const records = [];
    projectCensus(census, feature, rules, JAVA_SE_MODULES, {
      onRecord(record) { records.push(record); },
    });
    return records.filter((record) => record.declaration[0] === name);
  };
  const java25 = projected(25).filter((record) => record.kind === 'type' || record.kind === 'member');
  const java21 = projected(21).filter((record) => record.kind === 'type' || record.kind === 'member');
  assert.equal(java25.length, 2);
  assert.ok(java25.every((record) => record.classification === 'preview-excluded-from-final-only-profile'));
  assert.ok(java21.every((record) => record.classification === 'Java-SE-exported-API'));
});

test('baseline refuses a false full-inventory claim', () => {
  const baseline = {
    scope: 'Java SE API structural/source component; not by itself PLAN-001 completion',
    completeJavaSeInventory: false,
  };
  verifyBaseline(baseline, structuredClone(baseline));
  assert.throws(() => verifyBaseline(baseline, { ...baseline, completeJavaSeInventory: true }),
    /must not claim PLAN-001 completion/);
});
