import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { validateSpecGapLedger } from './check_plan_spec_obligations.mjs';
import { validateSourceIndex } from './plan_spec_source_index.mjs';
import { JAVA_SE_MODULES, summarizeCensus, verifyBaseline } from './check_java_se_api_census.mjs';
import { reconcileOracleIndexes } from './reconcile_java_se_api_docs.mjs';
import { parseSourceRecords, validateLedger } from './java_se_contract_sources.mjs';
import { validateManifest } from './run_java_compatibility.mjs';
import { sha256File, treeDigest, validateLock } from './prepare_java_compatibility_toolchains.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const encoded = value => `${JSON.stringify(value)}\n`;
const canonical = url => decodeURIComponent(new URL(url).href);
const owners = new Set(['PLAN-001', 'TOOL-001', 'OUT-OF-SCOPE',
  ...Array.from({ length: 11 }, (_, index) => `JVM-${String(index + 1).padStart(3, '0')}`),
  ...Array.from({ length: 10 }, (_, index) => `LIB-${String(index + 1).padStart(3, '0')}`)]);
const classifications = new Set(['incubator', 'jdk-specific',
  'JDK-image-classfile-not-itself-an-exported-API-declaration',
  'qualified-export-not-public-Java-SE-API', 'Java-SE-module-contract',
  'preview-excluded-from-final-only-profile', 'Java-SE-exported-API']);

function retainRef(refs, url, metadata) {
  const key = canonical(url);
  const prior = refs.get(key);
  if (prior && prior.priority >= 4 && metadata.priority === prior.priority) {
    if (metadata.unitId === prior.unitId) return;
    // A public view can expose both an interface contract and a method from
    // an inaccessible superclass at one Javadoc anchor (e.g. KeySetView).
    // Preserve every such member contract instead of silently choosing one.
    assert.equal(prior.kind, 'member', `Ambiguous primary contract at ${key}`);
    assert.equal(metadata.kind, 'member', `Ambiguous primary contract at ${key}`);
    assert.equal(prior.release, metadata.release, `Mixed source editions at ${key}`);
    const unitIds = [...new Set([...(prior.unitIds || [prior.unitId]),
      ...(metadata.unitIds || [metadata.unitId])])].sort();
    refs.set(key, { ...prior, unitId: unitIds[0], unitIds,
      applicable: prior.applicable && metadata.applicable });
    return;
  }
  if (!prior || metadata.priority > prior.priority) refs.set(key, metadata);
}

export function validatePinnedComponent(actual, expected, currentHashes) {
  assert.deepEqual(actual, expected, 'Generated component must match its reviewed baseline');
  assert.ok(Object.keys(currentHashes).length > 0, 'Current component input hashes are required');
  for (const [field, digest] of Object.entries(currentHashes)) {
    assert.match(digest, /^[a-f0-9]{64}$/, `${field}: current input digest`);
    assert.equal(actual[field], digest, `${field}: generated component has stale inputs`);
  }
}

