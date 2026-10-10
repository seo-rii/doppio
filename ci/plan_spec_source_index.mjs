import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SNAPSHOT_URL = new URL('./plan_spec_source_index.json', import.meta.url);
const EDITIONS = [
  { spec: 'JLS', release: 21, chapters: 19 },
  { spec: 'JLS', release: 25, chapters: 19 },
  { spec: 'JVMS', release: 21, chapters: 7 },
  { spec: 'JVMS', release: 25, chapters: 7 },
];
const PLANS = {
  'TP-NON-NORMATIVE-ATTESTATION': 'Record that this history, example, feedback or reference-navigation span adds no independent behavioral requirement; cited normative sections remain separately indexed.',
  'TP-JAVAC-DIAGNOSTICS': 'Use the pinned external javac 21/25 to compile accepted and rejected source forms; record diagnostics by required outcome, and retain emitted class hashes.',
  'TP-COMPILE-AND-RUN': 'Compile positive/negative source forms with the pinned external javac, then compare specified behavior of its unchanged output on native Java, Node and Chromium.',
  'TP-VM-BEHAVIOR': 'Create valid and negative class/runtime fixtures, check specified values/errors/side effects against the native oracle and the text on Node and Chromium; do not demand unspecified diagnostics.',
  'TP-CLASS-FORMAT': 'Use genuine javac 21/25 output plus separately labeled malformed class controls; check acceptance and specified format/verification errors on Node and Chromium.',
  'TP-LINKAGE': 'Use separately compiled/evolved classes and module boundaries; test specified resolution, initialization and error caching on Node and Chromium.',
  'TP-OPCODE': 'Exercise the instruction with boundary values, stack/local effects and specified failures in genuine or explicitly generated class files on Node and Chromium.',
  'TP-OPCODE-TABLE': 'Verify the JVMS opcode-byte-to-mnemonic table against decoder dispatch and the corresponding chapter 6 instruction contracts, including reserved values.',
  'TP-MEMORY-MODEL': 'Use litmus tests for required/forbidden outcomes, monitor and ordering invariants; never require one nondeterministic schedule or a fixed timing.',
  'TP-BINARY-COMPAT': 'Compile caller and library separately, evolve only the library, retain caller bytes and compare specified linkage/behavior on native Java, Node and Chromium.',
  'TP-MODULE-BOUNDARY': 'Compile module declarations/imports with pinned javac, then test runtime resolution, readability, exports, opens and services with positive and negative cases on each host.',
  'TP-FINAL-ONLY-BOUNDARY': 'Record final versus preview scope for this edition; retain disabled-preview admission/diagnostic controls without claiming preview execution.',
  'TP-EXCLUSION-AUDIT': 'Record the exact preview/incubator/JDK-specific feature and edition excluded from the final-only profile; do not count it as a final Java SE success.',
};
// Replacing the source snapshot requires an explicit code review of this pin.
const PINNED_SOURCE_INDEX_SHA256 = '03e96e459ab34e1f5c05bfd3ddc8533282ad8787a9ef56dbd1b1bf2ede21a5a6';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const editionId = (spec, release) => `${spec}-${release}`;
const sourceRoot = (spec, release) => `https://docs.oracle.com/javase/specs/${spec.toLowerCase()}/se${release}/html/`;

function requirePlainObject(value, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
}

function decodeLabel(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ').trim().replace(/^\d+(?:\.\d+)*\.\s*/, '');
}

