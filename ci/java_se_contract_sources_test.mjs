import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import {
  JAVA_SE_MODULES, correctDocumentPath, decodeHtml, documentLinks, externalSpecifications,
  ownerFor, parseSourceRecords, serializedForms, validateLedger,
} from './java_se_contract_sources.mjs';

const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const base = 'https://docs.oracle.com/en/java/javase/25/docs/api/';

test('documentation dependencies resolve docRoot, quoted attributes, fragments and @spec', () => {
  const text = '<a href="{@docRoot}/java.base/java/lang/doc-files/example.html#contract">x</a> ' +
    "<a href='../doc-files/image.html?a=1&amp;b=2'>x</a><img src=plot.png>" +
    '<a href="#local">local</a><a href="mailto:test@example.org">contact</a>\n' +
    '@spec https://example.org/spec/v1 Specification';
  assert.deepEqual(documentLinks(text, `${base}java.base/java/lang/Foo.html`, 25), [
    `${base}java.base/java/doc-files/image.html?a=1&b=2`,
    `${base}java.base/java/lang/doc-files/example.html#contract`,
    `${base}java.base/java/lang/plot.png`,
    'https://example.org/spec/v1',
  ].sort());
  assert.equal(decodeHtml('&#65;&#x42;&#X43;&lt;&quot;&amp;'), 'ABC<"&');
  assert.deepEqual(documentLinks('<a href="ftp://example.org/doc">legacy specification</a>', base, 25), ['ftp://example.org/doc']);
  assert.throws(() => documentLinks('<a href="gopher://example.org/doc">x</a>', base, 25), /protocol/);
});

function sourceRows() {
  const comment = 'Public module contract.';
  return JAVA_SE_MODULES.map(module => ['doc', module, `${module}/module-info.java`, 'module', module,
    '0', digest(comment), Buffer.from(comment).toString('base64'), 'final'].join('\t'));
}

test('public source extraction retains nested types, preview state and complete source hashes', () => {
  const rows = sourceRows();
  const comment = '<a href="doc-files/reference.html">contract</a>';
  rows.push(['doc', 'java.base', 'java.base/java/lang/Foo.java', 'member', 'java.lang.Foo.Nested#method',
    '123', digest(comment), Buffer.from(comment).toString('base64'), 'preview'].join('\t'));
  const parsed = parseSourceRecords(`${rows.sort().join('\n')}\n`, 25);
  const member = parsed.docs.find(doc => doc.kind === 'member');
  assert.equal(member.specification, `${base}java.base/java/lang/Foo.Nested.html`);
  assert.equal(member.featureStatus, 'preview');
  assert.equal(member.position, 123);
  assert.equal(member.sha256, digest(comment));
  assert.deepEqual(member.links, [`${base}java.base/java/lang/doc-files/reference.html`]);
});

test('source extraction rejects missing modules, changed comments and unclassified preview state', () => {
  const rows = sourceRows().sort();
  assert.throws(() => parseSourceRecords(`${rows.slice(1).join('\n')}\n`, 21), /22 Java SE modules/);
  assert.throws(() => parseSourceRecords(`${rows.join('\n')}\n${rows[0]}\n`, 21), /sorted and unique/);
  assert.throws(() => parseSourceRecords(`${rows.join('\n').replace(/final/, 'unknown')}\n`, 21), /feature status/);
  assert.throws(() => parseSourceRecords(`${rows.join('\n').replace(digest('Public module contract.'), '0'.repeat(64))}\n`, 21), /digest mismatch/);
});

test('serialized forms retain private fields and separate JDK module forms', () => {
  const html = '<main><h2>Package <a href="java.base/java/util/package-summary.html">java.util</a></h2>' +
    '<section class="serialized-class-details" id="java.util.Example"><h5>privateField</h5></section>' +
    '<h2>Package <a href="jdk.example/jdk/example/package-summary.html">jdk.example</a></h2>' +
    '<section class="serialized-class-details" id="jdk.example.Example">JDK form</section></main>';
  const forms = serializedForms(html, 25);
  assert.deepEqual(forms.map(item => item.module), ['java.base', 'jdk.example']);
  assert.equal(forms[0].specification, `${base}serialized-form.html#java.util.Example`);
  assert.match(forms[0].sha256, /^[a-f0-9]{64}$/);
  assert.throws(() => serializedForms('<section class="serialized-class-details" id="Example"></section>', 25), /module context/);
  assert.throws(() => serializedForms(html.replace('id="java.util.Example"', 'data-id="java.util.Example"'), 25), /unmapped serialized/);
});