export function validateApiCatalogue(text, edition) {
  assert.equal(sha256(text), edition.catalogueSha256, 'API catalogue digest');
  assert.ok(text.endsWith('\n'), 'API catalogue must be line terminated');
  const ids = new Set();
  const refs = new Map();
  const declarations = new Map();
  const byOwner = {};
  const byClassification = {};
  // Retain only locators and declaration hashes, not hundreds of thousands of
  // parsed contract objects, while checking the complete projected catalogue.
  for (const line of text.trimEnd().split('\n')) {
    const unit = JSON.parse(line);
    assert.equal(unit.schemaVersion, 1);
    assert.equal(unit.edition, edition.feature, 'Catalogue edition');
    assert.ok(unit.id && !ids.has(unit.id), 'Missing or duplicate API contract ID');
    ids.add(unit.id);
    assert.ok(owners.has(unit.ownerPackage), `${unit.id}: unknown planning owner`);
    assert.ok(classifications.has(unit.classification), `${unit.id}: unclassified API contract`);
    assert.ok(unit.contractScope && unit.testPlanId && unit.testPlanDescription,
      `${unit.id}: missing full-contract scope or concrete test plan`);
    const excludedImage = unit.ownerPackage === 'OUT-OF-SCOPE';
    assert.equal(unit.implementationState, excludedImage ? 'not-applicable' : 'unassessed');
    assert.equal(unit.verificationState, excludedImage ? 'not-applicable' : 'pending-specification-derived-test');
    if (unit.kind !== 'classFile') {
      assert.ok(unit.specificationRef?.startsWith(`https://docs.oracle.com/en/java/javase/${edition.feature}/docs/api/`),
        `${unit.id}: wrong specification edition`);
      const priority = unit.kind === 'member' ? (unit.sourceLocator?.documentedAnchor
        ? (unit.sourceLocator.exposedOn === unit.sourceLocator.declarationOwner ? 6 : 5) : 1)
        : ['type', 'module'].includes(unit.kind) ||
          (unit.kind === 'exports' && unit.specificationRef.endsWith('/package-summary.html')) ? 4 : 1;
      retainRef(refs, unit.specificationRef, { unitId: unit.id, kind: unit.kind, release: unit.edition, priority,
        applicable: ['Java-SE-exported-API', 'Java-SE-module-contract'].includes(unit.classification) });
    }
    if (unit.kind === 'member') {
      assert.ok(unit.sourceLocator?.exposedOn && unit.sourceLocator.declarationOwner && unit.sourceLocator.name,
        `${unit.id}: missing declared/inherited member locator`);
      assert.equal(typeof unit.sourceLocator.erasedParameters, 'string');
      assert.equal(typeof unit.sourceLocator.documentedAnchor, 'boolean');
    }
    byOwner[unit.ownerPackage] = (byOwner[unit.ownerPackage] || 0) + 1;
    byClassification[unit.classification] = (byClassification[unit.classification] || 0) + 1;
    declarations.set(unit.id, sha256(encoded({ declaration: unit.declaration, classification: unit.classification })));
  }
  assert.equal(ids.size, edition.catalogueRecords, 'API catalogue count');
  assert.equal(ids.size, edition.records, 'API raw and projected counts');
  assert.equal(sha256(`${[...ids].sort().join('\n')}\n`), edition.projection.stableIdSha256, 'API stable IDs');
  assert.deepEqual(byOwner, edition.projection.byOwner, 'API owner counts');
  assert.deepEqual(byClassification, edition.projection.byClassification, 'API applicability counts');
  return { refs, declarations };
}

export function compareEditions(before, after, family) {
  const changes = [];
  for (const id of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    if (before.has(id) && after.has(id) && before.get(id) === after.get(id)) continue;
    changes.push({ family, id, change: !before.has(id) ? 'added-in-25'
      : !after.has(id) ? 'removed-after-21' : 'changed-source',
    beforeSha256: before.get(id) || null, afterSha256: after.get(id) || null,
    assessment: 'pending-review',
    testPlan: 'Compare the complete edition-specific source contracts, then derive specified positive, negative and side-effect cases; text changes alone do not establish semantic changes.' });
  }
  return changes;
}

export function linkSeedRequirements(manifest, refs) {
  return manifest.requirements.flatMap(requirement => Object.entries(requirement.specificationRefs)
    .map(([release, ref]) => {
      const unit = refs.get(canonical(ref));
      assert.ok(unit, `${requirement.id} Java ${release}: source not present in the full inventory`);
      assert.equal(unit.release, Number(release), `${requirement.id}: source edition mismatch`);
      assert.equal(unit.applicable, true, `${requirement.id}: excluded or informational source cannot cover a final requirement`);
      return { requirementId: requirement.id, release: Number(release), unitId: unit.unitId,
        relatedUnitIds: (unit.unitIds || []).filter(id => id !== unit.unitId),
        scope: 'selected implemented slice; not evidence for the complete source contract' };
    }));
}

