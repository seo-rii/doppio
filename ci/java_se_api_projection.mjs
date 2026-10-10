import crypto from 'node:crypto';

const MEMBER_KINDS = new Set([
  'CONSTRUCTOR', 'METHOD', 'FIELD', 'ENUM_CONSTANT', 'RECORD_COMPONENT',
]);
const MODULE_KINDS = new Set(['module', 'requires', 'exports', 'opens', 'uses', 'provides']);
export const REFLECTIVE_PREVIEW_25 = Object.freeze([
  'java.compiler/javax/lang/model/util/AbstractAnnotationValueVisitorPreview.html',
  'java.compiler/javax/lang/model/util/AbstractElementVisitorPreview.html',
  'java.compiler/javax/lang/model/util/AbstractTypeVisitorPreview.html',
  'java.compiler/javax/lang/model/util/ElementKindVisitorPreview.html',
  'java.compiler/javax/lang/model/util/ElementScannerPreview.html',
  'java.compiler/javax/lang/model/util/SimpleAnnotationValueVisitorPreview.html',
  'java.compiler/javax/lang/model/util/SimpleElementVisitorPreview.html',
  'java.compiler/javax/lang/model/util/SimpleTypeVisitorPreview.html',
  'java.compiler/javax/lang/model/util/TypeKindVisitorPreview.html',
]);

