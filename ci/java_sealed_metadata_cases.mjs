import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readSealedClass} from './java_sealed_metadata.mjs';

const driver = 'classes.modern_test.JavaSealedMetadata';
const B = 'sealedmetadata.Base', C = 'sealedmetadata.Child', G = 'sealedmetadata.Good';
const initialize = `static { ${driver}.noteInitialization(); }`;
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const source = (binaryName, declaration, body) => ({binaryName,
  text: `package sealedmetadata; ${declaration} { ${body} }\n`});
const unit = (id, sources) => ({id, compilerMode: 'ordinary-classpath', driverClasspath: true, sources,
  expectedClassNames: sources.map(item => item.binaryName).sort()});

/** Separate genuine compiler trees; evolved children are not byte mutations. */
export function metadataCompilationUnits() {
  return [
    unit('metadata-original', [
      source(B, 'public sealed class Base permits Child, Good', `${initialize} public static Class<?> arrayType() { return Child[].class; }`),
      source(C, 'public non-sealed class Child extends Base', `${initialize} public int value() { return 1; }`),
      source(G, 'public non-sealed class Good extends Base', initialize)
    ]),
    unit('metadata-unrelated', [source(C, 'public class Child', `${initialize} public int value() { return 1; }`)]),
    unit('metadata-indirect', [source(G, 'public class Good', ''),
      source(C, 'public class Child extends Good', `${initialize} public int value() { return 1; }`)])
  ];
}

const mutationByCase = {
  'sm-empty-owner': 'empty-permits', 'sm-empty-reject-child': 'empty-permits',
  'sm-final-with-permits': 'final-with-permits', 'sm-duplicate-attribute': 'duplicate-attribute',
  'sm-wrong-index-tag': 'wrong-index-tag', 'sm-zero-index': 'zero-index', 'sm-oob-index': 'oob-index',
  'sm-bad-length': 'bad-length', 'sm-truncated-entries': 'truncated-entries',
  'sm-extra-attribute-byte': 'extra-attribute-byte', 'sm-invalid-child-code': 'invalid-child-code',
  'sm-duplicate-entry': 'duplicate-entry', 'sm-array-entry': 'array-entry', 'sm-old-major-opaque': 'old-major-opaque'
};
const u2 = value => { const bytes = Buffer.alloc(2); bytes.writeUInt16BE(value); return bytes; };