export function parseOfficialToc(html, spec) {
  const slug = spec.toLowerCase();
  assert.ok(spec === 'JLS' || spec === 'JVMS', `Unknown specification ${spec}`);
  const start = html.indexOf('<div class="toc">');
  assert.ok(start >= 0, `Missing ${spec} table of contents`);
  const ends = ['<div class="list-of-examples">', '<div class="navfooter">']
    .map((marker) => html.indexOf(marker, start)).filter((position) => position > start);
  assert.ok(ends.length > 0, `Unbounded ${spec} table of contents`);
  const toc = html.slice(start, Math.min(...ends));
  const link = new RegExp(`href="${slug}-([0-9]+)\\.html(?:#([^"]+))?"[^>]*>([\\s\\S]*?)<\\/a>`, 'g');
  const units = [...toc.matchAll(link)].map((match) => ({
    chapter: Number(match[1]),
    anchor: match[2] || `${slug}-${match[1]}`,
    title: decodeLabel(match[3]),
    kind: match[2] ? 'section' : 'chapter',
  }));
  assert.ok(units.length > 0, `Empty ${spec} table of contents`);
  const seen = new Set();
  for (const unit of units) {
    assert.match(unit.anchor, new RegExp(`^${slug}-[0-9]+(?:[.][A-Za-z0-9_<>.-]+)*$`));
    assert.ok(unit.anchor.startsWith(`${slug}-${unit.chapter}`), `Anchor/chapter mismatch ${unit.anchor}`);
    assert.ok(unit.title, `Missing title for ${unit.anchor}`);
    assert.ok(!seen.has(unit.anchor), `Duplicate TOC anchor ${unit.anchor}`);
    seen.add(unit.anchor);
  }
  return { tocSha256: sha256(toc), units };
}

export function hashChapterSpans(pageHtml, chapterUnits) {
  const navStart = pageHtml.indexOf('<div class="navfooter">');
  assert.ok(navStart >= 0, 'Chapter page lacks navfooter boundary');
  const markers = chapterUnits.map((unit) => {
    const nameMarker = `<a name="${unit.anchor}"></a>`;
    const idMarker = `id="${unit.anchor}"`;
    let position = pageHtml.indexOf(nameMarker);
    if (position < 0) position = pageHtml.indexOf(idMarker);
    assert.ok(position >= 0 && position < navStart, `Missing chapter anchor ${unit.anchor}`);
    return position;
  });
  assert.equal(chapterUnits[0]?.kind, 'chapter', 'Chapter preamble must be indexed');
  for (let index = 1; index < markers.length; index++) {
    assert.ok(markers[index] > markers[index - 1], `TOC/page anchor order mismatch at ${chapterUnits[index].anchor}`);
  }
  return chapterUnits.map((unit, index) => ({
    ...unit,
    contentSha256: sha256(pageHtml.slice(markers[index], markers[index + 1] ?? navStart)),
  }));
}

function primaryOwner(spec, chapter, anchor) {
  if (spec === 'JVMS') {
    if (chapter === 4 && anchor === 'jvms-4.1') return 'JVM-001';
    if (chapter === 5 && (anchor.startsWith('jvms-5.3.6') || anchor.startsWith('jvms-5.4.4'))) return 'JVM-011';
    return 'JVM-002';
  }
  if (chapter === 7) return 'JVM-011';
  if (chapter === 8 && anchor.startsWith('jls-8.10')) return 'JVM-006';
  if (chapter === 8 && (anchor.startsWith('jls-8.1.1.2') || anchor.startsWith('jls-8.1.6'))) return 'JVM-007';
  if (chapter === 9 && (anchor.startsWith('jls-9.1.1.4') || anchor.startsWith('jls-9.1.4'))) return 'JVM-007';
  if (chapter === 12 && anchor.startsWith('jls-12.1.4')) return 'JVM-008';
  if (chapter === 14) return anchor.startsWith('jls-14.19') ? 'JVM-010' : 'JVM-008';
  if (chapter === 17) return 'JVM-010';
  if (chapter === 15 && (anchor.startsWith('jls-15.27') || anchor.startsWith('jls-15.28'))) return 'JVM-008';
  return 'JVM-002';
}