test('external specifications preserve the actual Java SE and JDK referring APIs', () => {
  const html = '<div class="col-first even-row-color external-specs external-specs-tab1"><a href="https://example.org/spec/v1">Spec</a></div>' +
    '<div class="col-last even-row-color external-specs external-specs-tab1"><ul>' +
    '<li><a href="java.base/java/lang/Foo.html#SomeSpec">Foo</a></li>' +
    '<li><a href="jdk.compiler/com/sun/Foo.html#SomeSpec">JDK</a></li></ul></div>';
  const rows = externalSpecifications(html, 25);
  assert.equal(rows[0].specification, 'https://example.org/spec/v1');
  assert.deepEqual(rows[0].referringApis.map(item => item.module), ['java.base', 'jdk.compiler']);
  assert.equal(rows[0].referringApis[0].identity, 'java.lang.Foo');
  assert.throws(() => externalSpecifications(html.replace(/<ul>[\s\S]*?<\/ul>/, ''), 25), /citing APIs/);
  assert.throws(() => externalSpecifications(html.replace('java.base/java/lang', 'unknown.module/java/lang'), 25), /unclassified/);
});

test('every module receives an explicit planning owner and unknown modules fail', () => {
  for (const module of JAVA_SE_MODULES) assert.match(ownerFor(module), /^(?:JVM|LIB|TOOL)-\d{3}$/);
  assert.equal(ownerFor('java.base', 'java.util.ServiceLoader'), 'JVM-011');
  assert.equal(ownerFor('java.base', 'java.lang.foreign.MemorySegment'), 'LIB-010');
  assert.equal(ownerFor('java.base', 'java.lang.foreign'), 'LIB-010');
  assert.equal(ownerFor('java.compiler', 'javax.tools.JavaCompiler'), 'LIB-008');
  assert.equal(ownerFor('java.scripting', 'javax.script.ScriptEngineFactory'), 'LIB-008');
  assert.equal(ownerFor('jdk.compiler', 'com.sun.source.util.JavacTask'), 'TOOL-001');
  assert.throws(() => ownerFor('unknown.module'), /unclassified owner/);
});

test('an upstream broken relative link has one explicit correction preserving fragment and provenance', () => {
  const original = `${base}java.base/java/net/spi/doc-files/net-properties.html#Ipv4IPv6`;
  const corrected = correctDocumentPath(original, 25);
  assert.equal(corrected.originalUrl, original);
  assert.equal(corrected.url, `${base}java.base/java/net/doc-files/net-properties.html#Ipv4IPv6`);
  assert.match(corrected.reason, /of\(int\)/);
  assert.deepEqual(correctDocumentPath(`${base}java.base/java/net/spi/doc-files/other.html`, 25), {
    url: `${base}java.base/java/net/spi/doc-files/other.html`,
  });
});

function ledgerFixture() {
  return { schemaVersion: 1, inventoryState: 'source-contracts-classified', conformanceClaim: false,
    releases: [21, 25].map(release => ({ release, units: [
      ['service-loader-contract', 'target-contract'], ['serialized-form', 'target-contract'],
      ['doc-file', 'target-contract'], ['provider-identity', 'jdk-implementation-evidence'],
      ['service-contract', 'target-contract'],
    ].map(([kind, applicability]) => {
      const required = applicability === 'target-contract';
      return { id: `${release}-${kind}`, kind, applicability, owners: ['LIB-008'],
        specification: `${base}java.base/${kind === 'service-contract' ? 'java/lang/System.LoggerFinder.html' : 'module-summary.html'}`, origins: ['source'], scope: 'Full contract',
        sourceSha256: '0'.repeat(64), implementationState: required ? 'unassessed' : 'not-applicable',
        tests: { planId: `${release}-${kind}-CONTRACT`, state: required ? 'planned' : 'not-applicable',
          requiredHosts: required ? ['ubuntu-node24', 'chromium'] : [] } };
    }) })) };
}

test('ledger validation requires source evidence, pending tests and implementation-only provider identities', () => {
  assert.deepEqual(validateLedger(ledgerFixture()), { units: 10 });
  const duplicate = ledgerFixture(); duplicate.releases[0].units.push(duplicate.releases[0].units[0]);
  assert.throws(() => validateLedger(duplicate), /duplicate/);
  const missing = ledgerFixture(); delete missing.releases[0].units[0].sourceSha256;
  assert.throws(() => validateLedger(missing), /captured source digest|"string" type/);
  const passed = ledgerFixture(); passed.releases[0].units[0].tests.state = 'passed';
  assert.throws(() => validateLedger(passed), /planned/);
  const provider = ledgerFixture(); provider.releases[0].units[3].applicability = 'target-contract';
  assert.throws(() => validateLedger(provider), /kind or applicability/);
  const nested = ledgerFixture(); nested.releases[0].units[4].specification = `${base}java.base/module-summary.html`;
  assert.throws(() => validateLedger(nested), /nested System.LoggerFinder/);
});
