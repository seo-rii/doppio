import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readRecordClass} from './java_record_metadata.mjs';

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const prefix = 'recordsignature.';
const signatures = {
  MissingRecord: 'Ljava/util/List<Lrecordsignature/Missing;>;',
  ArityRecord: 'Lrecordsignature/Box<Ljava/lang/String;>;',
  SignatureRecord: 'Ljava/util/List<Ljava/lang/String;>;'
};
const entries = [
  ['rs-missing-control', 'caseMissingControl', 'MissingRecord', ['Missing'], null, null],
  ['rs-arity-control', 'caseArityControl', 'ArityRecord', ['Box'], null, null],
  ['rs-signature-control', 'caseSignatureControl', 'SignatureRecord', [], null, null],
  ['rs-missing-type', 'caseMissingType', 'MissingRecord', [], 'java.lang.TypeNotPresentException', null],
  ['rs-arity-evolved', 'caseArityEvolved', 'ArityRecord', ['Box'], 'java.lang.reflect.MalformedParameterizedTypeException', null],
  ['rs-signature-token', 'caseSignatureToken', 'SignatureRecord', [], 'java.lang.reflect.GenericSignatureFormatError', '!'],
  ['rs-signature-void-array', 'caseSignatureVoidArray', 'SignatureRecord', [], 'java.lang.reflect.GenericSignatureFormatError', '[V'],
  ['rs-signature-unclosed', 'caseSignatureUnclosed', 'SignatureRecord', [], 'java.lang.reflect.GenericSignatureFormatError', 'Ljava/util/List<Ljava/lang/String;>']
];

export function signatureCarrierSources() {
  const initialization = 'static { classes.modern_test.JavaRecordSignatures.noteInitialization(); }';
  return [
    {binaryName: prefix + 'Missing', text: `package recordsignature; public class Missing { ${initialization} }\n`},
    {binaryName: prefix + 'Box', text: `package recordsignature; public class Box<T> { ${initialization} }\n`},
    {binaryName: prefix + 'MissingRecord', text: `package recordsignature; public record MissingRecord(java.util.List<Missing> value) { ${initialization} }\n`},
    {binaryName: prefix + 'ArityRecord', text: `package recordsignature; public record ArityRecord(Box<String> value) { ${initialization} }\n`},
    {binaryName: prefix + 'SignatureRecord', text: `package recordsignature; public record SignatureRecord(java.util.List<String> value) { ${initialization} }\n`}
  ];
}

export function signatureReplacementSources() {
  return [{binaryName: prefix + 'Box', text: 'package recordsignature; public class Box<A,B> { static { classes.modern_test.JavaRecordSignatures.noteInitialization(); } }\n'}];
}

/** Edits use original offsets and never modify a UTF8 shared by a backing field. */
export function mutateRecordComponentSignature(original, entry) {
  assert.equal(entry.kind, 'explicit-component-signature-mutation');
  assert.equal(typeof entry.payload.signature, 'string');
  const before = Buffer.from(original), metadata = readRecordClass(original), layout = metadata.layout;
  assert.equal(metadata.name, entry.payload.recordClass);
  assert.equal(metadata.record.components.length, 1);
  const component = metadata.record.components[0], field = metadata.fields.find(item => item.name === component.name);
  assert.ok(component.signatureIndexOffset !== null && field);
  assert.equal(component.signature, signatures.SignatureRecord);
  assert.equal(field.signature, component.signature);
  assert.equal(field.signatureIndex, component.signatureIndex, 'This genuine carrier actually shares its component/field UTF8');
  const value = Buffer.from(entry.payload.signature, 'utf8'), extra = Buffer.alloc(3 + value.length);
  extra[0] = 1; extra.writeUInt16BE(value.length, 1); value.copy(extra, 3);
  const count = layout.pool.length, newCount = Buffer.alloc(2), newIndex = Buffer.alloc(2);
  newCount.writeUInt16BE(count + 1); newIndex.writeUInt16BE(count);
  const edits = [
    {offset: 8, removeBytes: 2, beforeHex: original.subarray(8, 10).toString('hex'), insertHex: newCount.toString('hex'), reason: 'Append one otherwise unreferenced UTF8 constant'},
    {offset: layout.flagsOffset, removeBytes: 0, beforeHex: '', insertHex: extra.toString('hex'), reason: 'Keep every original CP byte and index unchanged'},
    {offset: component.signatureIndexOffset, removeBytes: 2,
      beforeHex: original.subarray(component.signatureIndexOffset, component.signatureIndexOffset + 2).toString('hex'),
      insertHex: newIndex.toString('hex'), reason: 'Redirect only the nested Record component Signature; leave backing Field untouched'}
  ];
  const bytes = edits.slice().sort((a, b) => b.offset - a.offset).reduce((data, edit) =>
    Buffer.concat([data.subarray(0, edit.offset), Buffer.from(edit.insertHex, 'hex'), data.subarray(edit.offset + edit.removeBytes)]), Buffer.from(original));
  assert.ok(original.equals(before), 'Immutable genuine original');
  const after = readRecordClass(bytes);
  assert.equal(after.major, metadata.major, 'Original modern version is retained');
  assert.equal(after.record.components[0].signature, entry.payload.signature);
  assert.equal(after.fields.find(item => item.name === component.name).signature, field.signature);
  assert.ok(bytes.subarray(10, layout.flagsOffset).equals(original.subarray(10, layout.flagsOffset)), 'Original CP bytes remain identical');
  const shift = extra.length;
  for (const member of [...layout.fields.entries, ...layout.methods.entries])
    assert.ok(bytes.subarray(member.start + shift, member.end + shift).equals(original.subarray(member.start, member.end)),
      'Every original field/method/Code attribute remains identical');
  const recordAttribute = layout.attributes.entries.find(attribute => attribute.name === 'Record');
  for (const attribute of layout.attributes.entries) if (attribute !== recordAttribute)
    assert.ok(bytes.subarray(attribute.start + shift, attribute.end + shift).equals(original.subarray(attribute.start, attribute.end)),
      'Unrelated class attributes remain identical');
  return {bytes, edits, originalSha256: sha(original), mutatedSha256: sha(bytes),
    evidence: {component: component.name, originalSignatureIndex: component.signatureIndex, replacementSignatureIndex: count,
      originalComponentIndexOffset: component.signatureIndexOffset, originalFieldSignatureIndex: field.signatureIndex,
      originalSignature: component.signature, replacementSignature: entry.payload.signature, modernMajorUnchanged: metadata.major}};
}