export function classifySourceUnit(spec, chapter, anchor, title) {
  let route;
  if (/Current Preview (?:Language|VM) Features/.test(title)) route = 'explicit-exclusion';
  else if (/Preview Features|Restrictions on the Use of Preview Features/.test(title)) route = 'scope-boundary';
  else if (/^(?:Feedback|References|A Bit of History|Example Programs|Format of Examples)$/.test(title)) route = 'informational-navigation';
  else if (spec === 'JLS' && [2, 3, 6, 16, 18, 19].includes(chapter)) route = 'external-javac';
  else if (spec === 'JVMS' && chapter === 3) route = 'external-javac';
  else if (spec === 'JLS' && chapter !== 17) route = 'compiler-and-guest';
  else route = 'guest-runtime';

  const ownerPackageId = ['external-javac', 'informational-navigation', 'explicit-exclusion'].includes(route)
    ? 'PLAN-001' : route === 'scope-boundary' ? (spec === 'JVMS' ? 'JVM-001' : 'PLAN-001')
      : primaryOwner(spec, chapter, anchor);
  let testPlanTemplateId = {
    'external-javac': 'TP-JAVAC-DIAGNOSTICS',
    'informational-navigation': 'TP-NON-NORMATIVE-ATTESTATION',
    'explicit-exclusion': 'TP-EXCLUSION-AUDIT',
    'scope-boundary': 'TP-FINAL-ONLY-BOUNDARY',
    'compiler-and-guest': 'TP-COMPILE-AND-RUN',
    'guest-runtime': 'TP-VM-BEHAVIOR',
  }[route];
  if (route === 'guest-runtime' || route === 'compiler-and-guest') {
    if (spec === 'JVMS' && chapter === 7) testPlanTemplateId = 'TP-OPCODE-TABLE';
    else if (spec === 'JVMS' && chapter === 4) testPlanTemplateId = 'TP-CLASS-FORMAT';
    else if (spec === 'JVMS' && chapter === 5) testPlanTemplateId = 'TP-LINKAGE';
    else if (spec === 'JVMS' && chapter === 6) testPlanTemplateId = 'TP-OPCODE';
    else if (spec === 'JLS' && chapter === 17) testPlanTemplateId = 'TP-MEMORY-MODEL';
    else if (spec === 'JLS' && chapter === 13) testPlanTemplateId = 'TP-BINARY-COMPAT';
    else if (spec === 'JLS' && chapter === 7) testPlanTemplateId = 'TP-MODULE-BOUNDARY';
  }
  assert.ok(testPlanTemplateId && PLANS[testPlanTemplateId], `Unplanned source unit ${anchor}`);
  const applicability = {
    'external-javac': 'external-compiler-contract',
    'informational-navigation': 'non-normative-navigation',
    'explicit-exclusion': 'excluded-preview-opt-in',
    'scope-boundary': 'final-only-preview-policy',
    'compiler-and-guest': 'external-compiler-and-guest-contract',
    'guest-runtime': 'guest-runtime-contract',
  }[route];
  const applicabilityRationale = {
    'external-javac': 'Pinned external javac owns source acceptance and diagnostics; hosted modern javac is deferred.',
    'informational-navigation': 'This span is history, an example, feedback or reference navigation; cited normative guarantees remain in their indexed source units.',
    'explicit-exclusion': 'This edition-specific preview feature is opt-in and outside the approved final-only profile.',
    'scope-boundary': 'Preview semantics are excluded, but final-only enablement and disabled-preview admission rules still apply.',
    'compiler-and-guest': 'External javac owns source acceptance; the guest owns specified behavior of unchanged emitted classes.',
    'guest-runtime': 'The guest owns the final-profile class, instruction or runtime contract described by this source span.',
  }[route];
  return { route, applicability, applicabilityRationale, ownerPackageId, assessmentStatus: 'unassessed', testPlanTemplateId };
}

