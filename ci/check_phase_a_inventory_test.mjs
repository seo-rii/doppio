import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { compareEditions, linkSeedRequirements, validateApiCatalogue, validatePinnedComponent } from './check_phase_a_inventory.mjs';

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function fixture() {
  const units = [{ schemaVersion: 1, id: 'TYPE:java.base:java.lang.String', edition: 21,
    kind: 'type', module: 'java.base', declaration: ['java.lang.String'],
    ownerPackage: 'LIB-008', classification: 'Java-SE-exported-API',
    specificationRef: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html',
    sourceLocator: null, contractScope: 'Entire type contract including normative documentation.',
    implementationState: 'unassessed', verificationState: 'pending-specification-derived-test',
    testPlanId: 'PLAN-001/type/String', testPlanDescription: 'Test specified discovery, access and reflection on Node and Chromium.' }];
  const text = `${units.map(unit => JSON.stringify(unit)).join('\n')}\n`;
  return { units, text, edition: { feature: 21, catalogueSha256: sha256(text), catalogueRecords: 1, records: 1,
    projection: { stableIdSha256: sha256(`${units[0].id}\n`), byOwner: { 'LIB-008': 1 }, byClassification: { 'Java-SE-exported-API': 1 } } } };
}

test('requires a reviewed component baseline and current generator/input hashes', () => {
  const component = { schemaVersion: 1, helperSha256: sha256('helper'), units: 22 };
  validatePinnedComponent(component, structuredClone(component), { helperSha256: sha256('helper') });
  assert.throws(() => validatePinnedComponent({ ...component, units: 21 }, component,
    { helperSha256: sha256('helper') }), /reviewed baseline/);
  assert.throws(() => validatePinnedComponent(component, component,
    { helperSha256: sha256('changed helper') }), /stale inputs/);
  const runner = { ...component, runnerSha256: sha256('runner') };
  assert.throws(() => validatePinnedComponent(runner, runner,
    { helperSha256: component.helperSha256, runnerSha256: sha256('changed runner') }), /stale inputs/);
  assert.throws(() => validatePinnedComponent(component, component, {}), /input hashes are required/);
});

test('validates all full-contract catalogue fields and refuses partial, duplicate or stale records', () => {
  const valid = fixture();
  const result = validateApiCatalogue(valid.text, valid.edition);
  assert.equal(result.refs.get(valid.units[0].specificationRef).unitId, valid.units[0].id);
  assert.equal(result.declarations.size, 1);
  assert.throws(() => validateApiCatalogue(`${valid.text}\n`, valid.edition), /catalogue digest/);
  for (const [mutate, message] of [
    [unit => { unit.ownerPackage = 'LIB-999'; }, /unknown planning owner/],
    [unit => { unit.classification = 'unknown'; }, /unclassified/],
    [unit => { delete unit.contractScope; }, /full-contract scope/],
    [unit => { delete unit.testPlanDescription; }, /test plan/],
    [unit => { unit.implementationState = 'passed'; }, /unassessed/],
    [unit => { unit.verificationState = 'passed'; }, /pending-specification/],
    [unit => { unit.edition = 25; }, /Catalogue edition/],
    [unit => { unit.specificationRef = unit.specificationRef.replace('/21/', '/25/'); }, /wrong specification edition/],
    [unit => { unit.kind = 'member'; }, /member locator/],
  ]) {
    const copy = fixture();
    mutate(copy.units[0]);
    const text = `${JSON.stringify(copy.units[0])}\n`;
    copy.edition.catalogueSha256 = sha256(text);
    assert.throws(() => validateApiCatalogue(text, copy.edition), message);
  }
  const duplicate = valid.text + valid.text;
  assert.throws(() => validateApiCatalogue(duplicate, { ...valid.edition, catalogueSha256: sha256(duplicate) }), /duplicate/);
  assert.throws(() => validateApiCatalogue(valid.text, { ...valid.edition, records: 2 }), /raw and projected counts/);
});

