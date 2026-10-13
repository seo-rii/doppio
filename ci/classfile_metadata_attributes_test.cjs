'use strict';
const assert = require('node:assert/strict'), cp = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {before, after, test} = require('node:test');
const {compileClassFileMetadata, runClassFileMetadataGuest} = require('./compile_classfile_metadata.cjs');
const root = path.resolve(__dirname, '..'), classlib = path.join(root, 'classes/modern_classlib'), prefix = 'java/lang/classfile/';
const units = new Map(); let temporary, output, decodeCoreCode;
function checked(command, args, cwd = root, timeout = 60000) {
  const result = cp.spawnSync(command, args, {cwd, encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024});
  assert.equal(result.error, undefined, String(result.error)); assert.equal(result.signal, null);
  assert.equal(result.status, 0, (result.stderr || result.stdout).slice(-6000)); return result;
}
before(async () => {
  const {readStructureLayout} = await import('./java_class_structure_test.mjs');
  ({decodeCoreCode} = await import('./java_core_bytecode.mjs'));
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-classfile-metadata-attributes-')); fs.chmodSync(temporary, 0o700);
  output = path.join(temporary, 'compiled'); const support = path.join(temporary, 'support'); fs.mkdirSync(output); fs.mkdirSync(support);
  compileClassFileMetadata({root, classlib, output, support, checked});
  for (const name of ['RecordAttribute', 'RecordComponentInfo', 'PermittedSubclassesAttribute', 'EnclosingMethodAttribute',
    'MethodParametersAttribute', 'MethodParameterInfo', 'SourceIDAttribute', 'CompilationIDAttribute'].map(name => 'attribute/' + name)
    .concat(['Attributes', 'DoppioMetadataAttributes', 'DoppioClassReader'])) {
    const filename = path.join(output, prefix, name + '.class'), stat = fs.lstatSync(filename); assert.ok(stat.isFile() && !stat.isSymbolicLink());
    const bytes = fs.readFileSync(filename); assert.equal(bytes.readUInt16BE(6), 53, 'Genuine release9 output');
    units.set(name, {bytes, layout: readStructureLayout(bytes)});
  }
});
after(() => { if (temporary) fs.rmSync(temporary, {recursive: true, force: true}); });
function method(owner, name, descriptor) {
  const matches = units.get(owner).layout.methods.entries.filter(entry => entry.name === name && entry.descriptor === descriptor);
  assert.equal(matches.length, 1, owner + '.' + name + descriptor); return matches[0];
}
function calls(owner, name, descriptor) {
  const unit = units.get(owner), entry = method(owner, name, descriptor); assert.ok(entry.code); assert.equal(entry.flags & 0x100, 0);
  return decodeCoreCode(unit.bytes.subarray(entry.code.instructionsOffset, entry.code.instructionsOffset + entry.code.codeLength),
    unit.layout.pool, unit.bytes).filter(value => value.name.startsWith('invoke'));
}
function parents(owner) {
  const {bytes, layout} = units.get(owner);
  return Array.from({length: layout.interfaceCount}, (_, index) => {
    const entry = layout.pool[bytes.readUInt16BE(layout.interfacesOffset + index * 2)]; assert.equal(entry.tag, 7);
    return layout.pool[entry.first].value;
  });
}
test('metadata types retain genuine native attributed/class/method topology', () => {
  assert.deepEqual(parents('attribute/RecordComponentInfo'), [prefix + 'AttributedElement']);
  assert.deepEqual(parents('attribute/MethodParameterInfo'), []);
  for (const name of ['Record', 'PermittedSubclasses', 'EnclosingMethod', 'SourceID', 'CompilationID'])
    assert.deepEqual(parents('attribute/' + name + 'Attribute'), [prefix + 'Attribute', prefix + 'ClassElement']);
  assert.deepEqual(parents('attribute/MethodParametersAttribute'), [prefix + 'Attribute', prefix + 'MethodElement']);
});
test('Record components retain all four native factory overload descriptors and executable field symbol', () => {
  const owner = 'attribute/RecordComponentInfo', result = 'Ljava/lang/classfile/attribute/RecordComponentInfo;';
  for (const first of ['Ljava/lang/classfile/constantpool/Utf8Entry;Ljava/lang/classfile/constantpool/Utf8Entry;',
    'Ljava/lang/String;Ljava/lang/constant/ClassDesc;']) {
    assert.equal(method(owner, 'of', '(' + first + 'Ljava/util/List;)' + result).flags, 9);
    assert.equal(method(owner, 'of', '(' + first + '[Ljava/lang/classfile/Attribute;)' + result).flags, 0x89);
  }
  assert.ok(calls(owner, 'descriptorSymbol', '()Ljava/lang/constant/ClassDesc;').some(value => value.cp.name === 'ofDescriptor'));
});
test('list and varargs metadata factories retain native return types and access flags', () => {
  for (const [name, item] of [['Record', 'Ljava/lang/classfile/attribute/RecordComponentInfo;'],
    ['PermittedSubclasses', 'Ljava/lang/classfile/constantpool/ClassEntry;'], ['MethodParameters', 'Ljava/lang/classfile/attribute/MethodParameterInfo;']]) {
    const owner = 'attribute/' + name + 'Attribute', result = 'Ljava/lang/classfile/attribute/' + name + 'Attribute;';
    assert.equal(method(owner, 'of', '(Ljava/util/List;)' + result).flags, 9);
    assert.equal(method(owner, 'of', '([' + item + ')' + result).flags, 0x89);
  }
  for (const parameter of ['Ljava/util/List;', '[Ljava/lang/constant/ClassDesc;'])
    assert.ok(method('attribute/PermittedSubclassesAttribute', 'ofSymbols', '(' + parameter + ')Ljava/lang/classfile/attribute/PermittedSubclassesAttribute;').code);
});
test('enclosing defaults, optional factories and parameter raw/flag factories match native ABI', () => {
  const enclosing = 'attribute/EnclosingMethodAttribute', result = 'Ljava/lang/classfile/attribute/EnclosingMethodAttribute;';
  for (const parameter of ['Ljava/lang/classfile/constantpool/ClassEntry;Ljava/util/Optional;',
    'Ljava/lang/constant/ClassDesc;Ljava/util/Optional;Ljava/util/Optional;']) assert.equal(method(enclosing, 'of', '(' + parameter + ')' + result).flags, 9);
  for (const name of ['enclosingMethodName', 'enclosingMethodType', 'enclosingMethodTypeSymbol']) assert.equal(method(enclosing, name, '()Ljava/util/Optional;').flags, 1);
  const owner = 'attribute/MethodParameterInfo', parameter = 'Ljava/lang/classfile/attribute/MethodParameterInfo;';
  assert.equal(method(owner, 'of', '(Ljava/util/Optional;I)' + parameter).flags, 9);
  assert.equal(method(owner, 'of', '(Ljava/util/Optional;[Ljava/lang/reflect/AccessFlag;)' + parameter).flags, 0x89);
  assert.equal(method(owner, 'ofParameter', '(Ljava/util/Optional;I)' + parameter).flags, 9);
  assert.equal(method(owner, 'flags', '()Ljava/util/Set;').flags, 1);
});
test('all six public mapper getters return the actual typed semantic codecs', () => {
  for (const name of ['record', 'permittedSubclasses', 'enclosingMethod', 'methodParameters', 'sourceId', 'compilationId'])
    assert.ok(calls('Attributes', name, '()Ljava/lang/classfile/AttributeMapper;').some(value =>
      value.cp.owner === 'java.lang.classfile.DoppioMetadataAttributes' && value.cp.name === name + 'Mapper'));
});
test('record decoder uses actual nested reader framing rather than an opaque payload adapter', () => {
  assert.ok(calls('DoppioMetadataAttributes', 'read', '(Ljava/lang/classfile/AttributedElement;Ljava/lang/classfile/ClassReader;' +
    'Ljava/lang/classfile/constantpool/Utf8Entry;I[B)Ljava/lang/classfile/Attribute;').some(value =>
      value.cp.owner === 'java.lang.classfile.DoppioClassReader' && value.cp.name === 'readNestedAttributes' &&
      value.cp.descriptor === '(Ljava/lang/classfile/AttributedElement;Ljava/lang/classfile/ClassReader;[II)Ljava/util/List;'));
});
test('fresh-source actual guest executes typed metadata and recursive fresh-pool record imports', () => {
  const diagnostic = path.join(temporary, 'diagnostic'); fs.mkdirSync(diagnostic);
  checked('javac', ['--release', '9', '--patch-module', 'java.base=' + output + path.delimiter + path.join(root, 'ci'),
    '-d', diagnostic, path.join(root, 'ci/ClassFileMetadataAttributeRegression.java')]);
  const result = runClassFileMetadataGuest({root, output, diagnostic, checked,
    className: 'classes.modern_test.ClassFileMetadataAttributeRegression',
    requiredPackages: ['java/lang/classfile', 'java/lang/classfile/attribute', 'java/lang/classfile/instruction', 'java/lang/classfile/constantpool']});
  assert.equal(result.stdout.replaceAll('\r\n', '\n'), 'CLASSFILE_METADATA_ATTRIBUTE_REGRESSION_OK|57\n'); assert.equal(result.stderr, '');
});