/** Edits are bounded original offsets, independently replayed by the runner. */
export function mutateSealedPayload(original, entry, binding) {
  assert.equal(binding.mutation, mutationByCase[entry.id], 'Fixed case-specific mutation recipe');
  const before = readSealedClass(original), pristine = Buffer.from(original), edits = [];
  assert.equal(before.name, binding.binaryName, 'Actual selected genuine carrier');
  const edit = (offset, removeBytes, bytes, reason) => edits.push({offset, removeBytes,
    beforeHex: original.subarray(offset, offset + removeBytes).toString('hex'), insertHex: bytes.toString('hex'), reason});
  const attribute = before.permittedAttributes[0];
  const rewritePermits = body => {
    assert.equal(before.permittedAttributes.length, 1, 'Single genuine original attribute');
    const header = Buffer.alloc(6); header.writeUInt16BE(attribute.nameIndex); header.writeUInt32BE(body.length, 2);
    edit(attribute.start, attribute.end - attribute.start, Buffer.concat([header, body]), 'Replace only the complete bounded PermittedSubclasses envelope');
  };
  switch (binding.mutation) {
    case 'empty-permits': rewritePermits(u2(0)); break;
    case 'final-with-permits':
      assert.equal(before.flags & 0x410, 0, 'Genuine concrete non-final owner isolates final plus permits');
      edit(before.layout.flagsOffset, 2, u2(before.flags | 0x10), 'Set only ACC_FINAL on the concrete sealed owner'); break;
    case 'duplicate-attribute':
      assert.equal(before.permittedAttributes.length, 1);
      edit(before.layout.attributes.countOffset, 2, u2(before.layout.attributes.entries.length + 1), 'Increment only class attribute count');
      edit(original.length, 0, original.subarray(attribute.start, attribute.end), 'Append a second exact original permits attribute'); break;
    case 'wrong-index-tag':
      assert.equal(before.layout.pool[attribute.nameIndex].tag, 1);
      edit(attribute.entries[0].indexOffset, 2, u2(attribute.nameIndex), 'Redirect one permits entry to the actual existing UTF8 name constant'); break;
    case 'zero-index': edit(attribute.entries[0].indexOffset, 2, u2(0), 'Set only one permits entry to the reserved zero index'); break;
    case 'oob-index': edit(attribute.entries[0].indexOffset, 2, u2(before.layout.pool.length), 'Set only one permits entry to the first index outside the genuine CP'); break;
    case 'bad-length': rewritePermits(Buffer.from([0])); break;
    case 'truncated-entries': rewritePermits(u2(1)); break;
    case 'extra-attribute-byte': rewritePermits(Buffer.concat([original.subarray(attribute.body, attribute.end), Buffer.from([0])])); break;
    case 'invalid-child-code': {
      const method = before.methods.find(item => item.name === 'value' && item.descriptor === '()I');
      assert.ok(method?.code); const returns = method.code.instructions.filter(instruction => instruction.name === 'ireturn');
      assert.equal(returns.length, 1); const offset = method.code.layout.instructionsOffset + returns[0].pc;
      assert.equal(original[offset], 0xac);
      edit(offset, 1, Buffer.from([0xb0]), 'Change only value()I ireturn to areturn; preserve every other Code byte'); break;
    }
    case 'duplicate-entry':
      edit(attribute.entries[1].indexOffset, 2, u2(attribute.entries[0].index), 'Repeat the existing Child ClassCP index, retaining multiplicity'); break;
    case 'array-entry': {
      const array = before.layout.pool.find(item => item?.tag === 7 && before.layout.pool[item.first]?.value === '[Lsealedmetadata/Child;');
      assert.ok(array, 'Genuine compiler array ClassCP from Base.arrayType()');
      edit(attribute.entries[1].indexOffset, 2, u2(array.index), 'Redirect only one permits entry to the genuine existing array ClassCP'); break;
    }
    case 'old-major-opaque': edit(6, 2, u2(60), 'Change only the major to pre-sealed 60, retaining the opaque attribute'); break;
    default: assert.fail('Known bounded sealed mutation');
  }
  let bytes = Buffer.from(original);
  for (const current of edits.slice().sort((a, b) => b.offset - a.offset)) {
    bytes = Buffer.concat([bytes.subarray(0, current.offset), Buffer.from(current.insertHex, 'hex'), bytes.subarray(current.offset + current.removeBytes)]);
  }
  assert.deepEqual(original, pristine, 'Immutable genuine compiler bytes');
  const after = readSealedClass(bytes);
  return {bytes, edits, originalSha256: sha(original), mutatedSha256: sha(bytes), evidence: {
    mutation: binding.mutation, originalMajor: before.major, mutatedMajor: after.major,
    originalFlags: before.flags, mutatedFlags: after.flags,
    permittedAttributes: after.permittedAttributes, originalCarrierSha256: sha(original),
    fullClassFileConformanceProven: false
  }};
}

const classFlags = (final = false) => ({required: 1 | (final ? 0x10 : 0), forbidden: 0x600 | (final ? 0 : 0x10)});
const initializer = {owner: driver, name: 'noteInitialization', descriptor: '()V'};
const genuineEntries = [{tag: 7, name: C, indexStatus: 'class', isArray: false},
  {tag: 7, name: G, indexStatus: 'class', isArray: false}];