function markEditionDeltas(units) {
  const bySourceAnchor = new Map();
  for (const unit of units) {
    const key = `${unit.spec}:${unit.anchor}`;
    const pair = bySourceAnchor.get(key) || {};
    pair[unit.release] = unit;
    bySourceAnchor.set(key, pair);
  }
  for (const pair of bySourceAnchor.values()) {
    for (const release of [21, 25]) {
      const unit = pair[release];
      if (!unit) continue;
      const other = pair[release === 21 ? 25 : 21];
      unit.editionDelta = !other ? (release === 25 ? 'added-in-25' : 'removed-after-21')
        : unit.contentSha256 === other.contentSha256 ? 'unchanged-text' : 'changed-text';
      unit.deltaAssessment = unit.editionDelta === 'unchanged-text' ? 'not-needed' : 'pending-review';
    }
  }
}

function sourceProjection(snapshot) {
  return {
    editions: snapshot.editions.map(({ id, tocSha256, chapters }) => ({ id, tocSha256, chapters })),
    units: snapshot.units.map(({ id, spec, release, chapter, anchor, title, kind, contentSha256 }) => ({
      id, spec, release, chapter, anchor, title, kind, contentSha256,
    })),
  };
}

export function sourceIndexDigest(snapshot) {
  return sha256(JSON.stringify(sourceProjection(snapshot)));
}

export function buildSourceIndex(sources) {
  const editions = [];
  const units = [];
  for (const { spec, release, chapters: chapterCount } of EDITIONS) {
    const id = editionId(spec, release);
    const root = sourceRoot(spec, release);
    const tocHtml = sources[`${id}:index`];
    assert.equal(typeof tocHtml, 'string', `Missing ${id} TOC HTML`);
    const toc = parseOfficialToc(tocHtml, spec);
    const chapterMetadata = [];
    for (let chapter = 1; chapter <= chapterCount; chapter++) {
      const pageHtml = sources[`${id}:${chapter}`];
      assert.equal(typeof pageHtml, 'string', `Missing ${id} chapter ${chapter} HTML`);
      const chapterUnits = toc.units.filter((unit) => unit.chapter === chapter);
      assert.equal(chapterUnits.filter((unit) => unit.kind === 'chapter').length, 1, `Missing ${id} chapter ${chapter} root`);
      assert.equal(chapterUnits[0].anchor, `${spec.toLowerCase()}-${chapter}`, `Wrong ${id} chapter ${chapter} root`);
      chapterMetadata.push({ chapter, url: `${root}${spec.toLowerCase()}-${chapter}.html`, sha256: sha256(pageHtml) });
      for (const unit of hashChapterSpans(pageHtml, chapterUnits)) {
        const unitId = `${id}:${unit.anchor}`;
        units.push({
          id: unitId,
          spec, release, chapter, anchor: unit.anchor,
          url: `${root}${spec.toLowerCase()}-${chapter}.html#${unit.anchor}`,
          title: unit.title, kind: unit.kind, contentSha256: unit.contentSha256,
          ...classifySourceUnit(spec, chapter, unit.anchor, unit.title),
          pendingTestId: `TEST-${unitId}`,
        });
      }
    }
    assert.equal(toc.units.length, units.filter((unit) => unit.spec === spec && unit.release === release).length, `Unassigned ${id} TOC anchors`);
    editions.push({ id, spec, release, contentsUrl: `${root}index.html`, tocSha256: toc.tocSha256, chapters: chapterMetadata });
  }
  markEditionDeltas(units);
  const snapshot = {
    schemaVersion: 1,
    profile: 'java-se-21-25-final',
    contractScope: 'Each unit covers its heading and direct source text until the next indexed anchor in the same chapter; chapter roots cover unheaded preambles. Nested units cover their own spans. Non-TOC anchors remain inside the containing span.',
    sourceAnchorsComplete: true,
    semanticAssessmentComplete: false,
    sourceIndexSha256: '',
    testPlanTemplates: PLANS,
    editions,
    units,
  };
  snapshot.sourceIndexSha256 = sourceIndexDigest(snapshot);
  return snapshot;
}

