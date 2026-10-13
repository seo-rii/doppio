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
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-classfile-annotation-attributes-')); fs.chmodSync(temporary, 0o700);
  output = path.join(temporary, 'compiled'); const support = path.join(temporary, 'support'); fs.mkdirSync(output); fs.mkdirSync(support);
  compileClassFileMetadata({root, classlib, output, support, checked});
  for (const name of ['RuntimeVisibleAnnotationsAttribute', 'RuntimeInvisibleAnnotationsAttribute',
    'RuntimeVisibleParameterAnnotationsAttribute', 'RuntimeInvisibleParameterAnnotationsAttribute', 'AnnotationDefaultAttribute']
    .map(name => 'attribute/' + name).concat(['Attributes', 'DoppioAnnotationAttributes'])) {
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
test('annotation attributes retain exact native non-Code declaration/method topology', () => {
  for (const name of ['RuntimeVisibleAnnotations', 'RuntimeInvisibleAnnotations'])
    assert.deepEqual(parents('attribute/' + name + 'Attribute'), [prefix + 'Attribute', prefix + 'ClassElement', prefix + 'MethodElement', prefix + 'FieldElement']);
  for (const name of ['RuntimeVisibleParameterAnnotations', 'RuntimeInvisibleParameterAnnotations', 'AnnotationDefault'])
    assert.deepEqual(parents('attribute/' + name + 'Attribute'), [prefix + 'Attribute', prefix + 'MethodElement']);
});
test('annotation factory descriptors retain native List/varargs distinctions and actual tagged default', () => {
  for (const name of ['RuntimeVisibleAnnotations', 'RuntimeInvisibleAnnotations']) {
    const owner = 'attribute/' + name + 'Attribute', result = 'L' + prefix + owner + ';';
    assert.equal(method(owner, 'of', '(Ljava/util/List;)' + result).flags, 9);
    assert.equal(method(owner, 'of', '([Ljava/lang/classfile/Annotation;)' + result).flags, 0x89);
    assert.equal(method(owner, 'annotations', '()Ljava/util/List;').flags, 0x401);
  }
  for (const name of ['RuntimeVisibleParameterAnnotations', 'RuntimeInvisibleParameterAnnotations']) {
    const owner = 'attribute/' + name + 'Attribute';
    assert.equal(method(owner, 'of', '(Ljava/util/List;)L' + prefix + owner + ';').flags, 9);
    assert.equal(units.get(owner).layout.methods.entries.filter(entry => entry.name === 'of').length, 1, 'No invented varargs factory');
    assert.equal(method(owner, 'parameterAnnotations', '()Ljava/util/List;').flags, 0x401);
  }
  assert.equal(method('attribute/AnnotationDefaultAttribute', 'of',
    '(Ljava/lang/classfile/AnnotationValue;)Ljava/lang/classfile/attribute/AnnotationDefaultAttribute;').flags, 9);
  assert.equal(method('attribute/AnnotationDefaultAttribute', 'defaultValue', '()Ljava/lang/classfile/AnnotationValue;').flags, 0x401);
});
test('five Attributes getters delegate to genuine typed semantic annotation codecs', () => {
  for (const name of ['runtimeVisibleAnnotations', 'runtimeInvisibleAnnotations', 'runtimeVisibleParameterAnnotations',
    'runtimeInvisibleParameterAnnotations', 'annotationDefault'])
    assert.ok(calls('Attributes', name, '()Ljava/lang/classfile/AttributeMapper;').some(value =>
      value.cp.owner === 'java.lang.classfile.DoppioAnnotationAttributes' && value.cp.name === name + 'Mapper'));
});
test('annotation decoder uses raw-entry factories for all thirteen value forms', () => {
  const instructions = calls('DoppioAnnotationAttributes', 'readValue',
    '(Ljava/lang/classfile/DoppioAnnotationAttributes$Cursor;)Ljava/lang/classfile/AnnotationValue;');
  for (const name of ['Byte', 'Char', 'Double', 'Float', 'Int', 'Long', 'Short', 'Boolean', 'String', 'Enum', 'Class', 'Annotation', 'Array'])
    assert.ok(instructions.some(value => value.cp.owner === 'java.lang.classfile.AnnotationValue' && value.cp.name === 'of' + name), name);
  for (const name of ['Byte', 'Char', 'Short', 'Boolean'])
    assert.ok(instructions.some(value => value.cp.name === 'of' + name && value.cp.descriptor.startsWith('(Ljava/lang/classfile/constantpool/IntegerEntry;')));
  assert.equal(instructions.some(value => value.cp.name === 'ofString' && value.cp.descriptor.includes('StringEntry;')), false);
});
test('semantic annotation writer traverses raw tagged values and imports through destination BufWriter', () => {
  const instructions = calls('DoppioAnnotationAttributes', 'writeValue', '(Ljava/lang/classfile/BufWriter;Ljava/lang/classfile/AnnotationValue;)V');
  assert.ok(instructions.some(value => value.cp.owner === 'java.lang.classfile.BufWriter' && value.cp.name === 'writeIndex'));
  assert.ok(instructions.some(value => value.cp.owner === 'java.lang.classfile.DoppioAnnotationAttributes' && value.cp.name === 'writeAnnotation'));
  assert.ok(instructions.some(value => value.cp.owner === 'java.lang.classfile.DoppioAnnotationAttributes' && value.cp.name === 'writeValue'));
  assert.equal(instructions.some(value => value.cp.name === 'retainedPayload' || value.cp.name === 'writeBytes'), false);
});
test('fresh-source actual guest executes recursive typed annotations and genuine NEW_POOL imports', () => {
  const diagnostic = path.join(temporary, 'diagnostic'); fs.mkdirSync(diagnostic);
  checked('javac', ['--release', '9', '--patch-module', 'java.base=' + output + path.delimiter + path.join(root, 'ci'),
    '-d', diagnostic, path.join(root, 'ci/ClassFileAnnotationAttributeRegression.java')]);
  const result = runClassFileMetadataGuest({root, output, diagnostic, checked,
    className: 'classes.modern_test.ClassFileAnnotationAttributeRegression',
    requiredPackages: ['java/lang/classfile', 'java/lang/classfile/attribute', 'java/lang/classfile/instruction', 'java/lang/classfile/constantpool']});
  assert.equal(result.stdout.replaceAll('\r\n', '\n'), 'CLASSFILE_ANNOTATION_ATTRIBUTE_REGRESSION_OK|86\n'); assert.equal(result.stderr, '');
});