function binding(id, tree, binaryName, compilationUnitId = 'metadata-original', mutation) {
  return {id: `${id}:${tree}:${binaryName}`, binaryName, compilationUnitId, loaderTree: tree,
    resourcePath: `sealed-payloads/sealed-metadata/${id}/${tree}/${binaryName.replaceAll('.', '/')}.bin`,
    ...(mutation ? {mutation} : {})};
}
function classProof(payload) {
  const evolved = payload.binaryName === C && payload.compilationUnitId !== 'metadata-original';
  const superName = payload.binaryName === B || payload.compilationUnitId === 'metadata-unrelated' ? 'java.lang.Object' :
    evolved ? G : B;
  return {kind: 'class', payloadId: payload.id, flags: classFlags(payload.mutation === 'final-with-permits'),
    superName, interfaceNames: [], permits: payload.binaryName === B ? [C, G] : null, passiveInitializer: initializer};
}
const rawAttribute = (entries = genuineEntries, declaredLength = 6, numberOfClasses = 2, extra = {}) => ({
  declaredLength, numberOfClasses, entries, nestedLengthMatches: true, missingEntryCount: 0, extraBytesHex: '', ...extra
});
function permitProof(payload) {
  let attributes;
  switch (payload.mutation) {
    case 'empty-permits': attributes = [rawAttribute([], 2, 0)]; break;
    case 'duplicate-attribute': attributes = [rawAttribute(), rawAttribute()]; break;
    case 'wrong-index-tag': attributes = [rawAttribute([{tag: 1, name: null, indexStatus: 'wrong-tag'}, genuineEntries[1]])]; break;
    case 'zero-index': attributes = [rawAttribute([{tag: null, name: null, indexStatus: 'zero'}, genuineEntries[1]])]; break;
    case 'oob-index': attributes = [rawAttribute([{tag: null, name: null, indexStatus: 'out-of-range'}, genuineEntries[1]])]; break;
    case 'bad-length': attributes = [rawAttribute([], 1, null, {nestedLengthMatches: false, missingEntryCount: null, extraBytesHex: '00'})]; break;
    case 'truncated-entries': attributes = [rawAttribute([], 2, 1, {nestedLengthMatches: false, missingEntryCount: 1})]; break;
    case 'extra-attribute-byte': attributes = [rawAttribute(genuineEntries, 7, 2, {nestedLengthMatches: false, extraBytesHex: '00'})]; break;
    case 'duplicate-entry': attributes = [rawAttribute([genuineEntries[0], genuineEntries[0]])]; break;
    case 'array-entry': attributes = [rawAttribute([genuineEntries[0], {tag: 7, name: '[Lsealedmetadata.Child;',
      internalName: '[Lsealedmetadata/Child;', indexStatus: 'class', isArray: true}])]; break;
    case 'old-major-opaque': attributes = [rawAttribute()]; break;
    default: assert.fail('Selected raw-attribute proof');
  }
  return {kind: 'permitted-attribute', payloadId: payload.id, flags: classFlags(),
    superName: 'java.lang.Object', interfaceNames: [], attributeCount: attributes.length, attributes};
}
function proofs(payloads) {
  return payloads.flatMap(payload => {
    const metadata = payload.binaryName === B && payload.mutation && payload.mutation !== 'final-with-permits' ? permitProof(payload) : classProof(payload);
    if (payload.binaryName !== C) return [metadata];
    return [metadata, {kind: 'method-code', payloadId: payload.id, name: 'value', descriptor: '()I',
      requiredOpcodes: ['iconst_1', payload.mutation === 'invalid-child-code' ? 'areturn' : 'ireturn']}];
  });
}

const operand = (name, descriptor, opcode = 'invokevirtual') => ({opcode, tag: 10, owner: 'java.lang.Class', name, descriptor});
const probe = (method, descriptor, requiredOpcodes, symbolicOperands) => ({method, descriptor, requiredOpcodes,
  ...(symbolicOperands ? {symbolicOperands} : {})});
const forName = operand('forName', '(Ljava/lang/String;ZLjava/lang/ClassLoader;)Ljava/lang/Class;', 'invokestatic');
const getPermits = operand('getPermittedSubclasses', '()[Ljava/lang/Class;');
const isSealed = operand('isSealed', '()Z');
const loaderDescriptor = `L${driver.replaceAll('.', '/')}$PayloadLoader;`;
const passive = probe('passive', `(Ljava/lang/String;${loaderDescriptor})Ljava/lang/Class;`, ['invokestatic', 'areturn'], [forName]);
const identities = probe('identities', `(Ljava/lang/Class;[Ljava/lang/Class;${loaderDescriptor})V`, ['invokevirtual', 'return'],
  [operand('getClassLoader', '()Ljava/lang/ClassLoader;'), operand('getSuperclass', '()Ljava/lang/Class;')]);
const formatIds = ['sm-final-with-permits', 'sm-duplicate-attribute', 'sm-wrong-index-tag', 'sm-zero-index',
  'sm-oob-index', 'sm-bad-length', 'sm-truncated-entries', 'sm-extra-attribute-byte'];