test('retains added, removed and changed edition work without treating text differences as semantic proof', () => {
  const changes = compareEditions(new Map([['same', 'a'], ['removed', 'b'], ['changed', 'c']]),
    new Map([['same', 'a'], ['added', 'd'], ['changed', 'e']]), 'source-family');
  assert.deepEqual(changes.map(change => [change.id, change.change]), [
    ['added', 'added-in-25'], ['changed', 'changed-source'], ['removed', 'removed-after-21'],
  ]);
  assert.ok(changes.every(change => change.assessment === 'pending-review' && change.testPlan));
});

test('a bare type page resolves to its type contract regardless of inherited member row order', () => {
  const { units } = fixture();
  const inherited = { ...units[0], id: 'MEMBER:java.base:java.lang.String:notify', kind: 'member',
    sourceLocator: { exposedOn: 'java.lang.String', declarationOwner: 'java.lang.Object', name: 'notify',
      erasedParameters: '', documentedAnchor: false } };
  for (const rows of [[units[0], inherited], [inherited, units[0]]]) {
    const text = `${rows.map(row => JSON.stringify(row)).join('\n')}\n`;
    const edition = { feature: 21, catalogueSha256: sha256(text), catalogueRecords: 2, records: 2,
      projection: { stableIdSha256: sha256(`${rows.map(row => row.id).sort().join('\n')}\n`),
        byOwner: { 'LIB-008': 2 }, byClassification: { 'Java-SE-exported-API': 2 } } };
    assert.equal(validateApiCatalogue(text, edition).refs.get(units[0].specificationRef).unitId, units[0].id);
  }
});

test('every executable seed specification must resolve to a full inventory unit', () => {
  const ref = 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html#indexOf(int,int,int)';
  const manifest = { requirements: [{ id: 'API-INDEXOF', specificationRefs: { 21: ref } }] };
  const unit = { unitId: 'SE21:MEMBER:java.base:java.lang.String#indexOf', release: 21, applicable: true };
  const refs = new Map([[ref, unit]]);
  assert.equal(linkSeedRequirements(manifest, refs)[0].unitId, unit.unitId);
  assert.throws(() => linkSeedRequirements(manifest, new Map()), /source not present/);
  const otherEdition = new Map([[ref.replace('/21/', '/25/'), 'wrong edition']]);
  assert.throws(() => linkSeedRequirements(manifest, otherEdition), /source not present/);
  assert.throws(() => linkSeedRequirements(manifest, new Map([[ref, { ...unit, release: 25 }]])), /edition mismatch/);
  assert.throws(() => linkSeedRequirements(manifest, new Map([[ref, { ...unit, applicable: false }]])), /excluded or informational/);
});

test('shared inherited member anchors retain all source contracts, while a declared member takes precedence', () => {
  const base = fixture().units[0];
  const member = { ...base, kind: 'member', specificationRef: `${base.specificationRef}#clear()`,
    sourceLocator: { exposedOn: 'java.lang.String', declarationOwner: 'Interface', name: 'clear',
      erasedParameters: '', documentedAnchor: true } };
  const records = ['Interface', 'Base'].map(owner => ({ ...member, id: `MEMBER:${owner}`,
    sourceLocator: { ...member.sourceLocator, declarationOwner: owner } }));
  function project(rows) {
    const text = `${rows.map(row => JSON.stringify(row)).join('\n')}\n`;
    return validateApiCatalogue(text, { feature: 21, catalogueSha256: sha256(text),
      catalogueRecords: rows.length, records: rows.length, projection: {
        stableIdSha256: sha256(`${rows.map(row => row.id).sort().join('\n')}\n`),
        byOwner: { 'LIB-008': rows.length }, byClassification: { 'Java-SE-exported-API': rows.length } } })
      .refs.get(member.specificationRef);
  }
  assert.deepEqual(project(records).unitIds, ['MEMBER:Base', 'MEMBER:Interface']);
  const declared = { ...member, id: 'MEMBER:Declared',
    sourceLocator: { ...member.sourceLocator, declarationOwner: 'java.lang.String' } };
  assert.equal(project([...records, declared]).unitId, 'MEMBER:Declared');
  assert.equal(project([declared, ...records]).unitId, 'MEMBER:Declared');
});