export function validateSourceIndex(snapshot, { requirePinnedDigest = true } = {}) {
  requirePlainObject(snapshot, 'source index');
  assert.equal(snapshot.schemaVersion, 1, 'Unknown source index schema');
  assert.equal(snapshot.profile, 'java-se-21-25-final');
  assert.equal(snapshot.sourceAnchorsComplete, true, 'Source anchors must be complete');
  assert.equal(snapshot.semanticAssessmentComplete, false, 'Mechanical extraction cannot claim semantic review');
  assert.ok(snapshot.contractScope.includes('chapter roots'), 'Missing preamble containment rule');
  assert.deepEqual(snapshot.testPlanTemplates, PLANS, 'Test-plan templates changed without review');
  assert.equal(snapshot.sourceIndexSha256, sourceIndexDigest(snapshot), 'Source projection digest mismatch');
  if (requirePinnedDigest) assert.equal(snapshot.sourceIndexSha256, PINNED_SOURCE_INDEX_SHA256, 'Source snapshot differs from reviewed pin');
  assert.ok(Array.isArray(snapshot.editions) && snapshot.editions.length === EDITIONS.length, 'Missing source edition');
  assert.ok(Array.isArray(snapshot.units), 'Missing source units');
  const seenUnits = new Set();
  const seenTests = new Set();
  for (let editionIndex = 0; editionIndex < EDITIONS.length; editionIndex++) {
    const expected = EDITIONS[editionIndex];
    const edition = snapshot.editions[editionIndex];
    const id = editionId(expected.spec, expected.release);
    assert.equal(edition.id, id, 'Source edition order/ID changed');
    assert.equal(edition.spec, expected.spec);
    assert.equal(edition.release, expected.release);
    assert.equal(edition.contentsUrl, `${sourceRoot(expected.spec, expected.release)}index.html`);
    assert.match(edition.tocSha256, /^[0-9a-f]{64}$/);
    assert.ok(Array.isArray(edition.chapters) && edition.chapters.length === expected.chapters, `Missing ${id} chapter page`);
    for (let chapter = 1; chapter <= expected.chapters; chapter++) {
      const page = edition.chapters[chapter - 1];
      assert.equal(page.chapter, chapter);
      assert.equal(page.url, `${sourceRoot(expected.spec, expected.release)}${expected.spec.toLowerCase()}-${chapter}.html`);
      assert.match(page.sha256, /^[0-9a-f]{64}$/);
      const rootAnchor = `${expected.spec.toLowerCase()}-${chapter}`;
      assert.ok(snapshot.units.some((unit) => unit.spec === expected.spec && unit.release === expected.release && unit.anchor === rootAnchor), `Missing ${id} chapter ${chapter} preamble`);
    }
  }
  for (const unit of snapshot.units) {
    const id = `${editionId(unit.spec, unit.release)}:${unit.anchor}`;
    assert.equal(unit.id, id, 'Unstable source unit ID');
    assert.ok(!seenUnits.has(id), `Duplicate source unit ${id}`);
    seenUnits.add(id);
    assert.ok(EDITIONS.some((edition) => edition.spec === unit.spec && edition.release === unit.release && unit.chapter >= 1 && unit.chapter <= edition.chapters), `Unknown unit edition/chapter ${id}`);
    assert.equal(unit.url, `${sourceRoot(unit.spec, unit.release)}${unit.spec.toLowerCase()}-${unit.chapter}.html#${unit.anchor}`);
    assert.match(unit.contentSha256, /^[0-9a-f]{64}$/);
    assert.ok(unit.title && (unit.kind === 'section' || unit.kind === 'chapter'), `Unclassified source kind ${id}`);
    assert.deepEqual(
      { route: unit.route, applicability: unit.applicability, applicabilityRationale: unit.applicabilityRationale,
        ownerPackageId: unit.ownerPackageId, assessmentStatus: unit.assessmentStatus, testPlanTemplateId: unit.testPlanTemplateId },
      classifySourceUnit(unit.spec, unit.chapter, unit.anchor, unit.title),
      `Unclassified contract responsibility ${id}`,
    );
    assert.equal(unit.pendingTestId, `TEST-${id}`, `Missing unique test assignment ${id}`);
    assert.ok(!seenTests.has(unit.pendingTestId), `Duplicate test assignment ${id}`);
    seenTests.add(unit.pendingTestId);
    assert.ok(['unchanged-text', 'changed-text', 'added-in-25', 'removed-after-21'].includes(unit.editionDelta), `Missing edition delta ${id}`);
    assert.equal(unit.deltaAssessment, unit.editionDelta === 'unchanged-text' ? 'not-needed' : 'pending-review', `Missing delta assessment ${id}`);
  }
  const copies = structuredClone(snapshot.units);
  markEditionDeltas(copies);
  assert.deepEqual(snapshot.units.map(({ id, editionDelta, deltaAssessment }) => ({ id, editionDelta, deltaAssessment })),
    copies.map(({ id, editionDelta, deltaAssessment }) => ({ id, editionDelta, deltaAssessment })), 'Incorrect edition delta classification');
  return {
    profile: snapshot.profile,
    sourceAnchorsComplete: true,
    semanticAssessmentComplete: false,
    editions: snapshot.editions.length,
    units: snapshot.units.length,
    editionDeltasPending: snapshot.units.filter((unit) => unit.deltaAssessment === 'pending-review').length,
    unassessedContracts: snapshot.units.filter((unit) => unit.assessmentStatus === 'unassessed').length,
    pendingTests: seenTests.size,
  };
}

