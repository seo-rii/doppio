import crypto from 'node:crypto';
import { REFLECTIVE_PREVIEW_25, stableMemberId } from './java_se_api_projection.mjs';

function fail(message) {
  throw new Error(`Oracle Java SE API index: ${message}`);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function parseSearchIndex(source, name) {
  const prefix = `${name} = `;
  if (!source.startsWith(prefix) || !source.endsWith(';updateSearchResults();')) {
    fail(`${name} has an unexpected JavaDoc format.`);
  }
  const json = source.slice(prefix.length, -';updateSearchResults();'.length);
  const entries = JSON.parse(json);
  if (!Array.isArray(entries)) fail(`${name} is not an array.`);
  return entries;
}

function canonicalPage(moduleName, packageName, typeName) {
  return `${moduleName}/${packageName.replaceAll('.', '/')}/${typeName}.html`;
}

function normalizeParams(value) {
  let normalized = value;
  while (/<[^<>]*>/.test(normalized)) normalized = normalized.replaceAll(/<[^<>]*>/g, '');
  return normalized.replaceAll('...', '[]').replaceAll(/\s+/g, '');
}

function signatureParameters(signature) {
  const start = signature.indexOf('(');
  const end = signature.indexOf(')', start + 1);
  if (start < 0 || end < 0) fail(`invalid compiler member signature ${signature}.`);
  return signature.slice(start + 1, end);
}

function parseMemberAnchor(anchor, typeName) {
  const decoded = decodeURIComponent(anchor);
  const open = decoded.indexOf('(');
  if (open < 0) return { name: decoded, parameters: null };
  if (!decoded.endsWith(')')) fail(`malformed Javadoc member anchor ${anchor}.`);
  const label = decoded.slice(0, open);
  return {
    name: label === typeName.split('.').at(-1) ? '<init>' : label,
    parameters: normalizeParams(decoded.slice(open + 1, -1)),
  };
}

export function reconcileOracleIndexes(census, feature, indexes) {
  if (![21, 25].includes(feature)) fail('only Java SE 21 and 25 are supported.');
  const moduleByPackage = new Map();
  const types = new Set();
  const typeAnnotations = new Map();
  const members = new Map();
  if (!census.endsWith('\n')) fail('census must be LF-terminated.');
  for (const row of census.slice(0, -1).split('\n')) {
    const fields = row.split('\t');
    if (fields[0] === 'exports' && fields[3] === '*') {
      const former = moduleByPackage.get(fields[2]);
      if (former && former !== fields[1]) fail(`split exported package ${fields[2]}.`);
      moduleByPackage.set(fields[2], fields[1]);
    } else if (fields[0] === 'type') {
      types.add(fields[2]);
      typeAnnotations.set(fields[2], fields[6]);
    } else if (fields[0] === 'member') {
      const key = `${fields[2]}#${fields[4]}`;
      if (!members.has(key)) members.set(key, []);
      members.get(key).push({
        fields,
        declarationOwner: fields[5],
        signature: fields[7],
        annotations: fields[9],
        erasedParameters: fields[10],
        kind: fields[3],
      });
    }
  }
  const typeIndex = parseSearchIndex(indexes.type, 'typeSearchIndex');
  const memberIndex = parseSearchIndex(indexes.member, 'memberSearchIndex');
  const documentedTypes = new Set();
  for (const entry of typeIndex) {
    if (!moduleByPackage.has(entry.p)) continue;
    const name = `${entry.p}.${entry.l}`;
    if (documentedTypes.has(name)) fail(`duplicate documented type ${name}.`);
    documentedTypes.add(name);
  }
  const typeOnly = [...types].filter((name) => !documentedTypes.has(name));
  const docsOnly = [...documentedTypes].filter((name) => !types.has(name));
  if (typeOnly.length || docsOnly.length) {
    fail(`type index differs: ${typeOnly.length} binary-only, ${docsOnly.length} docs-only; ` +
      `first=${typeOnly[0] || docsOnly[0]}.`);
  }
  const documentedMembers = new Set();
  const pageToType = new Map();
  for (const type of types) {
    const packageName = [...moduleByPackage.keys()]
      .filter((pkg) => type.startsWith(`${pkg}.`))
      .sort((left, right) => right.length - left.length)[0];
    if (!packageName) fail(`no exported package for type ${type}.`);
    const page = canonicalPage(moduleByPackage.get(packageName), packageName,
      type.slice(packageName.length + 1));
    pageToType.set(page, type);
  }
  let exactMemberMatches = 0;
  let memberAnchorAliases = 0;
  const memberAnchorByType = new Map();
  const documentedAnchors = new Map();
  for (const entry of memberIndex) {
    if (!moduleByPackage.has(entry.p)) continue;
    const type = `${entry.p}.${entry.c}`;
    if (!types.has(type)) fail(`member index refers to unlisted Java SE type ${type}.`);
    const anchor = entry.u || entry.l;
    const key = `${type}#${anchor}`;
    if (documentedMembers.has(key)) fail(`duplicate documented member ${key}.`);
    documentedMembers.add(key);
    const lookup = parseMemberAnchor(anchor, entry.c);
    const candidates = (members.get(`${type}#${lookup.name}`) || []).filter((member) =>
      lookup.parameters === null
        ? member.kind !== 'METHOD' && member.kind !== 'CONSTRUCTOR'
        : member.kind === 'METHOD' || member.kind === 'CONSTRUCTOR');
    if (!candidates.length) fail(`documented member absent from classfile census: ${key}.`);
    if (lookup.parameters !== null) {
      const exact = candidates.filter((member) =>
        normalizeParams(member.erasedParameters) === lookup.parameters ||
        normalizeParams(signatureParameters(member.signature)) === lookup.parameters);
      if (!exact.length) fail(`documented overload absent from classfile census: ${key}.`);
      candidates.splice(0, candidates.length, ...exact);
    }
    exactMemberMatches++;
    const relativeRef = canonicalPage(moduleByPackage.get(entry.p), entry.p, entry.c) +
      `#${anchor}`;
    memberAnchorByType.set(key, relativeRef);
    for (const member of candidates) {
      const stableId = stableMemberId(member.fields);
      const fullRef = `https://docs.oracle.com/en/java/javase/${feature}/docs/api/${relativeRef}`;
      const previous = documentedAnchors.get(stableId);
      if (previous && previous !== fullRef) {
        // Javadoc occasionally indexes a nested constructor both as its
        // encoded <init> anchor and as a simple-name alias. Prefer the former.
        memberAnchorAliases++;
        if (!entry.u) continue;
      }
      documentedAnchors.set(stableId, fullRef);
    }
  }
  const previewLinks = [...indexes.preview.matchAll(
    /<div class="col-summary-item-name[^\"]*"><a href="([^"]+)"/g,
  )].map((match) => match[1]);
  if (previewLinks.length === 0) fail('preview-list.html contained no summary entries.');
  const previewTypePages = new Set();
  const previewMemberPages = new Set();
  for (const href of previewLinks) {
    const [page, anchor] = href.split('#');
    const moduleName = page.split('/', 1)[0];
    if (!moduleName.startsWith('java.')) continue;
    if (!page.endsWith('.html')) fail(`malformed preview link ${href}.`);
    const type = pageToType.get(page);
    if (!type) fail(`preview page has no exported type: ${href}.`);
    if (anchor) {
      const docKey = `${type}#${anchor}`;
      if (!memberAnchorByType.has(docKey)) {
        const parsed = parseMemberAnchor(anchor, type);
        if (!members.has(`${type}#${parsed.name}`)) fail(`preview member absent: ${href}.`);
      }
      previewMemberPages.add(decodeURIComponent(href));
    } else previewTypePages.add(href);
  }
  const annotationPreviewTypePages = new Set();
  for (const [type, annotations] of typeAnnotations) {
    if (!annotations.split(',').includes('jdk.internal.javac.PreviewFeature')) continue;
    const page = [...pageToType].find(([, name]) => name === type)?.[0];
    if (!page) fail(`preview type has no official page: ${type}.`);
    annotationPreviewTypePages.add(page);
  }
  const annotationPreviewMemberPages = new Set();
  let annotationPreviewMembers = 0;
  const root = `https://docs.oracle.com/en/java/javase/${feature}/docs/api/`;
  for (const group of members.values()) {
    for (const member of group) {
      if (!member.annotations.split(',').includes('jdk.internal.javac.PreviewFeature')) continue;
      annotationPreviewMembers++;
      const href = documentedAnchors.get(stableMemberId(member.fields));
      if (!href) fail(`preview member has no official index anchor: ${member.fields[2]}.${member.fields[4]}.`);
      annotationPreviewMemberPages.add(decodeURIComponent(href.slice(root.length)));
    }
  }
  const difference = (left, right) => [...left].filter((item) => !right.has(item));
  const typeMissing = difference(annotationPreviewTypePages, previewTypePages);
  const typeUnexpected = difference(previewTypePages, annotationPreviewTypePages);
  const memberMissing = difference(annotationPreviewMemberPages, previewMemberPages);
  const memberUnexpected = difference(previewMemberPages, annotationPreviewMemberPages);
  const reflectiveExpected = feature === 25 ? REFLECTIVE_PREVIEW_25 : [];
  if (typeMissing.sort().join('\n') !== [...reflectiveExpected].sort().join('\n') ||
      typeUnexpected.length || memberMissing.length || memberUnexpected.length) {
    fail(`preview-list and JDK annotations differ: ` +
      `${typeMissing.length}/${typeUnexpected.length} type and ` +
      `${memberMissing.length}/${memberUnexpected.length} member discrepancies; ` +
      `typeMissing=${typeMissing.slice(0, 12)}; memberMissing=${memberMissing.slice(0, 12)}; ` +
      `memberUnexpected=${memberUnexpected.slice(0, 12)}.`);
  }
  for (const page of reflectiveExpected) {
    if (!indexes.reflective?.[page]?.includes('is a reflective preview API of the Java platform.')) {
      fail(`reflective preview documentation is missing for ${page}.`);
    }
  }
  const annotationPreviewTypes = annotationPreviewTypePages.size;
  const result = {
    officialSources: {
      typeIndex: `https://docs.oracle.com/en/java/javase/${feature}/docs/api/type-search-index.js`,
      memberIndex: `https://docs.oracle.com/en/java/javase/${feature}/docs/api/member-search-index.js`,
      previewList: `https://docs.oracle.com/en/java/javase/${feature}/docs/api/preview-list.html`,
      reflectivePreviewPages: reflectiveExpected.map((page) =>
        `https://docs.oracle.com/en/java/javase/${feature}/docs/api/${page}`),
    },
    officialSourceSha256: {
      typeIndex: sha256(indexes.type), memberIndex: sha256(indexes.member),
      previewList: sha256(indexes.preview),
      reflectivePreviewPages: sha256(reflectiveExpected.map((page) =>
        `${page}\n${indexes.reflective[page]}`).join('\n')),
    },
    documentedTypes: documentedTypes.size,
    documentedMembers: documentedMembers.size,
    exactMemberMatches,
    memberAnchoredRecords: documentedAnchors.size,
    memberAnchorAliases,
    previewDocumentedTypes: previewTypePages.size,
    previewDocumentedMembers: previewMemberPages.size,
    reflectivePreviewTypes: reflectiveExpected.length,
    annotationPreviewTypes,
    annotationPreviewMembers,
  };
  return { summary: result, documentedAnchors };
}

