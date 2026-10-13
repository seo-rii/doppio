'use strict';

const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {before, after, test} = require('node:test');
const {compileClassFileMetadata, runClassFileMetadataGuest} = require('./compile_classfile_metadata.cjs');
const root = path.resolve(__dirname, '..'), classlib = path.join(root, 'classes/modern_classlib');
const prefix = 'java/lang/classfile/', units = new Map();
const tables = ['LineNumberTable', 'LocalVariableTable', 'LocalVariableTypeTable', 'CharacterRangeTable'];
const infos = ['LineNumber', 'LocalVariable', 'LocalVariableType', 'CharacterRange'];
let temporary, output, decodeCoreCode;
function checked(command, args, cwd = root, timeout = 60000) {
  const result = cp.spawnSync(command, args, {cwd, encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024});
  assert.equal(result.error, undefined, String(result.error)); assert.equal(result.signal, null);
  assert.equal(result.status, 0, (result.stderr || result.stdout).slice(-6000)); return result;
}
before(async () => {
  const {readStructureLayout} = await import('./java_class_structure_test.mjs');
  ({decodeCoreCode} = await import('./java_core_bytecode.mjs'));
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-classfile-debug-reader-')); fs.chmodSync(temporary, 0o700);
  output = path.join(temporary, 'compiled'); const support = path.join(temporary, 'support');
  fs.mkdirSync(output); fs.mkdirSync(support);
  compileClassFileMetadata({root, classlib, output, support, checked});
  const readers = fs.readdirSync(path.join(output, prefix)).filter(name => /^DoppioClassReader\$.*\.class$/.test(name))
    .map(name => name.slice(0, -6));
  for (const name of ['ClassFile$DebugElementsOption', 'ClassFile$LineNumbersOption', 'DoppioClassFile', 'DoppioClassReader',
    'DoppioDebugAttributes', ...readers, ...tables.map(name => 'attribute/' + name + 'Attribute'),
    'attribute/SourceDebugExtensionAttribute', ...infos.map(name => 'attribute/' + name + 'Info')]) {
    const filename = path.join(output, prefix, name + '.class'), stat = fs.lstatSync(filename);
    assert.ok(stat.isFile() && !stat.isSymbolicLink()); const bytes = fs.readFileSync(filename);
    assert.equal(bytes.readUInt16BE(6), 53, 'Genuine release9 output, not a changed version header');
    units.set(name, {bytes, layout: readStructureLayout(bytes)});
  }
});
after(() => { if (temporary) fs.rmSync(temporary, {recursive: true, force: true}); });
function method(owner, name, descriptor) {
  const matches = units.get(owner).layout.methods.entries.filter(entry => entry.name === name && entry.descriptor === descriptor);
  assert.equal(matches.length, 1, owner + '.' + name + descriptor); return matches[0];
}
function instructions(owner, entry) {
  const unit = units.get(owner); assert.ok(entry.code, 'Real Java body'); assert.equal(entry.flags & 0x100, 0);
  return decodeCoreCode(unit.bytes.subarray(entry.code.instructionsOffset, entry.code.instructionsOffset + entry.code.codeLength),
    unit.layout.pool, unit.bytes);
}
function calls(owner, name, descriptor) { return instructions(owner, method(owner, name, descriptor)).filter(entry => entry.name.startsWith('invoke')); }
function parents(owner) {
  const {layout, bytes} = units.get(owner);
  return Array.from({length: layout.interfaceCount}, (_, index) => {
    const entry = layout.pool[bytes.readUInt16BE(layout.interfacesOffset + index * 2)]; assert.equal(entry.tag, 7);
    return layout.pool[entry.first].value;
  });
}
test('independent debug and line enums retain exact native options and names', () => {
  for (const [name, values] of [['DebugElementsOption', ['PASS_DEBUG', 'DROP_DEBUG']],
    ['LineNumbersOption', ['PASS_LINE_NUMBERS', 'DROP_LINE_NUMBERS']]]) {
    const owner = 'ClassFile$' + name;
    assert.deepEqual(parents(owner), [prefix + 'ClassFile$Option']);
    assert.deepEqual(units.get(owner).layout.fields.entries.filter(entry => entry.flags === 0x4019).map(entry => entry.name), values);
  }
});
test('four raw Code debug tables are Attribute-only with genuine list factory bodies', () => {
  for (const [index, name] of tables.entries()) {
    const owner = 'attribute/' + name + 'Attribute'; assert.equal(units.get(owner).layout.flags, 0x601);
    assert.deepEqual(parents(owner), [prefix + 'Attribute']);
    const descriptor = '(Ljava/util/List;)Ljava/lang/classfile/attribute/' + name + 'Attribute;';
    assert.equal(method(owner, 'of', descriptor).flags, 9);
    assert.ok(calls(owner, 'of', descriptor).some(entry => entry.cp.owner === 'java.lang.classfile.DoppioDebugAttributes'));
    const getter = ['lineNumbers', 'localVariables', 'localVariableTypes', 'characterRangeTable'][index];
    assert.equal(method(owner, getter, '()Ljava/util/List;').flags, 0x401);
  }
  assert.deepEqual(parents('attribute/SourceDebugExtensionAttribute'), [prefix + 'Attribute', prefix + 'ClassElement']);
  assert.equal(method('attribute/SourceDebugExtensionAttribute', 'contents', '()[B').flags, 0x401);
  assert.equal(method('attribute/SourceDebugExtensionAttribute', 'of', '([B)Ljava/lang/classfile/attribute/SourceDebugExtensionAttribute;').flags, 9);
});
test('raw Info factories and absent local factories match actual native public descriptors', () => {
  for (const name of infos) assert.equal(units.get('attribute/' + name + 'Info').layout.flags, 0x601);
  for (const [name, parameters] of [['LineNumber', 'II'], ['CharacterRange', 'IIIII']])
    assert.equal(method('attribute/' + name + 'Info', 'of', '(' + parameters + ')Ljava/lang/classfile/attribute/' + name + 'Info;').flags, 9);
  for (const name of ['LocalVariable', 'LocalVariableType']) {
    const owner = 'attribute/' + name + 'Info';
    assert.ok(!units.get(owner).layout.methods.entries.some(entry => entry.name === 'of'), 'No invented local Info factory');
    for (const getter of ['startPc', 'length', 'slot']) assert.equal(method(owner, getter, '()I').flags, 0x401);
    assert.equal(method(owner, 'name', '()Ljava/lang/classfile/constantpool/Utf8Entry;').flags, 0x401);
  }
  assert.equal(method('attribute/LocalVariableInfo', 'typeSymbol', '()Ljava/lang/constant/ClassDesc;').flags, 1);
  assert.equal(method('attribute/LocalVariableTypeInfo', 'signature', '()Ljava/lang/classfile/constantpool/Utf8Entry;').flags, 0x401);
});
test('ClassFile parse and legacy reader overloads use the configured independent options', () => {
  const selected = '([BLjava/util/function/Function;Ljava/lang/classfile/ClassFile$DebugElementsOption;' +
    'Ljava/lang/classfile/ClassFile$LineNumbersOption;)Ljava/lang/classfile/ClassModel;';
  assert.ok(calls('DoppioClassFile', 'parse', '([B)Ljava/lang/classfile/ClassModel;').some(entry =>
    entry.cp.owner === 'java.lang.classfile.DoppioClassReader' && entry.cp.name === 'parse' && entry.cp.descriptor === selected));
  assert.ok(calls('DoppioClassReader', 'parse', '([BLjava/util/function/Function;)Ljava/lang/classfile/ClassModel;').some(entry =>
    entry.cp.owner === 'java.lang.classfile.DoppioClassReader' && entry.cp.name === 'parse' && entry.cp.descriptor === selected));
});
test('manual StackMap mapper delegates final-label serialization without defining or initializing classes', () => {
  assert.ok([...units.keys()].filter(name => name.startsWith('DoppioClassReader$')).some(owner =>
    units.get(owner).layout.methods.entries.filter(entry => entry.name === 'writeAttribute' && entry.code)
      .some(entry => instructions(owner, entry).some(call => call.cp?.owner === 'java.lang.classfile.DoppioBuilders' &&
        call.cp.name === 'writeStackMapAttribute' && call.cp.descriptor === '(Ljava/lang/classfile/BufWriter;' +
          'Ljava/lang/classfile/attribute/StackMapTableAttribute;)V'))));
  for (const owner of ['DoppioClassReader', 'DoppioDebugAttributes']) {
    for (const entry of units.get(owner).layout.methods.entries.filter(value => value.code))
      assert.ok(!instructions(owner, entry).some(call => call.cp && /^(?:defineClass|defineHiddenClass|initialize|ensureClassInitialized)$/.test(call.cp.name)));
  }
});
test('fresh-source guest executes debug options and legal deferred mapper/reader/writer lifecycle', () => {
  const diagnostic = path.join(temporary, 'diagnostic'); fs.mkdirSync(diagnostic);
  checked('javac', ['--release', '9', '--patch-module', 'java.base=' + output + path.delimiter + path.join(root, 'ci'),
    '-d', diagnostic, path.join(root, 'ci/ClassFileDebugReaderRegression.java')]);
  const result = runClassFileMetadataGuest({root, output, diagnostic, checked,
    className: 'classes.modern_test.ClassFileDebugReaderRegression',
    requiredPackages: ['java/lang/classfile', 'java/lang/classfile/attribute', 'java/lang/classfile/instruction', 'java/lang/classfile/constantpool']});
  assert.equal(result.stdout.replaceAll('\r\n', '\n'), 'CLASSFILE_DEBUG_READER_REGRESSION_OK|65\n');
  assert.equal(result.stderr, '');
});