async function fetchOfficialHtml(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
}

async function officialSources() {
  const sources = {};
  const requests = EDITIONS.flatMap(({ spec, release, chapters }) => {
    const id = editionId(spec, release);
    const root = sourceRoot(spec, release);
    return [[`${id}:index`, `${root}index.html`],
      ...Array.from({ length: chapters }, (_, index) => [`${id}:${index + 1}`, `${root}${spec.toLowerCase()}-${index + 1}.html`])];
  });
  let next = 0;
  async function worker() {
    while (next < requests.length) {
      const [key, url] = requests[next++];
      sources[key] = await fetchOfficialHtml(url);
    }
  }
  await Promise.all(Array.from({ length: 6 }, () => worker()));
  return sources;
}

async function main() {
  const args = process.argv.slice(2);
  assert.equal(args.length, 1, 'Use --check, --write, or --verify-official');
  if (args[0] === '--write') {
    assert.ok(!fs.existsSync(SNAPSHOT_URL), 'Refusing to overwrite existing source index');
    const snapshot = buildSourceIndex(await officialSources());
    validateSourceIndex(snapshot, { requirePinnedDigest: false });
    const { units, ...header } = snapshot;
    const headerJson = JSON.stringify(header, null, 2);
    const lines = units.map((unit) => `    ${JSON.stringify(unit)}`);
    const output = `${headerJson.slice(0, -2)},\n  "units": [\n${lines.join(',\n')}\n  ]\n}\n`;
    fs.writeFileSync(SNAPSHOT_URL, output, { flag: 'wx', mode: 0o644 });
    process.stdout.write(`${JSON.stringify({ sourceIndexSha256: snapshot.sourceIndexSha256, units: snapshot.units.length })}\n`);
    return;
  }
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_URL, 'utf8'));
  const summary = validateSourceIndex(snapshot);
  if (args[0] === '--verify-official') {
    const current = buildSourceIndex(await officialSources());
    assert.deepEqual(sourceProjection(current), sourceProjection(snapshot), 'Official JLS/JVMS source differs from pinned snapshot');
  } else assert.equal(args[0], '--check', 'Use --check, --write, or --verify-official');
  process.stdout.write(`${JSON.stringify(summary)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
