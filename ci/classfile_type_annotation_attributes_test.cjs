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
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-classfile-type-annotation-attributes-')); fs.chmodSync(temporary, 0o700);
  output = path.join(temporary, 'compiled'); const support = path.join(temporary, 'support'); fs.mkdirSync(output); fs.mkdirSync(support);
  compileClassFileMetadata({root, classlib, output, support, checked});
  for (const name of ['attribute/RuntimeVisibleTypeAnnotationsAttribute', 'attribute/RuntimeInvisibleTypeAnnotationsAttribute',
    'Attributes', 'DoppioTypeAnnotationAttributes', 'DoppioClassReader']) {
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
test('type annotation attributes retain all four exact native element locations', () => {
  for (const name of ['RuntimeVisibleTypeAnnotations', 'RuntimeInvisibleTypeAnnotations'])
    assert.deepEqual(parents('attribute/' + name + 'Attribute'),
      [prefix + 'Attribute', prefix + 'ClassElement', prefix + 'MethodElement', prefix + 'FieldElement', prefix + 'CodeElement']);
});
test('type attribute factories retain native List/varargs descriptors and typed getters', () => {
  for (const name of ['RuntimeVisibleTypeAnnotations', 'RuntimeInvisibleTypeAnnotations']) {
    const owner = 'attribute/' + name + 'Attribute', result = 'L' + prefix + owner + ';';
    assert.equal(method(owner, 'of', '(Ljava/util/List;)' + result).flags, 9);
    assert.equal(method(owner, 'of', '([Ljava/lang/classfile/TypeAnnotation;)' + result).flags, 0x89);
    assert.equal(method(owner, 'annotations', '()Ljava/util/List;').flags, 0x401);
  }
});
test('both Attributes getters delegate to actual typed type-annotation codecs', () => {
  for (const name of ['runtimeVisibleTypeAnnotations', 'runtimeInvisibleTypeAnnotations'])
    assert.ok(calls('Attributes', name, '()Ljava/lang/classfile/AttributeMapper;').some(value =>
      value.cp.owner === 'java.lang.classfile.DoppioTypeAnnotationAttributes' && value.cp.name === name + 'Mapper'));
});
test('type decoder handles all twenty-two real TargetInfo factories and recursive annotation suffix', () => {
  const instructions = calls('DoppioTypeAnnotationAttributes', 'readAnnotation',
    '(Ljava/lang/classfile/AttributedElement;Ljava/lang/classfile/DoppioAnnotationAttributes$Cursor;)Ljava/lang/classfile/TypeAnnotation;');
  for (const name of ['ClassTypeParameter', 'MethodTypeParameter', 'ClassExtends', 'ClassTypeParameterBound', 'MethodTypeParameterBound',
    'Field', 'MethodReturn', 'MethodReceiver', 'MethodFormalParameter', 'Throws', 'LocalVariable', 'ResourceVariable', 'ExceptionParameter',
    'InstanceofExpr', 'NewExpr', 'ConstructorReference', 'MethodReference', 'CastExpr', 'ConstructorInvocationTypeArgument',
    'MethodInvocationTypeArgument', 'ConstructorReferenceTypeArgument', 'MethodReferenceTypeArgument'])
    assert.ok(instructions.some(value => value.cp.owner === 'java.lang.classfile.TypeAnnotation$TargetInfo' && value.cp.name === 'of' + name), name);
  assert.ok(instructions.some(value => value.cp.owner === 'java.lang.classfile.DoppioAnnotationAttributes' && value.cp.name === 'readAnnotation'));
});
test('Code remapping changes real label-bearing targets without rewriting caller catch indices', () => {
  const instructions = calls('DoppioTypeAnnotationAttributes', 'remapCodeAttribute', '(Ljava/lang/classfile/Attribute;Ljava/util/function/UnaryOperator;)Ljava/lang/classfile/Attribute;');
  assert.ok(instructions.some(value => value.cp.owner === 'java.util.function.UnaryOperator' && value.cp.name === 'apply'));
  for (const name of ['ofVariable', 'ofOffset', 'ofTypeArgument'])
    assert.ok(instructions.some(value => value.cp.owner === 'java.lang.classfile.TypeAnnotation$TargetInfo' && value.cp.name === name));
  assert.equal(instructions.some(value => value.cp.name === 'ofExceptionParameter'), false);
});
test('type writer imports semantic suffix values and resolves labels through final Code layout context', () => {
  const label = calls('DoppioTypeAnnotationAttributes', 'labelToBci', '(Ljava/lang/classfile/BufWriter;Ljava/lang/classfile/Label;)I');
  assert.ok(label.some(value => value.cp.owner === 'java.lang.classfile.DoppioBufWriter' && value.cp.name === 'annotationLabelToBci'));
  const writer = calls('DoppioTypeAnnotationAttributes', 'writeAnnotation', '(Ljava/lang/classfile/BufWriter;Ljava/lang/classfile/TypeAnnotation;)V');
  assert.ok(writer.some(value => value.cp.owner === 'java.lang.classfile.DoppioAnnotationAttributes' && value.cp.name === 'writeAnnotation'));
  assert.equal(writer.some(value => value.cp.name === 'writeBytes' || value.cp.name === 'retainedPayload'), false);
  assert.ok(calls('DoppioClassReader', 'annotationLabel', '(Ljava/lang/classfile/AttributedElement;I)Ljava/lang/classfile/Label;')
    .some(value => value.cp.owner === 'java.lang.classfile.DoppioClassReader$CodeValue' && value.cp.name === 'debugLabel'));
});
test('fresh-source actual guest executes all target layouts, Code relocation and native policy boundaries', () => {
  const diagnostic = path.join(temporary, 'diagnostic'); fs.mkdirSync(diagnostic);
  checked('javac', ['--release', '9', '--patch-module', 'java.base=' + output + path.delimiter + path.join(root, 'ci'),
    '-d', diagnostic, path.join(root, 'ci/ClassFileTypeAnnotationAttributeRegression.java')]);
  const result = runClassFileMetadataGuest({root, output, diagnostic, checked,
    className: 'classes.modern_test.ClassFileTypeAnnotationAttributeRegression',
    requiredPackages: ['java/lang/classfile', 'java/lang/classfile/attribute', 'java/lang/classfile/instruction', 'java/lang/classfile/constantpool']});
  assert.equal(result.stdout.replaceAll('\r\n', '\n'), 'CLASSFILE_TYPE_ANNOTATION_ATTRIBUTE_REGRESSION_OK|225\n'); assert.equal(result.stderr, '');
});
