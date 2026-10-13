'use strict';

const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {before, after, test} = require('node:test');
const {compileClassFileMetadata, runClassFileMetadataGuest} = require('./compile_classfile_metadata.cjs');
const root = path.resolve(__dirname, '..'), classlib = path.join(root, 'classes/modern_classlib');
const units = new Map(), prefix = 'java/lang/classfile/';
const scalarKinds = [
  ['Byte', 'B', 'IntegerEntry', 'B', 'byteValue'], ['Char', 'C', 'IntegerEntry', 'C', 'charValue'],
  ['Short', 'S', 'IntegerEntry', 'S', 'shortValue'], ['Boolean', 'Z', 'IntegerEntry', 'Z', 'booleanValue'],
  ['Int', 'I', 'IntegerEntry', 'I', 'intValue'], ['Long', 'J', 'LongEntry', 'J', 'longValue'],
  ['Float', 'F', 'FloatEntry', 'F', 'floatValue'], ['Double', 'D', 'DoubleEntry', 'D', 'doubleValue'],
  ['String', 's', 'Utf8Entry', 'Ljava/lang/String;', 'stringValue']
];
let temporary, output, receipt, decodeCoreCode;
function checked(command, args, cwd = root, timeout = 60000) {
  const result = cp.spawnSync(command, args, {cwd, encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024});
  assert.equal(result.error, undefined, String(result.error)); assert.equal(result.signal, null);
  assert.equal(result.status, 0, (result.stderr || result.stdout).slice(-6000)); return result;
}
before(async () => {
  const {readStructureLayout} = await import('./java_class_structure_test.mjs');
  ({decodeCoreCode} = await import('./java_core_bytecode.mjs'));
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-classfile-annotation-')); fs.chmodSync(temporary, 0o700);
  output = path.join(temporary, 'compiled'); const support = path.join(temporary, 'support');
  fs.mkdirSync(output); fs.mkdirSync(support);
  receipt = compileClassFileMetadata({root, classlib, output, support, checked});
  const variants = ['Annotation', 'Array', 'Constant', 'Class', 'Enum', ...scalarKinds.map(row => row[0])];
  for (const relative of ['Annotation', 'AnnotationElement', 'AnnotationValue', 'DoppioAnnotations',
    ...variants.map(value => 'AnnotationValue$Of' + value),
    ...scalarKinds.map(row => 'DoppioAnnotations$' + row[0] + 'Value')]) {
    const filename = path.join(output, prefix, relative + '.class'), stat = fs.lstatSync(filename);
    assert.ok(stat.isFile() && !stat.isSymbolicLink()); const bytes = fs.readFileSync(filename);
    assert.equal(bytes.readUInt16BE(6), 53, 'Genuine target9 source output, never rewritten headers');
    units.set(relative, {bytes, layout: readStructureLayout(bytes)});
  }
});
after(() => { if (temporary) fs.rmSync(temporary, {recursive: true, force: true}); });
function method(owner, name, descriptor) {
  const matches = units.get(owner).layout.methods.entries.filter(entry => entry.name === name && entry.descriptor === descriptor);
  assert.equal(matches.length, 1, owner + '.' + name + descriptor); return matches[0];
}
function calls(owner, name, descriptor) {
  const unit = units.get(owner), entry = method(owner, name, descriptor);
  assert.ok(entry.code, 'Actual executable Java implementation'); assert.equal(entry.flags & 0x100, 0);
  return decodeCoreCode(unit.bytes.subarray(entry.code.instructionsOffset, entry.code.instructionsOffset + entry.code.codeLength), unit.layout.pool, unit.bytes)
    .filter(value => value.name.startsWith('invoke'));
}
function interfaces(owner) {
  const {bytes, layout} = units.get(owner);
  return Array.from({length: layout.interfaceCount}, (_, index) => {
    const entry = layout.pool[bytes.readUInt16BE(layout.interfacesOffset + 2 * index)];
    assert.equal(entry.tag, 7); return layout.pool[entry.first].value;
  });
}
test('annotation model interfaces have exact native nominal membership and all14 value variants', () => {
  for (const owner of ['Annotation', 'AnnotationElement', 'AnnotationValue']) {
    assert.equal(units.get(owner).layout.flags, 0x601); assert.deepEqual(interfaces(owner), []);
  }
  for (const kind of ['Annotation','Array','Constant','Class','Enum']) {
    const owner = 'AnnotationValue$Of' + kind;
    assert.equal(units.get(owner).layout.flags, 0x601); assert.deepEqual(interfaces(owner), [prefix + 'AnnotationValue']);
  }
  for (const [kind] of scalarKinds) assert.deepEqual(interfaces('AnnotationValue$Of' + kind), [prefix + 'AnnotationValue$OfConstant']);
});
test('all13 native tags are public static final int constants and tag is a genuine abstract getter', () => {
  const fields = units.get('AnnotationValue').layout.fields.entries;
  for (const name of ['BYTE','CHAR','DOUBLE','FLOAT','INT','LONG','SHORT','BOOLEAN','STRING','ENUM','CLASS','ANNOTATION','ARRAY']) {
    const entries = fields.filter(entry => entry.name === 'TAG_' + name);
    assert.equal(entries.length, 1); assert.equal(entries[0].descriptor, 'I'); assert.equal(entries[0].flags, 0x19);
  }
  assert.equal(method('AnnotationValue', 'tag', '()I').flags, 0x401);
});
test('raw and nominal annotation/element factories preserve precise List/varargs/UTF descriptors', () => {
  const result = 'Ljava/lang/classfile/Annotation;', element = 'Ljava/lang/classfile/AnnotationElement;', value = 'Ljava/lang/classfile/AnnotationValue;';
  for (const type of ['Ljava/lang/classfile/constantpool/Utf8Entry;', 'Ljava/lang/constant/ClassDesc;']) {
    assert.equal(method('Annotation', 'of', '(' + type + 'Ljava/util/List;)' + result).flags, 9);
    assert.equal(method('Annotation', 'of', '(' + type + '[' + element + ')' + result).flags, 0x89);
  }
  for (const name of ['Ljava/lang/String;', 'Ljava/lang/classfile/constantpool/Utf8Entry;'])
    assert.equal(method('AnnotationElement', 'of', '(' + name + value + ')' + element).flags, 9);
  const factories = [['Class','Ljava/lang/constant/ClassDesc;'],['Annotation',result],['Array','[' + value],
    ...scalarKinds.map(([name,,,descriptor]) => [name,descriptor])];
  for (const [name, parameter] of factories)
    assert.equal(method('AnnotationElement', 'of' + name, '(Ljava/lang/String;' + parameter + ')' + element).flags, name === 'Array' ? 0x89 : 9);
  for (const owner of ['Annotation','AnnotationValue$OfClass','AnnotationValue$OfEnum']) {
    assert.equal(method(owner, 'classSymbol', '()Ljava/lang/constant/ClassDesc;').flags, 1);
    assert.ok(calls(owner, 'classSymbol', '()Ljava/lang/constant/ClassDesc;').some(value => value.cp.owner === 'java.lang.constant.ClassDesc' && value.cp.name === 'ofDescriptor'));
  }
});
test('all raw scalar and nominal factories return their exact native nested value type', () => {
  for (const [kind,,entry,nominal] of scalarKinds) {
    const result = 'Ljava/lang/classfile/AnnotationValue$Of' + kind + ';';
    const raw = '(Ljava/lang/classfile/constantpool/' + entry + ';)' + result;
    assert.equal(method('AnnotationValue', 'of' + kind, raw).flags, 9);
    assert.ok(calls('AnnotationValue', 'of' + kind, raw).some(value => value.cp.owner === 'java.lang.classfile.DoppioAnnotations'));
    const descriptor = '(' + nominal + ')' + result;
    assert.equal(method('AnnotationValue', 'of' + kind, descriptor).flags, 9);
    assert.ok(calls('AnnotationValue', 'of' + kind, descriptor).some(value => value.cp.owner === 'java.lang.classfile.constantpool.DoppioConstantPool' && value.cp.name === 'temporaryPool'));
  }
  for (const parameter of ['Ljava/lang/classfile/constantpool/Utf8Entry;', 'Ljava/lang/constant/ClassDesc;'])
    assert.equal(method('AnnotationValue', 'ofClass', '(' + parameter + ')Ljava/lang/classfile/AnnotationValue$OfClass;').flags, 9);
  for (const parameters of ['Ljava/lang/classfile/constantpool/Utf8Entry;Ljava/lang/classfile/constantpool/Utf8Entry;', 'Ljava/lang/constant/ClassDesc;Ljava/lang/String;'])
    assert.equal(method('AnnotationValue', 'ofEnum', '(' + parameters + ')Ljava/lang/classfile/AnnotationValue$OfEnum;').flags, 9);
  assert.equal(method('AnnotationValue', 'ofAnnotation', '(Ljava/lang/classfile/Annotation;)Ljava/lang/classfile/AnnotationValue$OfAnnotation;').flags, 9);
  assert.equal(method('AnnotationValue', 'ofArray', '(Ljava/util/List;)Ljava/lang/classfile/AnnotationValue$OfArray;').flags, 9);
  assert.equal(method('AnnotationValue', 'ofArray', '([Ljava/lang/classfile/AnnotationValue;)Ljava/lang/classfile/AnnotationValue$OfArray;').flags, 0x89);
  assert.equal(method('AnnotationValue', 'of', '(Ljava/lang/Object;)Ljava/lang/classfile/AnnotationValue;').flags, 9);
});
test('all nine resolvedValue and entry covariance bridges are real javac interface/concrete methods', () => {
  const annotationEntry = 'Ljava/lang/classfile/constantpool/AnnotationConstantValueEntry;', constable = 'Ljava/lang/constant/Constable;';
  assert.equal(method('AnnotationValue$OfConstant', 'constant', '()' + annotationEntry).flags, 0x401);
  assert.equal(method('AnnotationValue$OfConstant', 'resolvedValue', '()' + constable).flags, 0x401);
  for (const [kind,,entry,,getter] of scalarKinds) {
    const owner = 'AnnotationValue$Of' + kind, box = 'Ljava/lang/' + (kind === 'Char' ? 'Character' : kind === 'Int' ? 'Integer' : kind) + ';';
    const entryType = 'Ljava/lang/classfile/constantpool/' + entry + ';';
    assert.equal(method(owner, 'constant', '()' + entryType).flags, 0x401);
    assert.equal(method(owner, 'resolvedValue', '()' + box).flags, 1);
    assert.ok(calls(owner, 'resolvedValue', '()' + box).some(value => value.cp.name === getter));
    for (const [name, bridgeType, realType] of [['constant', annotationEntry, entryType], ['resolvedValue', constable, box]]) {
      assert.equal(method(owner, name, '()' + bridgeType).flags, 0x1041);
      assert.ok(calls(owner, name, '()' + bridgeType).some(value => value.name === 'invokeinterface' && value.cp.descriptor === '()' + realType));
    }
    const helper = 'DoppioAnnotations$' + kind + 'Value';
    assert.equal(method(helper, 'constant', '()' + entryType).flags, 1);
    assert.equal(method(helper, 'constant', '()' + annotationEntry).flags, 0x1041);
    assert.ok(calls(helper, 'constant', '()' + annotationEntry).some(value => value.cp.descriptor === '()' + entryType));
  }
});
test('compiler expands only the exact four covariance sources while every normal facade retains release9', () => {
  const [, narrow, normal] = receipt.operations;
  const expected = ['java/lang/classfile/instruction/ConstantInstruction.java','java/lang/classfile/instruction/DoppioConstantInstructions.java',
    'java/lang/classfile/AnnotationValue.java','java/lang/classfile/DoppioAnnotations.java'];
  assert.deepEqual(narrow.arguments.slice(-4).map(file => path.relative(classlib,file).split(path.sep).join('/')), expected);
  assert.deepEqual(narrow.arguments.slice(0,7), ['-J-Dfile.encoding=UTF8','-source','9','-target','9','-implicit:none','--patch-module']);
  assert.deepEqual(normal.arguments.slice(0,4), ['-J-Dfile.encoding=UTF8','--release','9','--patch-module']);
  assert.ok(narrow.arguments.slice(-4).every(file => !normal.arguments.includes(file)));
  assert.equal(receipt.inputs.length, receipt.sourceHashes.length);
});
test('actual fresh guest executes all224 unchanged native annotation factory/bridge/attribute assertions', () => {
  const diagnostic = path.join(temporary, 'diagnostic'); fs.mkdirSync(diagnostic);
  checked('javac', ['--release','9','--patch-module','java.base=' + output + path.delimiter + path.join(root,'ci'),
    '-d',diagnostic,path.join(root,'ci/ClassFileAnnotationRegression.java')]);
  const result = runClassFileMetadataGuest({root, output, diagnostic, checked, className:'classes.modern_test.ClassFileAnnotationRegression',
    requiredPackages:['java/lang/classfile','java/lang/classfile/attribute','java/lang/classfile/constantpool']});
  assert.equal(result.stdout.replaceAll('\r\n','\n'), 'CLASSFILE_ANNOTATION_REGRESSION_OK|224\n'); assert.equal(result.stderr,'');
});