function digest(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function expect(condition, message) {
  if (!condition) throw new Error(`Java SE API projection: ${message}`);
}

export function validateOwnerRules(rules, modules) {
  expect(rules?.schemaVersion === 1, 'owner rules require schemaVersion 1.');
  expect(rules.moduleDirectiveOwner === 'JVM-011' &&
    rules.excludedModuleOwner === 'OUT-OF-SCOPE', 'module owners must be explicit.');
  expect(rules.implementationState === 'unassessed' &&
    rules.verificationState === 'pending-specification-derived-test',
  'unassessed and pending states must be explicit.');
  expect(Object.keys(rules.defaultModuleOwners || {}).sort().join('\n') ===
    [...modules].sort().join('\n'), 'each Java SE module needs exactly one default owner.');
  const seen = new Set();
  for (const rule of rules.prefixOwners || []) {
    expect(modules.includes(rule.module) &&
      /^((LIB|JVM)-\d{3})$/.test(rule.owner) &&
      typeof rule.prefix === 'string' && rule.prefix.includes('.'),
    'invalid prefix owner rule.');
    const key = `${rule.module}/${rule.prefix}`;
    expect(!seen.has(key), `duplicate owner rule ${key}.`);
    seen.add(key);
  }
}

function publicPackage(moduleName, canonicalName, exported) {
  const packages = exported.get(moduleName);
  const matches = [...packages].filter((pkg) => canonicalName.startsWith(`${pkg}.`));
  expect(matches.length > 0, `no public exported package for ${moduleName}/${canonicalName}.`);
  return matches.sort((left, right) => right.length - left.length)[0];
}

function ownerFor(rules, moduleName, canonicalName) {
  const matches = rules.prefixOwners.filter((rule) => rule.module === moduleName &&
    (canonicalName === rule.prefix || canonicalName.startsWith(`${rule.prefix}.`)));
  matches.sort((left, right) => right.prefix.length - left.prefix.length);
  return matches[0]?.owner || rules.defaultModuleOwners[moduleName];
}

function typePage(feature, moduleName, packageName, canonicalName) {
  const typeName = canonicalName.slice(packageName.length + 1);
  const packagePath = packageName.replaceAll('.', '/');
  return `https://docs.oracle.com/en/java/javase/${feature}/docs/api/` +
    `${moduleName}/${packagePath}/${typeName}.html`;
}

export function stableMemberId(fields) {
  expect(fields[0] === 'member' && fields.length === 11, 'member ID requires a census row.');
  return `MEMBER:${fields[1]}:${fields[2]}:${fields[3]}:` +
    `${fields[4]}(${fields[10]}):${fields[5]}`;
}

export function projectCensus(text, feature, rules, modules, {
  documentedAnchors = new Map(), onRecord = () => {},
} = {}) {
  validateOwnerRules(rules, modules);
  expect(feature === 21 || feature === 25, 'only pinned Java SE 21 and 25 editions are supported.');
  expect(text.endsWith('\n'), 'census must be LF-terminated.');
  const rows = text.slice(0, -1).split('\n').map((row) => row.split('\t'));
  const exported = new Map(modules.map((moduleName) => [moduleName, new Set()]));
  const previewTypes = new Set();
  for (const fields of rows) {
    if (fields[0] === 'exports' && fields[3] === '*') exported.get(fields[1]).add(fields[2]);
    if (fields[0] === 'type' && fields[6].split(',').includes('jdk.internal.javac.PreviewFeature')) {
      previewTypes.add(`${fields[1]}/${fields[2]}`);
    }
  }
  const ids = new Set();
  const byOwner = {};
  const byClassification = {};
  const byTestPlan = {};
  const previewUnitIds = [];
  let records = 0;
  for (const fields of rows) {
    const [kind, moduleName] = fields;
    let owner;
    let classification;
    let specificationRef;
    let stableId;
    if (kind === 'excludedModule') {
      owner = rules.excludedModuleOwner;
      classification = fields[2];
      specificationRef = `https://docs.oracle.com/en/java/javase/${feature}/docs/api/${moduleName}/module-summary.html`;
      stableId = `EXCLUDED-MODULE:${moduleName}`;
    } else if (kind === 'classFile') {
      owner = rules.excludedModuleOwner;
      classification = 'JDK-image-classfile-not-itself-an-exported-API-declaration';
      specificationRef = null;
      stableId = `CLASSFILE:${moduleName}:${fields[2]}`;
    } else if (MODULE_KINDS.has(kind)) {
      owner = rules.moduleDirectiveOwner;
      classification = kind === 'exports' && fields[3] !== '*'
        ? 'qualified-export-not-public-Java-SE-API' : 'Java-SE-module-contract';
      const root = `https://docs.oracle.com/en/java/javase/${feature}/docs/api/${moduleName}`;
      specificationRef = kind === 'exports' && fields[3] === '*'
        ? `${root}/${fields[2].replaceAll('.', '/')}/package-summary.html`
        : `${root}/module-summary.html`;
      stableId = kind === 'module' ? `MODULE:${moduleName}`
        : `${kind.toUpperCase()}:${moduleName}:${fields.slice(2).join(':')}`;
    } else if (kind === 'type' || kind === 'member') {
      const canonicalName = fields[2];
      const packageName = publicPackage(moduleName, canonicalName, exported);
      owner = ownerFor(rules, moduleName, canonicalName);
      const annotatedPreview = fields[kind === 'type' ? 6 : 9]
        .split(',').includes('jdk.internal.javac.PreviewFeature');
      specificationRef = typePage(feature, moduleName, packageName, canonicalName);
      const reflectivePreview = feature === 25 && REFLECTIVE_PREVIEW_25.some((page) =>
        specificationRef.endsWith(`/${page}`));
      classification = annotatedPreview || previewTypes.has(`${moduleName}/${canonicalName}`) ||
          reflectivePreview
        ? 'preview-excluded-from-final-only-profile' : 'Java-SE-exported-API';
      if (kind === 'type') {
        stableId = `TYPE:${moduleName}:${canonicalName}`;
      } else {
        expect(MEMBER_KINDS.has(fields[3]), `unknown member kind ${fields[3]}.`);
        stableId = stableMemberId(fields);
        specificationRef = documentedAnchors.get(stableId) || specificationRef;
      }
    } else {
      throw new Error(`Java SE API projection: unknown record kind ${kind}.`);
    }
    expect(owner && (specificationRef || kind === 'classFile'), `unowned or unsourced ${kind}.`);
    expect(!ids.has(stableId), `duplicate stable ID ${stableId}.`);
    ids.add(stableId);
    const testPlan = owner === 'OUT-OF-SCOPE' ? 'not-applicable'
      : kind === 'module' || kind === 'requires' || kind === 'exports' ||
          kind === 'opens' || kind === 'uses' || kind === 'provides'
        ? 'module-resolution-service-contract'
        : kind === 'type' ? 'type-reflection-access-contract'
          : 'member-values-errors-side-effects-contract';
    const contractScope = owner === 'OUT-OF-SCOPE'
      ? 'Excluded image module/class file; no final Java SE API claim.'
      : MODULE_KINDS.has(kind)
        ? 'Full module/package description, directives, referenced contracts, services and provider effects.'
        : kind === 'type'
          ? 'Full official type declaration and normative type-level documentation, including referenced contracts.'
          : 'Full declared/inherited member contract: values, boundaries, errors, side effects, and references.';
    const testPlanDescription = testPlan === 'module-resolution-service-contract'
      ? 'Create native-vs-Doppio resolution, readability, access, service/provider positive and negative fixtures on Node and Chromium.'
      : testPlan === 'type-reflection-access-contract'
        ? 'Create native-vs-Doppio public/protected type discovery, reflection, linkage and access fixtures on Node and Chromium.'
        : testPlan === 'member-values-errors-side-effects-contract'
          ? 'Create native-vs-Doppio member value, boundary, exception and side-effect fixtures on Node and Chromium.'
          : 'Excluded from final Java SE compatibility tests.';
    onRecord({
      schemaVersion: 1,
      id: stableId,
      edition: feature,
      kind,
      module: moduleName,
      declaration: fields.slice(2),
      ownerPackage: owner,
      classification,
      specificationRef,
      sourceLocator: kind === 'member' ? {
        exposedOn: fields[2], declarationOwner: fields[5], memberKind: fields[3],
        name: fields[4], erasedParameters: fields[10],
        documentedAnchor: documentedAnchors.has(stableId),
      } : null,
      contractScope,
      implementationState: owner === 'OUT-OF-SCOPE' ? 'not-applicable' : rules.implementationState,
      verificationState: owner === 'OUT-OF-SCOPE' ? 'not-applicable' : rules.verificationState,
      testPlanId: `PLAN-001/${testPlan}/${stableId}`,
      testPlanDescription,
    });
    byOwner[owner] = (byOwner[owner] || 0) + 1;
    byClassification[classification] = (byClassification[classification] || 0) + 1;
    byTestPlan[testPlan] = (byTestPlan[testPlan] || 0) + 1;
    if (classification === 'preview-excluded-from-final-only-profile') {
      previewUnitIds.push(stableId);
    }
    records++;
  }
  return {
    records,
    stableIdSha256: digest(`${[...ids].sort().join('\n')}\n`),
    byOwner,
    byClassification,
    byTestPlan,
    previewUnits: previewUnitIds.length,
    previewUnitIdsSha256: digest(`${previewUnitIds.sort().join('\n')}\n`),
  };
}
