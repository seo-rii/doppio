import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const helper = path.join(root, 'ci/JavaSeContractSources.java');
const lockFile = path.join(root, 'ci/java_se_contract_sources.lock.json');
const output = path.join(root, 'build/java-se-contract-sources');
const toolchainLockFile = path.join(root, 'ci/java_compatibility_toolchains.lock.json');
export const JAVA_SE_MODULES = Object.freeze([
  'java.base', 'java.compiler', 'java.datatransfer', 'java.desktop', 'java.instrument',
  'java.logging', 'java.management', 'java.management.rmi', 'java.naming', 'java.net.http',
  'java.prefs', 'java.rmi', 'java.scripting', 'java.se', 'java.security.jgss',
  'java.security.sasl', 'java.smartcardio', 'java.sql', 'java.sql.rowset',
  'java.transaction.xa', 'java.xml', 'java.xml.crypto',
]);
const modules = new Set(JAVA_SE_MODULES);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const encoded = value => `${JSON.stringify(value)}\n`;
const apiBase = release => `https://docs.oracle.com/en/java/javase/${release}/docs/api/`;
const specBase = release => `https://docs.oracle.com/en/java/javase/${release}/docs/specs/`;
const DOCUMENT_PATH_CORRECTIONS = Object.freeze({
  'java.base/java/net/spi/doc-files/net-properties.html': {
    target: 'java.base/java/net/doc-files/net-properties.html',
    reason: 'InetAddressResolver.LookupPolicy type prose uses a broken relative path; its of(int) contract explicitly references the canonical java/net document through docRoot.',
  },
});

function fail(message) { throw new Error(`Java SE contract sources: ${message}`); }

export function decodeHtml(text) {
  return text.replace(/&(?:amp|quot|apos|lt|gt|nbsp);|&#(?:x[0-9a-f]+|[0-9]+);/gi, entity => {
    const known = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' };
    const lower = entity.toLowerCase();
    if (Object.hasOwn(known, lower)) return known[lower];
    if (entity.startsWith('&#')) return String.fromCodePoint(Number.parseInt(entity.slice(lower[2] === 'x' ? 3 : 2, -1), lower[2] === 'x' ? 16 : 10));
    return entity;
  });
}