const skipIds = ['sm-missing-child', 'sm-loader-cnfe', 'sm-loader-linkage-error', 'sm-loader-assertion-error', 'sm-loader-runtime-exception'];
const taxonomyIds = ['sm-duplicate-entry', 'sm-array-entry', 'sm-old-major-opaque'];
// Reviewed independent discovery on the locked Corretto21.0.11 and25.0.3.
// These are literal regression oracles, never learned during official execution.
const taxonomyTraces = {
  'sm-duplicate-entry': ['owner=loaded', 'sealed=true', 'permitted=Child,Child', 'identity=direct-local', 'init=0'],
  'sm-array-entry': ['owner=loaded', 'sealed=true', 'permitted=Child', 'identity=direct-local', 'init=0'],
  'sm-old-major-opaque': ['owner=loaded', 'sealed=false', 'permitted=null', 'identity=not-applicable', 'init=0']
};
const taxonomyEvidence = {releases: [21, 25], toolchainVersions: ['21.0.11', '25.0.3'],
  rawStdoutSha256: '91c4d89ae883f81dbb0ff7e9e2c28eca6ff917f4eb7f63edb9cf95415d9bbe5f',
  oracleProvenance: 'Independent pre-freeze native taxonomy, manually reviewed before these literal outcomes were encoded.'};