export async function fetchOracleIndexes(feature) {
  const root = `https://docs.oracle.com/en/java/javase/${feature}/docs/api/`;
  const names = [
    ['type', 'type-search-index.js', 1024 * 1024],
    ['member', 'member-search-index.js', 12 * 1024 * 1024],
    ['preview', 'preview-list.html', 1024 * 1024],
  ];
  const entries = await Promise.all(names.map(async ([kind, suffix, maximumBytes]) => {
    const response = await fetch(root + suffix, {
      redirect: 'error', signal: AbortSignal.timeout(60_000),
      headers: { 'user-agent': 'doppio-java-se-api-census' },
    });
    if (!response.ok || Number(response.headers.get('content-length') || 0) > maximumBytes) {
      fail(`${feature} ${suffix} failed or exceeds the ${maximumBytes} byte limit.`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > maximumBytes) fail(`${feature} ${suffix} exceeds the size limit.`);
    return [kind, bytes.toString('utf8')];
  }));
  const indexes = Object.fromEntries(entries);
  indexes.reflective = {};
  if (feature === 25) {
    await Promise.all(REFLECTIVE_PREVIEW_25.map(async (page) => {
      const response = await fetch(root + page, {
        redirect: 'error', signal: AbortSignal.timeout(60_000),
        headers: { 'user-agent': 'doppio-java-se-api-census' },
      });
      if (!response.ok || Number(response.headers.get('content-length') || 0) > 1024 * 1024) {
        fail(`reflective preview page unavailable or too large: ${page}.`);
      }
      const body = await response.text();
      if (Buffer.byteLength(body) > 1024 * 1024) fail(`reflective preview page too large: ${page}.`);
      indexes.reflective[page] = body;
    }));
  }
  return indexes;
}