export function documentLinks(text, origin, release) {
  const values = [];
  for (const match of text.matchAll(/\b(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    values.push(match[1] ?? match[2] ?? match[3]);
  }
  for (const match of text.matchAll(/(?:^|\n)\s*@spec\s+(\S+)/g)) values.push(match[1]);
  const links = new Set();
  for (let value of values) {
    value = decodeHtml(value).replaceAll('{@docRoot}', apiBase(release).replace(/\/$/, '')).trim();
    if (!value || value.startsWith('#') || /^(?:mailto|javascript|data):/i.test(value)) continue;
    let url;
    try { url = new URL(value, origin); } catch { fail(`invalid documentation link ${value} in ${origin}`); }
    if (!['http:', 'https:', 'ftp:'].includes(url.protocol)) fail(`unclassified documentation protocol in ${origin}`);
    links.add(url.href);
  }
  return [...links].sort();
}

function sourceUrl(release, moduleName, source, kind, identity) {
  const base = `${apiBase(release)}${moduleName}/`;
  if (kind === 'module') return `${base}module-summary.html`;
  const parts = source.split('/');
  const packagePath = parts.slice(1, -1).join('/');
  if (kind === 'package') return `${base}${packagePath}/package-summary.html`;
  const packageName = packagePath.replaceAll('/', '.');
  const type = identity.split('#')[0].slice(packageName.length + 1);
  return `${base}${packagePath}/${type}.html`;
}

export function ownerFor(moduleName, identity = '') {
  if (moduleName === 'java.base') {
    if (/^java\.lang\.(?:invoke|reflect)(?:[.#]|$)/.test(identity)) return 'JVM-003';
    if (/^java\.lang\.(?:constant|classfile)(?:[.#]|$)/.test(identity)) return 'LIB-007';
    if (/^java\.lang\.foreign(?:[.#]|$)/.test(identity)) return 'LIB-010';
    if (/^java\.lang\.ref(?:[.#]|$)/.test(identity)) return 'LIB-004';
    if (/^java\.util\.stream(?:[.#]|$)/.test(identity)) return 'LIB-002';
    if (/^java\.util\.concurrent(?:[.#]|$)/.test(identity)) return 'LIB-003';
    if (/^java\.(?:io|nio)(?:[.#]|$)/.test(identity)) return 'LIB-005';
    if (/^java\.net(?:[.#]|$)/.test(identity)) return 'LIB-006';
    if (/^java\.util\.ServiceLoader(?:[.#]|$)/.test(identity)) return 'JVM-011';
    return 'LIB-008';
  }
  if (moduleName === 'java.se') return 'JVM-011';
  if (moduleName === 'java.compiler' || moduleName === 'java.scripting') return 'LIB-008';
  if (['java.instrument', 'java.management', 'java.management.rmi'].includes(moduleName)) return 'LIB-009';
  if (['java.net.http', 'java.rmi', 'java.naming'].includes(moduleName)) return 'LIB-006';
  if (['java.desktop', 'java.datatransfer', 'java.smartcardio', 'java.prefs'].includes(moduleName)) return 'LIB-005';
  if (modules.has(moduleName)) return 'LIB-008';
  if (moduleName.startsWith('jdk.')) return 'TOOL-001';
  fail(`unclassified owner for module ${moduleName}`);
}

export function parseSourceRecords(text, release) {
  if (!text.endsWith('\n')) fail('unterminated source record stream');
  const docs = [], sources = [], services = [], seen = new Set();
  let previous = '';
  for (const row of text.trimEnd().split('\n')) {
    if (previous && previous >= row) fail('source records must be sorted and unique');
    previous = row;
    const fields = row.split('\t');
    const [kind, moduleName] = fields;
    if (!modules.has(moduleName)) fail(`unclassified source module ${moduleName}`);
    seen.add(moduleName);
    if (kind === 'doc' && fields.length === 9) {
      const [, , source, docKind, identity, position, digest, base64, featureStatus] = fields;
      if (!['module', 'package', 'type', 'member'].includes(docKind) || !/^\d+$/.test(position)) fail('invalid source documentation identity');
      if (!['preview', 'final'].includes(featureStatus)) fail('unclassified source feature status');
      const comment = Buffer.from(base64, 'base64').toString('utf8');
      if (sha(comment) !== digest) fail('source documentation digest mismatch');
      const specification = sourceUrl(release, moduleName, source, docKind, identity);
      docs.push({ module: moduleName, source, kind: docKind, identity, position: Number(position), sha256: digest,
        specification, featureStatus, links: documentLinks(comment, specification, release) });
    } else if (kind === 'source' && fields.length === 4 && /^[a-f0-9]{64}$/.test(fields[3])) {
      sources.push({ module: moduleName, path: fields[2], sha256: fields[3] });
    } else if (kind === 'uses' && fields.length === 3) {
      services.push({ module: moduleName, service: fields[2], kind });
    } else if (kind === 'provides' && fields.length === 4) {
      services.push({ module: moduleName, service: fields[2], provider: fields[3], kind });
    } else fail(`malformed ${kind} source record`);
  }
  assert.deepEqual([...seen].sort(), [...JAVA_SE_MODULES].sort(), 'All 22 Java SE modules must have source provenance');
  for (const moduleName of JAVA_SE_MODULES) {
    if (!docs.some(doc => doc.module === moduleName && doc.kind === 'module')) fail(`missing module contract ${moduleName}`);
  }
  return { docs, sources, services };
}

export function serializedForms(html, release) {
  const tokens = /<h2\b[^>]*>[\s\S]*?<a\b[^>]*\shref="([^"]+\/package-summary\.html)"[^>]*>[\s\S]*?<\/h2>|<section\b[^>]*\sclass="serialized-class-details"[^>]*\sid="([^"]+)"[^>]*>/g;
  const found = [];
  let moduleName;
  for (const match of html.matchAll(tokens)) {
    if (match[1]) {
      moduleName = match[1].split('/')[0];
      if (!modules.has(moduleName) && !moduleName.startsWith('jdk.')) fail('unclassified serialized package');
    } else {
      if (!moduleName) fail('serialized class lacks module context');
      found.push({ module: moduleName, identity: decodeHtml(match[2]), position: match.index,
        specification: `${apiBase(release)}serialized-form.html#${match[2]}` });
    }
  }
  if (!found.length) fail('empty serialized-form index');
  if ((html.match(/class="serialized-class-details"/g) || []).length !== found.length) fail('unmapped serialized class section');
  const seen = new Set();
  return found.map((item, index) => {
    if (seen.has(item.identity)) fail('duplicate serialized class identity');
    seen.add(item.identity);
    const fragment = html.slice(item.position, found[index + 1]?.position ?? html.indexOf('</main>'));
    return { ...item, sha256: sha(fragment), links: documentLinks(fragment, `${apiBase(release)}serialized-form.html`, release) };
  });
}

export function externalSpecifications(html, release) {
  const rows = [...html.matchAll(/<div class="col-first [^"]*external-specs[^"]*">([\s\S]*?)<\/div>\s*<div class="col-last [^"]*external-specs[^"]*">([\s\S]*?)<\/div>/g)];
  if (!rows.length || rows.length !== (html.match(/<div class="col-first [^"]*external-specs/g) || []).length) fail('unmapped external-specification index row');
  return rows.map(row => {
    const specifications = documentLinks(row[1], `${apiBase(release)}external-specs.html`, release);
    const referringApis = [...row[2].matchAll(/<a\b[^>]*\shref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(link => ({
      url: new URL(decodeHtml(link[1]), `${apiBase(release)}external-specs.html`).href,
      label: decodeHtml(link[2].replace(/<[^>]+>/g, '')).trim(),
    }));
    if (specifications.length !== 1 || !referringApis.length) fail('external specification must have a target and citing APIs');
    return { specification: specifications[0], referringApis: referringApis.map(({ url, label }) => {
      if (!url.startsWith(apiBase(release))) fail('external index citation is not an API document');
      const relative = url.slice(apiBase(release).length);
      const moduleName = relative.split('/')[0];
      if (!modules.has(moduleName) && !moduleName.startsWith('jdk.')) fail('unclassified external index module');
      return { module: moduleName, identity: relative.slice(moduleName.length + 1).split('.html')[0].replaceAll('/', '.'), url, label };
    }) };
  });
}

function run(command, args, env, timeout = 120_000) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', env, timeout, maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0) fail(`${path.basename(command)} failed: ${result.error?.message || result.stderr || result.stdout}`);
  return result.stdout;
}

function extract(toolchain) {
  const cache = path.join(root, 'build/java-compatibility-toolchains');
  const home = path.join(cache, `${toolchain.id}-${toolchain.archiveSha256}`, toolchain.archiveRoot);
  const archive = path.join(home, 'lib/src.zip');
  if (!fs.existsSync(archive)) fail(`prepare the locked ${toolchain.id} toolchain first`);
  const provenance = { helperSha256: sha(fs.readFileSync(helper)), sourceArchiveSha256: sha(fs.readFileSync(archive)),
    toolchainArchiveSha256: toolchain.archiveSha256, toolchainTreeSha256: toolchain.treeSha256 };
  const artifact = path.join(output, `${toolchain.id}-source-docs.tsv.gz`);
  const receipt = `${artifact}.json`;
  if (fs.existsSync(artifact) && fs.existsSync(receipt)) {
    const cached = JSON.parse(fs.readFileSync(receipt, 'utf8'));
    if (JSON.stringify(cached.provenance) === JSON.stringify(provenance) && sha(fs.readFileSync(artifact)) === cached.sha256) {
      return { provenance, text: gunzipSync(fs.readFileSync(artifact)).toString('utf8') };
    }
  }
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-contract-source-'));
  try {
    const env = { ...process.env, JAVA_HOME: home, LC_ALL: 'C', TZ: 'UTC' };
    for (const key of ['JAVA_TOOL_OPTIONS', '_JAVA_OPTIONS', 'JDK_JAVA_OPTIONS', 'CLASSPATH']) delete env[key];
    run(path.join(home, 'bin/javac'), ['-d', temporary, helper], env, 60_000);
    run(path.join(home, 'bin/java'), ['-Xmx768m', '-cp', temporary, 'JavaSeContractSources', archive, artifact], env, 180_000);
    fs.writeFileSync(receipt, encoded({ provenance, sha256: sha(fs.readFileSync(artifact)) }));
    return { provenance, text: gunzipSync(fs.readFileSync(artifact)).toString('utf8') };
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
}

function classificationFor(url, release) {
  const parsed = new URL(url);
  if (parsed.href.startsWith(apiBase(release))) {
    if (parsed.pathname.includes('/doc-files/')) return 'doc-file';
    return 'api-cross-reference';
  }
  if (parsed.href.startsWith(specBase(release))) return 'platform-specification';
  return 'incorporated-reference';
}

export function correctDocumentPath(url, release) {
  const parsed = new URL(url);
  const key = parsed.href.startsWith(apiBase(release)) ? parsed.pathname.slice(new URL(apiBase(release)).pathname.length) : '';
  const correction = DOCUMENT_PATH_CORRECTIONS[key];
  if (!correction) return { url };
  return { url: `${apiBase(release)}${correction.target}${parsed.search}${parsed.hash}`, originalUrl: url, reason: correction.reason };
}

export function validateLedger(ledger) {
  assert.equal(ledger.schemaVersion, 1);
  assert.deepEqual(ledger.releases.map(entry => entry.release), [21, 25]);
  assert.equal(ledger.inventoryState, 'source-contracts-classified');
  assert.equal(ledger.conformanceClaim, false);
  const ids = new Set();
  for (const edition of ledger.releases) {
    assert.ok(edition.units.length > 0);
    for (const unit of edition.units) {
      assert.ok(unit.id && !ids.has(unit.id), 'Missing or duplicate contract-source id');
      ids.add(unit.id);
      const applicableKinds = {
        'doc-file': ['target-contract', 'documentation-resource'],
        'package-prose': ['target-contract'],
        'serialized-form': ['target-contract', 'jdk-specific-exclusion'],
        'service-loader-contract': ['target-contract'],
        'service-contract': ['target-contract', 'jdk-implementation-evidence'],
        'provider-identity': ['jdk-implementation-evidence'],
        'platform-specification': ['incorporated-by-contract', 'jdk-specific-exclusion'],
        'incorporated-reference': ['incorporated-by-contract'],
        'preview-reference': ['preview-exclusion'],
        'jdk-external-reference': ['jdk-specific-exclusion'],
      };
      assert.ok(applicableKinds[unit.kind]?.includes(unit.applicability), 'Unclassified contract-source kind or applicability');
      assert.ok(unit.specification && ['http:', 'https:', 'ftp:'].includes(new URL(unit.specification).protocol));
      assert.ok(Array.isArray(unit.owners) && unit.owners.length > 0 && unit.owners.every(owner => /^(?:JVM|LIB|TOOL)-\d{3}$/.test(owner)), 'Missing implementation owner');
      assert.ok(['target-contract', 'incorporated-by-contract', 'jdk-implementation-evidence', 'jdk-specific-exclusion', 'preview-exclusion', 'documentation-resource'].includes(unit.applicability));
      assert.equal(unit.implementationState, unit.applicability === 'target-contract' || unit.applicability === 'incorporated-by-contract' ? 'unassessed' : 'not-applicable');
      assert.equal(unit.tests.state, unit.implementationState === 'unassessed' ? 'planned' : 'not-applicable');
      assert.ok(unit.tests.planId && unit.scope && unit.origins.length > 0);
      assert.deepEqual(unit.owners, [...new Set(unit.owners)].sort(), 'Owners must be unique and sorted');
      assert.deepEqual(unit.origins, [...new Set(unit.origins)].sort(), 'Origins must be unique and sorted');
      if (['doc-file', 'package-prose', 'serialized-form', 'service-loader-contract'].includes(unit.kind)) {
        assert.match(unit.sourceSha256, /^[a-f0-9]{64}$/, 'A captured source digest is required');
      }
      assert.deepEqual(unit.tests.requiredHosts, unit.implementationState === 'unassessed' ? ['ubuntu-node24', 'chromium'] : []);
    }
    assert.ok(edition.units.some(unit => unit.kind === 'service-loader-contract'));
    assert.ok(edition.units.some(unit => unit.kind === 'serialized-form'));
    assert.ok(edition.units.some(unit => unit.kind === 'doc-file'));
    assert.ok(edition.units.some(unit => unit.kind === 'provider-identity' && unit.applicability === 'jdk-implementation-evidence'));
    assert.ok(edition.units.some(unit => unit.kind === 'service-contract' && unit.applicability === 'target-contract' &&
      unit.specification.endsWith('/java.base/java/lang/System.LoggerFinder.html')),
    'The public nested System.LoggerFinder SPI must not be classified as an internal binary-name service');
  }
  return { units: ids.size };
}

export async function generateLedger({ expected } = {}) {
  fs.mkdirSync(path.join(output, 'documents'), { recursive: true });
  const fetched = new Map();
  const expectedDocs = new Map((expected?.documents || []).map(document => [document.url, document]));
  async function document(url) {
    const clean = new URL(url); clean.hash = '';
    url = clean.href;
    if (fetched.has(url)) return fetched.get(url).data;
    const cacheFile = path.join(output, 'documents', `${sha(url)}.gz`);
    let data;
    if (fs.existsSync(cacheFile)) data = gunzipSync(fs.readFileSync(cacheFile));
    else {
      const response = await fetch(url, { signal: AbortSignal.timeout(60_000), redirect: 'follow' });
      if (!response.ok || response.url !== url) fail(`source changed location or failed: ${url} -> ${response.status} ${response.url}`);
      data = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(cacheFile, gzipSync(data, { level: 9 }));
    }
    const metadata = { url, bytes: data.length, sha256: sha(data) };
    if (expected && JSON.stringify(expectedDocs.get(url)) !== JSON.stringify(metadata)) fail(`unpinned or changed document ${url}`);
    fetched.set(url, { ...metadata, data });
    return data;
  }
  const toolchains = JSON.parse(fs.readFileSync(toolchainLockFile, 'utf8')).toolchains;
  assert.deepEqual(toolchains.map(entry => entry.feature), [21, 25]);
  const extractions = new Map(toolchains.map(toolchain => [toolchain.id, extract(toolchain)]));
  const ledger = { schemaVersion: 1, inventoryState: 'source-contracts-classified', conformanceClaim: false,
    policy: 'Full current-edition contracts include inherited behavior. References apply only as incorporated by their citing API; bibliographic and implementation notes do not create independent conformance requirements. Planned tests are not evidence of passing behavior.', releases: [] };
  for (const toolchain of toolchains) {
    const release = toolchain.feature;
    const extraction = extractions.get(toolchain.id);
    const source = parseSourceRecords(extraction.text, release);
    const units = new Map();
    const typeDocs = new Map(source.docs.filter(doc => doc.kind === 'type').map(doc => [doc.identity, doc]));
    function add(kind, specification, moduleName, identity, origin, applicability = 'target-contract', scope = 'Full normative contract of this source unit, including exceptions, side effects, inherited guarantees and incorporated references.') {
      const identityKey = ['service-contract', 'provider-identity'].includes(kind) ? identity : '';
      const key = `${kind}\0${specification}\0${identityKey}`;
      let item = units.get(key);
      if (!item) {
        const id = `SE${release}-${kind}-${sha(`${specification}\0${identityKey}`).slice(0, 24)}`;
        const required = applicability === 'target-contract' || applicability === 'incorporated-by-contract';
        item = { id, kind, specification, applicability, scope, owners: [], origins: [],
          implementationState: required ? 'unassessed' : 'not-applicable', tests: {
            planId: `${id}-CONTRACT`, state: required ? 'planned' : 'not-applicable',
            requiredHosts: required ? ['ubuntu-node24', 'chromium'] : [],
            method: required ? 'Derive positive, error, side-effect, lifetime and permitted-variation cases from the citing contract; use specified outcomes before native equality.' : 'This evidence does not assert an additional Java SE implementation requirement.',
          } };
        units.set(key, item);
      } else if (item.applicability === 'jdk-specific-exclusion' && applicability === 'incorporated-by-contract') {
        // A JDK tool specification can still supply a contract incorporated by
        // a Java SE API. Preserve that narrower obligation when both cite it.
        item.applicability = applicability;
        item.scope = scope;
        item.implementationState = 'unassessed';
        item.tests.state = 'planned';
        item.tests.requiredHosts = ['ubuntu-node24', 'chromium'];
        item.tests.method = 'Derive positive, error, side-effect, lifetime and permitted-variation cases from the citing contract; use specified outcomes before native equality.';
      }
      item.owners.push(ownerFor(moduleName, identity));
      item.origins.push(origin);
      return item;
    }
    const dependencies = new Map();
    const sourceCorrections = new Map();
    function dependency(url, moduleName, identity, origin) {
      const correction = correctDocumentPath(url, release);
      if (correction.originalUrl) {
        sourceCorrections.set(correction.originalUrl, correction);
        origin = `${origin} (source link ${correction.originalUrl}; correction: ${correction.reason})`;
        url = correction.url;
      }
      const kind = classificationFor(url, release);
      if (kind === 'api-cross-reference') return;
      if (!dependencies.has(url)) dependencies.set(url, []);
      dependencies.get(url).push({ moduleName, identity, origin });
    }
    for (const doc of source.docs) {
      for (const url of doc.links) {
        const origin = `${doc.source}:${doc.position}:${doc.sha256}`;
        if (doc.featureStatus === 'preview') {
          if (classificationFor(url, release) !== 'api-cross-reference') add('preview-reference', url,
            doc.module, doc.identity, origin, 'preview-exclusion', 'Reference from preview API documentation; excluded from this edition\'s final-only profile.');
        } else dependency(url, doc.module, doc.identity, origin);
      }
    }
    // Some JDK 21 packages still use package.html, which src.zip omits. Their
    // published package contracts supply the prose and dependency source.
    const packageProseSupplements = [];
    const packages = new Set(source.sources.filter(file => !file.path.endsWith('/module-info.java'))
      .map(file => file.path.slice(0, file.path.lastIndexOf('/'))));
    const documentedPackages = new Set(source.docs.filter(doc => doc.kind === 'package')
      .map(doc => `${doc.module}/${doc.identity.replaceAll('.', '/')}`));
    for (const packagePath of [...packages].sort()) {
      if (documentedPackages.has(packagePath)) continue;
      const moduleName = packagePath.split('/')[0];
      const identity = packagePath.slice(moduleName.length + 1).replaceAll('/', '.');
      const url = `${apiBase(release)}${packagePath}/package-summary.html`;
      const body = (await document(url)).toString('utf8');
      const begin = body.indexOf('<main'), end = body.indexOf('</main>');
      if (begin < 0 || end < begin) fail(`missing published package contract ${url}`);
      const item = add('package-prose', url, moduleName, identity,
        `Official package documentation replaces package.html omitted from ${toolchain.id} src.zip`);
      item.sourceSha256 = sha(body);
      packageProseSupplements.push({ specification: url, sourceSha256: item.sourceSha256 });
      for (const link of documentLinks(body.slice(begin, end), url, release)) dependency(link, moduleName, identity, url);
    }
    const serializedUrl = `${apiBase(release)}serialized-form.html`;
    const serialized = serializedForms((await document(serializedUrl)).toString('utf8'), release);
    for (const form of serialized) {
      const applicable = modules.has(form.module);
      const item = add('serialized-form', form.specification, form.module, form.identity,
        `${serializedUrl}#${form.identity}`, applicable ? 'target-contract' : 'jdk-specific-exclusion');
      item.sourceSha256 = form.sha256;
      if (applicable) for (const url of form.links) dependency(url, form.module, form.identity, form.specification);
    }
    // JDK 21 does not publish this generated index: its URL redirects to another edition.
    // Its pinned public API DocTrees above supply the same reference-discovery role.
    if (release === 25) {
      const url = `${apiBase(release)}external-specs.html`;
      const html = (await document(url)).toString('utf8');
      for (const reference of externalSpecifications(html, release)) {
        for (const origin of reference.referringApis) {
          const type = typeDocs.get(origin.identity);
          let preview = type?.featureStatus === 'preview';
          if (!preview && origin.label.startsWith(`${origin.identity}.`)) {
            let name = origin.label.slice(origin.identity.length + 1).split('(')[0];
            if (name === origin.identity.split('.').at(-1)) name = '<init>';
            const declarations = source.docs.filter(doc => doc.kind === 'member' && doc.identity === `${origin.identity}#${name}`);
            const states = new Set(declarations.map(doc => doc.featureStatus));
            if (states.size > 1) fail(`external specification citation needs an exact overload classification: ${origin.url}`);
            preview = states.has('preview');
          }
          if (preview) add('preview-reference', reference.specification, origin.module, origin.identity,
            origin.url, 'preview-exclusion', 'External specification cited by a preview API; excluded from this edition\'s final-only profile.');
          else if (modules.has(origin.module)) dependency(reference.specification, origin.module, origin.identity, origin.url);
          else add('jdk-external-reference', reference.specification, origin.module, origin.identity, origin.url,
            'jdk-specific-exclusion', 'External specification cited by a JDK-specific API; retained separately from Java SE API requirements.');
        }
      }
    }
    const specsIndex = `${specBase(release)}index.html`;
    const specsHtml = (await document(specsIndex)).toString('utf8');
    for (const url of documentLinks(specsHtml, specsIndex, release)) {
      if (!url.startsWith(specBase(release)) || url === specsIndex) continue;
      const relative = url.slice(specBase(release).length);
      const required = /^(?:jar\/|jni\/|serialization\/|rmi\/|security\/|jawt\/|jvmti\.html)/.test(relative);
      const owner = relative.startsWith('jni/') || relative.startsWith('jawt/') ? 'LIB-010'
        : relative.startsWith('rmi/') ? 'LIB-006' : relative.startsWith('jvmti') ? 'LIB-009' : 'LIB-008';
      const item = add('platform-specification', url, 'java.base', '', specsIndex,
        required ? 'incorporated-by-contract' : 'jdk-specific-exclusion',
        required ? 'Full platform specification to the extent incorporated by the target Java SE API/JLS/JVMS contracts; includes referenced subdocuments.' : 'JDK-specific tool/documentation/debugging specification outside the approved final Java SE runtime target.');
      item.owners = [required ? owner : 'TOOL-001'];
    }
    const loader = `${apiBase(release)}java.base/java/util/ServiceLoader.html`;
    add('service-loader-contract', loader, 'java.base', 'java.util.ServiceLoader', loader).sourceSha256 = sha(await document(loader));
    for (const service of source.services) {
      // ModuleDescriptor uses binary names; DocTrees uses canonical nested names.
      const declared = typeDocs.get(service.service.replaceAll('$', '.'));
      const spec = declared?.specification || `${apiBase(release)}${service.module}/module-summary.html`;
      add('service-contract', spec, declared?.module || service.module,
        service.service, `${service.module} ${service.kind} ${service.service}`,
        declared ? 'target-contract' : 'jdk-implementation-evidence',
        declared ? `Full service/SPI API contract for ${service.service}; includes discovery, configuration, required capabilities, ordering, caching and errors where specified.` : `Unexported implementation service ${service.service}; the provider/module observation does not impose its identity on Java SE implementations.`);
      if (service.provider) add('provider-identity', `${apiBase(release)}${service.module}/module-summary.html`,
        service.module, service.provider, `${toolchain.id} ${service.module} provides ${service.service} with ${service.provider}`,
        'jdk-implementation-evidence', `Observed Corretto provider class ${service.provider}; required capabilities remain in the public service contract, not this implementation name.`);
    }
    // Follow all doc-file links found in API prose and serialized forms, including
    // links between supplementary documents. Image/data resources retain hashes too.
    const processed = new Set();
    const captureErrors = new Set();
    for (;;) {
      const batch = [...dependencies].filter(([url]) => classificationFor(url, release) === 'doc-file' && !processed.has(url));
      if (!batch.length) break;
      for (const [url, origins] of batch) {
        processed.add(url);
        let bytes;
        try { bytes = await document(url); } catch (error) { captureErrors.add(error.message); continue; }
        for (const origin of origins) {
          const textDocument = /\.(?:html?|txt|pdf)(?:[#?]|$)/i.test(url);
          const item = add('doc-file', url, origin.moduleName, origin.identity, origin.origin,
            textDocument ? 'target-contract' : 'documentation-resource',
            textDocument ? 'Full supplementary documentation contract, including incorporated references; examples and implementation notes retain their original force.' : 'Image or data resource incorporated into supplementary documentation; not an independent executable API requirement.');
          item.sourceSha256 = sha(bytes);
        }
        if (/\.(?:html?|txt)(?:[#?]|$)/.test(url)) {
          for (const linked of documentLinks(bytes.toString('utf8'), url, release)) {
            const origin = origins[0];
            dependency(linked, origin.moduleName, origin.identity, url);
          }
        }
      }
    }
    if (captureErrors.size) fail(`supplementary source capture failed:\n${[...captureErrors].sort().join('\n')}`);
    for (const [url, origins] of dependencies) {
      const kind = classificationFor(url, release);
      if (kind === 'doc-file') continue;
      for (const origin of origins) add(kind, url, origin.moduleName, origin.identity, origin.origin,
        'incorporated-by-contract', 'Referenced document applies only to the extent incorporated by the citing public/protected API contract. This dependency retains the complete referenced contract; examples, bibliography and implementation notes do not independently expand Java SE requirements.');
    }
    const records = [...units.values()].map(unit => ({ ...unit, owners: [...new Set(unit.owners)].sort(), origins: [...new Set(unit.origins)].sort() })).sort((a, b) => a.id.localeCompare(b.id, 'en'));
    ledger.releases.push({ release, toolchainId: toolchain.id, provenance: extraction.provenance,
      sourceRecordsArtifact: `build/java-se-contract-sources/${toolchain.id}-source-docs.tsv.gz`,
      sourceRecordsSha256: sha(extraction.text),
      sourceCorrections: [...sourceCorrections.values()].sort((a, b) => a.originalUrl.localeCompare(b.originalUrl, 'en')),
      packageProseSupplements,
      sourceFiles: source.sources.length, publicDocumentationUnits: source.docs.length,
      publicDocumentationSha256: sha(encoded(source.docs)), moduleDescriptorsSha256: sha(encoded(source.services)),
      sourceFilesSha256: sha(encoded(source.sources)), externalReferenceDiscovery: release === 21 ? 'pinned-public-api-doctrees' : 'pinned-public-api-doctrees-and-official-external-specs-index', units: records });
  }
  validateLedger(ledger);
  const raw = encoded(ledger);
  fs.writeFileSync(path.join(output, 'contracts.json.gz'), gzipSync(raw, { level: 9 }));
  const summary = { schemaVersion: 1, inventoryState: ledger.inventoryState, conformanceClaim: false,
    helperSha256: sha(fs.readFileSync(helper)), generatorSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))),
    toolchainLockSha256: sha(fs.readFileSync(toolchainLockFile)), ledgerSha256: sha(raw),
    releases: ledger.releases.map(({ units, ...edition }) => ({ ...edition, units: units.length,
      counts: Object.fromEntries([...new Set(units.map(unit => unit.kind))].sort().map(kind => [kind, units.filter(unit => unit.kind === kind).length])),
      applicability: Object.fromEntries([...new Set(units.map(unit => unit.applicability))].sort().map(kind => [kind, units.filter(unit => unit.applicability === kind).length])),
    })), documents: [...fetched.values()].map(({ data, ...metadata }) => metadata).sort((a, b) => a.url.localeCompare(b.url, 'en')) };
  fs.writeFileSync(path.join(output, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const propose = process.argv[2] === '--propose-baseline';
    if (process.argv.length > 3 || (process.argv[2] && !propose)) fail('Usage: node ci/java_se_contract_sources.mjs [--propose-baseline]');
    const expected = propose ? undefined : JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    const actual = await generateLedger({ expected });
    if (propose) console.log(`Proposed source inventory: ${path.relative(root, path.join(output, 'summary.json'))}`);
    else {
      assert.deepEqual(actual, expected, 'Supplementary Java SE source inventory changed; review the source and baseline.');
      console.log(`Java SE supplementary contracts classified: ${actual.releases.map(entry => `${entry.release}: ${entry.units}`).join(', ')}. Conformance remains unassessed.`);
    }
  } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}