export default {
  id: 'record-signatures', source: 'classes/modern_fixture/JavaRecordSignatures.java',
  mainClass: 'classes.modern_test.JavaRecordSignatures', completionMarker: 'RECORD_SIGNATURES_OK',
  kind: 'genuine-evolution-and-explicit-component-signature-mutation',
  recordClassNames: ['recordsignature.ArityRecord', 'recordsignature.MissingRecord', 'recordsignature.SignatureRecord'],
  carrierSources: signatureCarrierSources, replacementSources: signatureReplacementSources,
  cases: entries.map(([id, entryMethod, recordName, supports, error, malformed]) => {
    const descriptor = recordName === 'ArityRecord' ? 'Lrecordsignature/Box;' : 'Ljava/util/List;';
    return {id, entryMethod, entryDescriptor: '()V',
      kind: malformed !== null ? 'explicit-component-signature-mutation' : error ? 'genuine-binary-evolution' : 'genuine-compiler-control',
      trace: ['loaded=passive', 'raw=unchanged', error ? 'component=' + error : 'component=parameterized',
        error && malformed === null ? 'field=' + error : 'field=parameterized', 'repeat=classes-and-raw-metadata', 'init=0'],
      // The genuine carrier body includes an allowed static initializer. Its
      // untouched zero marker proves metadata access does not activate it;
      // this is not complete record-body declaration conformance.
      anchors: {JLS: ['8.10', '8.10.1', '8.10.2', '8.10.3'], JVMS: ['4.7.9', '4.7.9.1', '4.7.30', '5.3.2']},
      payload: {recordClass: prefix + recordName, supportClasses: supports.map(name => prefix + name),
        replacement: id === 'rs-arity-evolved', signature: malformed === null ? signatures[recordName] : malformed,
        expectedError: error, missingClass: id === 'rs-missing-type' ? 'recordsignature.Missing' : null,
        resources: [recordName, ...supports].map(name => `core-record-signatures/${id}/recordsignature/${name}.bin`)},
      probes: [
        {method: 'inspect', descriptor: '(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/Class;ZLjava/lang/String;)V',
          requiredOpcodes: ['invokestatic', 'invokevirtual', 'aaload']},
        {method: 'generic', descriptor: '(Ljava/lang/reflect/RecordComponent;Ljava/lang/reflect/Field;Z)Ljava/lang/reflect/Type;',
          requiredOpcodes: ['invokevirtual', 'areturn']}
      ],
      recordProofs: [{kind: 'components', className: prefix + recordName,
        passiveInitializer: {owner: 'classes.modern_test.JavaRecordSignatures', name: 'noteInitialization', descriptor: '()V'},
        components: [{name: 'value', descriptor, signature: malformed === null ? signatures[recordName] : malformed}]},
      {kind: 'field', className: prefix + recordName, name: 'value', descriptor, signature: signatures[recordName]}]
    };
  })
};