export function checkPhaseAInventory() {
  const read = filename => fs.readFileSync(path.join(root, filename));
  const json = filename => JSON.parse(read(filename));
  const digest = filename => sha256(read(filename));
  const inflated = filename => gunzipSync(read(filename));
  const resolutions = validateSpecGapLedger(json('ci/plan_spec_obligations.json'));
  const spec = json('ci/plan_spec_source_index.json');
  const specification = validateSourceIndex(spec);
  for (const unit of spec.units) assert.ok(owners.has(unit.ownerPackageId), `${unit.id}: unknown specification owner`);
  const refs = new Map(spec.units.map(unit => [canonical(unit.url), {
    unitId: unit.id, release: unit.release, priority: 5,
    applicable: !['non-normative-navigation', 'excluded-preview-opt-in'].includes(unit.applicability),
  }]));
  const toolchainLock = json('ci/java_compatibility_toolchains.lock.json');
  validateLock(toolchainLock);
  const toolchains = toolchainLock.toolchains;
  const toolchainHomes = new Map();
  for (const toolchain of toolchains) {
    const home = path.join(root, 'build/java-compatibility-toolchains',
      `${toolchain.id}-${toolchain.archiveSha256}`, toolchain.archiveRoot);
    assert.equal(treeDigest(home), toolchain.treeSha256, `${toolchain.id}: current toolchain tree changed`);
    toolchainHomes.set(toolchain.feature, home);
  }
  const api = json('build/java-se-api-census/summary.json');
  const apiBaseline = json('ci/java_se_api_census.lock.json');
  verifyBaseline(api, apiBaseline);
  validatePinnedComponent(api, apiBaseline, {
    helperSha256: digest('ci/JavaSeApiCensus.java'),
    runnerSha256: digest('ci/check_java_se_api_census.mjs'),
    projectionSha256: digest('ci/java_se_api_projection.mjs'),
    reconciliationSha256: digest('ci/reconcile_java_se_api_docs.mjs'),
    ownerRulesSha256: digest('ci/java_se_api_owner_rules.json'),
    toolchainLockSha256: digest('ci/java_compatibility_toolchains.lock.json'),
  });
  assert.deepEqual(api.toolchains.map(edition => edition.feature), [21, 25], 'Both API editions are mandatory');
  const apiEditions = [];
  for (const edition of api.toolchains) {
    assert.equal(edition.id, `jdk${edition.feature}`, 'API toolchain identity');
    assert.deepEqual(edition.modules.map(module => module.name), JAVA_SE_MODULES);
    const raw = inflated(`build/java-se-api-census/${edition.id}.tsv.gz`).toString('utf8');
    for (const [field, value] of Object.entries(summarizeCensus(raw))) {
      assert.deepEqual(edition[field], value, `${edition.id}: raw census ${field}`);
    }
    const indexes = Object.fromEntries(['type', 'member', 'preview'].map(kind =>
      [kind, inflated(`build/java-se-api-census/${edition.id}.oracle-${kind}.gz`).toString('utf8')]));
    indexes.reflective = JSON.parse(inflated(`build/java-se-api-census/${edition.id}.oracle-reflective.json.gz`));
    assert.deepEqual(reconcileOracleIndexes(raw, edition.feature, indexes).summary, edition.oracle,
      'Retained official API and preview indexes must reconcile exactly');
    assert.equal(edition.oracle.documentedTypes, edition.countByKind.type, 'Official API type coverage');
    assert.equal(edition.oracle.documentedMembers, edition.oracle.exactMemberMatches, 'Official API overload coverage');
    const catalogue = validateApiCatalogue(inflated(`build/java-se-api-census/${edition.id}.catalogue.jsonl.gz`).toString('utf8'), edition);
    for (const [ref, metadata] of catalogue.refs) retainRef(refs, ref,
      { ...metadata, unitId: `SE${edition.feature}:${metadata.unitId}`,
        unitIds: metadata.unitIds?.map(id => `SE${edition.feature}:${id}`) });
    apiEditions.push(catalogue.declarations);
  }
  const supplementary = json('build/java-se-contract-sources/summary.json');
  validatePinnedComponent(supplementary, json('ci/java_se_contract_sources.lock.json'), {
    helperSha256: digest('ci/JavaSeContractSources.java'),
    generatorSha256: digest('ci/java_se_contract_sources.mjs'),
    toolchainLockSha256: digest('ci/java_compatibility_toolchains.lock.json'),
  });
  const contractBytes = inflated('build/java-se-contract-sources/contracts.json.gz');
  assert.equal(sha256(contractBytes), supplementary.ledgerSha256, 'Supplementary contract ledger digest');
  const contracts = JSON.parse(contractBytes);
  const contractCounts = validateLedger(contracts);
  const proseEditions = [];
  const dependencyEditions = [];
  for (const edition of contracts.releases) {
    const pinned = supplementary.releases.find(entry => entry.release === edition.release);
    assert.ok(pinned, `Missing supplementary edition ${edition.release}`);
    assert.equal(sha256File(path.join(toolchainHomes.get(edition.release), 'lib/src.zip')),
      edition.provenance.sourceArchiveSha256, 'Current pinned source archive digest');
    assert.equal(edition.units.length, pinned.units, 'Supplementary contract count');
    assert.equal(edition.sourceRecordsArtifact, `build/java-se-contract-sources/jdk${edition.release}-source-docs.tsv.gz`);
    const raw = inflated(edition.sourceRecordsArtifact).toString('utf8');
    assert.equal(sha256(raw), edition.sourceRecordsSha256, 'Public source record digest');
    const source = parseSourceRecords(raw, edition.release);
    assert.equal(sha256(encoded(source.docs)), edition.publicDocumentationSha256, 'Complete public documentation digest');
    assert.equal(sha256(encoded(source.sources)), edition.sourceFilesSha256, 'Public source file digest');
    assert.equal(sha256(encoded(source.services)), edition.moduleDescriptorsSha256, 'Module service declaration digest');
    const prose = new Map();
    // Overloads share a source DocTrees identity. Retain all their individual
    // hashes as an ordered-independent family, rather than overwriting one.
    for (const doc of source.docs) {
      const id = `${doc.module}/${doc.source}:${doc.kind}:${doc.identity}`;
      if (!prose.has(id)) prose.set(id, []);
      prose.get(id).push(`${doc.featureStatus}:${doc.sha256}`);
    }
    proseEditions.push(new Map([...prose].map(([id, hashes]) => [id, sha256(encoded(hashes.sort()))])));
    const dependencies = new Map();
    for (const unit of edition.units) {
      for (const owner of unit.owners) assert.ok(owners.has(owner), `${unit.id}: unknown supplementary owner`);
      assert.ok(unit.tests.method, `${unit.id}: missing concrete test plan`);
      retainRef(refs, unit.specification, { unitId: unit.id, release: edition.release, priority: 2,
        applicable: ['target-contract', 'incorporated-by-contract'].includes(unit.applicability) });
      const id = `${unit.kind}:${unit.specification.replace(`/javase/${edition.release}/`, '/javase/EDITION/')}`;
      dependencies.set(id, sha256(encoded({ sourceSha256: unit.sourceSha256 || null,
        applicability: unit.applicability, scope: unit.scope })));
    }
    dependencyEditions.push(dependencies);
  }
  // Captured supplementary bytes are part of the source provenance, not just
  // locators in a summary. Incorporated external references stay dependency
  // records; their applicability is limited by the citing contract.
  for (const document of supplementary.documents) {
    const bytes = inflated(`build/java-se-contract-sources/documents/${sha256(document.url)}.gz`);
    assert.equal(bytes.length, document.bytes, `Captured source size: ${document.url}`);
    assert.equal(sha256(bytes), document.sha256, `Captured source digest: ${document.url}`);
  }
  const seed = json('ci/java_compatibility_manifest.json');
  validateManifest(seed);
  const seedLinks = linkSeedRequirements(seed, refs);
  const editionDeltas = [
    ...compareEditions(...apiEditions, 'api-declaration'),
    ...compareEditions(...proseEditions, 'api-prose-family'),
    ...compareEditions(...dependencyEditions, 'supplementary-contract'),
  ];
  const deltaBytes = encoded(editionDeltas);
  const summary = { schemaVersion: 1, profile: 'java-se-21-25-final',
    inventoryGranularity: 'whole-source-contract', completeJavaSeInventory: true,
    semanticAssessmentComplete: false, fullJavaSeConformance: false,
    resolutions, specification,
    api: api.toolchains.map(edition => ({ release: edition.feature, modules: edition.modules.length,
      types: edition.countByKind.type, memberViews: edition.countByKind.member,
      documentedMembers: edition.oracle.documentedMembers, catalogueRecords: edition.catalogueRecords })),
    supplementary: { ...contractCounts, editions: supplementary.releases.map(edition => ({ release: edition.release,
      units: edition.units, documentationUnits: edition.publicDocumentationUnits })) },
    editionDeltas: { artifact: 'build/phase-a-edition-deltas.json.gz', sha256: sha256(deltaBytes),
      pending: editionDeltas.length, semantics: 'source differences requiring review, not proven semantic changes' },
    seedLinks,
  };
  fs.writeFileSync(path.join(root, summary.editionDeltas.artifact), gzipSync(deltaBytes, { level: 9 }));
  fs.writeFileSync(path.join(root, 'build/phase-a-inventory.json'), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  try {
    assert.equal(process.argv.length, 2, 'Usage: node ci/check_phase_a_inventory.mjs');
    console.log(JSON.stringify(checkPhaseAInventory(), null, 2));
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