const methods = [
  ['sm-empty-owner', 'caseEmptyOwner'], ['sm-empty-reject-child', 'caseEmptyRejectChild'],
  ['sm-final-with-permits', 'caseFinalWithPermits'], ['sm-duplicate-attribute', 'caseDuplicateAttribute'],
  ['sm-wrong-index-tag', 'caseWrongIndexTag'], ['sm-zero-index', 'caseZeroIndex'], ['sm-oob-index', 'caseOobIndex'],
  ['sm-bad-length', 'caseBadLength'], ['sm-truncated-entries', 'caseTruncatedEntries'], ['sm-extra-attribute-byte', 'caseExtraAttributeByte'],
  ['sm-missing-child', 'caseMissingChild'], ['sm-loader-cnfe', 'caseLoaderCnfe'], ['sm-loader-linkage-error', 'caseLoaderLinkageError'],
  ['sm-loader-assertion-error', 'caseLoaderAssertionError'], ['sm-loader-runtime-exception', 'caseLoaderRuntimeException'],
  ['sm-loader-vme-retry', 'caseLoaderVmeRetry'], ['sm-invalid-child-code', 'caseInvalidChildCode'],
  ['sm-unrelated-listed', 'caseUnrelatedListed'], ['sm-indirect-listed', 'caseIndirectListed'],
  ['sm-duplicate-entry', 'caseDuplicateEntry'], ['sm-array-entry', 'caseArrayEntry'], ['sm-old-major-opaque', 'caseOldMajorOpaque']
];
function entry([id, entryMethod]) {
  const format = formatIds.includes(id), skip = skipIds.includes(id), taxonomy = taxonomyIds.includes(id);
  const code = id === 'sm-invalid-child-code', vme = id === 'sm-loader-vme-retry';
  const evolved = ['sm-unrelated-listed', 'sm-indirect-listed'].includes(id);
  const payloads = [binding(id, 'primary', B, 'metadata-original', code ? undefined : mutationByCase[id])];
  if (!format && id !== 'sm-empty-owner') {
    if (id !== 'sm-missing-child') payloads.push(binding(id, 'primary', C,
      id === 'sm-unrelated-listed' ? 'metadata-unrelated' : id === 'sm-indirect-listed' ? 'metadata-indirect' : 'metadata-original',
      code ? mutationByCase[id] : undefined));
    if (id !== 'sm-empty-reject-child') payloads.push(binding(id, 'primary', G));
  }
  if (code) for (const name of [B, C, G]) payloads.push(binding(id, 'foreign', name));
  const trace = taxonomy ? taxonomyTraces[id] : format ? ['load=java.lang.ClassFormatError', 'published=false', 'init=0'] :
    skip ? ['owner=passive', 'permitted=Good', 'identity=direct-local', 'init=0'] :
    vme ? ['permitted-vme=original', 'permitted-retry=Child,Good', 'sealed-vme=original', 'sealed-retry=true', 'init=0'] :
    code ? ['passive=bad-child-visible', 'init-before=0', 'active=java.lang.VerifyError', 'identity=published', 'active-control=2'] :
    evolved ? ['owner=sealed', id === 'sm-indirect-listed' ? 'child=indirect' : 'child=unrelated', 'permitted=Good', 'identity=actual-parent-filter', 'init=0'] :
    id === 'sm-empty-owner' ? ['owner=sealed', 'permitted=empty', 'identity=owner-retained', 'init=0'] :
    ['owner=sealed', 'child=java.lang.IncompatibleClassChangeError', 'identity=owner-retained', 'init=0'];
  const probes = [probe(entryMethod, '()V', ['invokestatic', 'return'])];
  if (format) {
    probes.push(probe('formatFailure', '(Ljava/lang/String;)V', ['invokestatic', 'invokevirtual']),
      probe('exactFailure', `(Ljava/lang/String;${loaderDescriptor}Ljava/lang/Class;Z)Ljava/lang/Throwable;`, ['invokestatic', 'invokevirtual', 'areturn'], [forName]));
  } else {
    probes.push(passive);
    const helper = skip ? 'skipFailure' : evolved ? 'evolvedChild' : taxonomy ? 'taxonomy' : entryMethod;
    const descriptor = skip ? '(Ljava/lang/String;Ljava/lang/Throwable;)V' : evolved ? '(Ljava/lang/String;Z)V' : taxonomy ? '(Ljava/lang/String;)V' : '()V';
    probes.push(probe(helper, descriptor, ['invokevirtual'], [getPermits]));
    if (vme) probes.push(probe('originalVme', `(Ljava/lang/Class;${loaderDescriptor}L${driver.replaceAll('.', '/')}$SentinelVME;Z)V`,
      ['invokevirtual', 'if_acmpne', 'return'], [getPermits, isSealed]));
    if (skip || evolved || taxonomy || code || vme) probes.push(identities);
  }
  const pinned = skip || vme || code || taxonomy;
  return {id, entryMethod, entryDescriptor: '()V', kind: 'bounded-metadata-and-resource-only-loader',
    oracleKind: pinned ? 'pinned-native-regression' : 'specification', oracleStatus: 'fixed',
    trace, payloads, probes, sealedProofs: proofs(payloads),
    ...(taxonomy ? {nativeTaxonomyEvidence: taxonomyEvidence} : {}),
    anchors: {JLS: ['8.1.1.2', '8.1.6', ...(evolved ? ['13.4.2.1'] : [])],
      JVMS: ['4.7.31', '5.3.2', '5.3.5', ...(skip || vme || code || evolved ? ['5.4.3.1'] : []), ...(code ? ['5.4.1'] : [])]},
    limitations: ['Selected raw metadata, malformed envelopes and genuine evolved binaries; source/JVM-007 units remain unassessed.',
      'Class identity and direct-parent relationships are checked by genuine Java operations, never by binary-name equality.',
      'No permitted-array order, custom loader call count/order, SecurityManager, actual allocation OOM or named-module runtime claim.',
      ...(pinned ? ['Only the locked native21/25 behavior is asserted for selected passive metadata, failure and retry observations.'] : []),
      ...(vme ? ['Original injected VirtualMachineError identity and retry are exercised independently for both public APIs with fresh loaders.'] : []),
      ...(code ? ['One unchanged genuine active control is paired with the sole invalid-child return opcode mutation; no general verification/initialization completion claim.'] : []),
      ...(taxonomy ? ['Literal taxonomy observations are pinned to the reviewed locked native21/25 versions, not an API-wide uniqueness, array-entry or opaque-version guarantee.'] : [])]};
}

export default {
  id: 'sealed-metadata', source: 'classes/modern_fixture/JavaSealedMetadata.java', mainClass: driver,
  completionMarker: 'SEALED_METADATA_OK', kind: 'genuine-carriers-and-replayed-bounded-metadata',
  driverClassNames: [driver, driver + '$PayloadLoader', driver + '$SentinelVME'].sort(), sealedClassNames: [],
  compilationUnits: metadataCompilationUnits, mutatePayload: mutateSealedPayload, cases: methods.map(entry)
};
