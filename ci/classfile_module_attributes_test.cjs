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
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'doppio-classfile-module-attributes-')); fs.chmodSync(temporary, 0o700);
  output = path.join(temporary, 'compiled'); const support = path.join(temporary, 'support'); fs.mkdirSync(output); fs.mkdirSync(support);
  compileClassFileMetadata({root, classlib, output, support, checked});
  for (const name of ['attribute/ModuleAttribute', 'attribute/ModuleAttribute$ModuleAttributeBuilder', 'attribute/ModuleRequireInfo',
    'attribute/ModuleExportInfo', 'attribute/ModuleOpenInfo', 'attribute/ModuleProvideInfo', 'attribute/ModuleHashInfo',
    'attribute/ModulePackagesAttribute', 'attribute/ModuleMainClassAttribute', 'attribute/ModuleTargetAttribute',
    'attribute/ModuleResolutionAttribute', 'attribute/ModuleHashesAttribute', 'Attributes', 'ClassFile',
    'DoppioModuleAttributes', 'DoppioModuleAttributes$Builder', 'DoppioModuleAttributes$Mapper', 'DoppioModuleAttributes$Cursor',
    ...Array.from({length: 6}, (_, index) => 'DoppioModuleAttributes$' + (index + 1))]) {
    const filename = path.join(output, prefix, name + '.class'), stat = fs.lstatSync(filename); assert.ok(stat.isFile() && !stat.isSymbolicLink());
    const bytes = fs.readFileSync(filename); assert.equal(bytes.readUInt16BE(6), 53, 'Genuine release9 module metadata output');
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
test('all six module attributes and five info types retain native class-only nominal topology', () => {
  for (const name of ['Module', 'ModulePackages', 'ModuleMainClass', 'ModuleTarget', 'ModuleResolution', 'ModuleHashes'])
    assert.deepEqual(parents('attribute/' + name + 'Attribute'), [prefix + 'Attribute', prefix + 'ClassElement']);
  for (const name of ['ModuleRequireInfo', 'ModuleExportInfo', 'ModuleOpenInfo', 'ModuleProvideInfo', 'ModuleHashInfo', 'ModuleAttribute$ModuleAttributeBuilder'])
    assert.deepEqual(parents('attribute/' + name), []);
});
test('module factory families preserve native counts and static List/varargs flags without invented overloads', () => {
  for (const [name, count] of [['ModuleAttribute', 3], ['ModuleRequireInfo', 4], ['ModuleExportInfo', 8], ['ModuleOpenInfo', 8],
    ['ModuleProvideInfo', 4], ['ModuleHashInfo', 2], ['ModulePackagesAttribute', 4], ['ModuleMainClassAttribute', 2],
    ['ModuleTargetAttribute', 2], ['ModuleResolutionAttribute', 1], ['ModuleHashesAttribute', 4]]) {
    const factories = units.get('attribute/' + name).layout.methods.entries.filter(entry => entry.name === 'of' || entry.name === 'ofNames');
    assert.equal(factories.length, count, name);
    for (const entry of factories) assert.equal(entry.flags, entry.descriptor.includes('[') && name !== 'ModuleHashInfo' ? 0x89 : 9, name + entry.descriptor);
  }
});
test('module getter delegation reaches six actual typed semantic mappers', () => {
  for (const name of ['module', 'modulePackages', 'moduleMainClass', 'moduleTarget', 'moduleResolution', 'moduleHashes'])
    assert.ok(calls('Attributes', name, '()Ljava/lang/classfile/AttributeMapper;').some(value =>
      value.cp.owner === 'java.lang.classfile.DoppioModuleAttributes' && value.cp.name === name + 'Mapper'));
});
test('module codecs import actual CP entries and frame every nested vector and raw hash length', () => {
  const indices = calls('DoppioModuleAttributes', 'writeEntries', '(Ljava/lang/classfile/BufWriter;Ljava/util/List;)V');
  assert.ok(indices.some(value => value.cp.owner === 'java.lang.classfile.BufWriter' && value.cp.name === 'writeU2'));
  assert.ok(indices.some(value => value.cp.owner === 'java.lang.classfile.BufWriter' && value.cp.name === 'writeIndex'));
  const module = calls('DoppioModuleAttributes$1', 'payload', '(Ljava/lang/classfile/BufWriter;Ljava/lang/classfile/attribute/ModuleAttribute;)V');
  for (const name of ['moduleName', 'moduleVersion', 'requires', 'exports', 'opens', 'uses', 'provides'])
    assert.ok(module.some(value => value.cp.owner === 'java.lang.classfile.attribute.ModuleAttribute' && value.cp.name === name), name);
  assert.equal(module.some(value => value.cp.name === 'writeBytes' || value.cp.name === 'retainedPayload'), false);
  const hashes = calls('DoppioModuleAttributes$6', 'payload', '(Ljava/lang/classfile/BufWriter;Ljava/lang/classfile/attribute/ModuleHashesAttribute;)V');
  for (const name of ['writeIndex', 'writeU2', 'writeBytes']) assert.ok(hashes.some(value => value.cp.owner === 'java.lang.classfile.BufWriter' && value.cp.name === name));
  assert.ok(hashes.some(value => value.cp.owner === 'java.lang.classfile.attribute.ModuleHashInfo' && value.cp.name === 'hash'));
});
test('module builder owns five real insertion-ordered sets and unbound factories use native temporary pool', () => {
  const builder = calls('DoppioModuleAttributes$Builder', '<init>', '(Ljava/lang/classfile/constantpool/ModuleEntry;)V');
  assert.equal(builder.filter(value => value.cp.owner === 'java.util.LinkedHashSet' && value.cp.name === '<init>').length, 5);
  assert.ok(calls('DoppioModuleAttributes', 'temporaryPool', '()Ljava/lang/classfile/constantpool/ConstantPoolBuilder;')
    .some(value => value.cp.owner === 'java.lang.classfile.constantpool.DoppioConstantPool' && value.cp.name === 'temporaryPool'));
  const header = calls('DoppioModuleAttributes$Mapper', 'writeAttribute', '(Ljava/lang/classfile/BufWriter;Ljava/lang/classfile/Attribute;)V');
  assert.ok(header.some(value => value.cp.owner === 'java.lang.classfile.BufWriter' && value.cp.name === 'patchInt'));
});
test('all four native module output API descriptors remain genuine Java bodies and actual file IO', () => {
  const attribute = 'Ljava/lang/classfile/attribute/ModuleAttribute;', consumer = 'Ljava/util/function/Consumer;', target = 'Ljava/nio/file/Path;';
  for (const descriptor of ['(' + attribute + ')[B', '(' + attribute + consumer + ')[B'])
    assert.ok(method('ClassFile', 'buildModule', descriptor).code);
  for (const descriptor of ['(' + target + attribute + ')V', '(' + target + attribute + consumer + ')V'])
    assert.ok(method('ClassFile', 'buildModuleTo', descriptor).code);
  assert.ok(calls('ClassFile', 'buildModuleTo', '(' + target + attribute + consumer + ')V')
    .some(value => value.cp.owner === 'java.nio.file.Files' && value.cp.name === 'write'));
});
test('fresh-source actual guest executes complete six-attribute module vectors, true pool import and owned file output', () => {
  const diagnostic = path.join(temporary, 'diagnostic'); fs.mkdirSync(diagnostic);
  checked('javac', ['--release', '9', '--patch-module', 'java.base=' + output + path.delimiter + path.join(root, 'ci'),
    '-d', diagnostic, path.join(root, 'ci/ClassFileModuleAttributeRegression.java')]);
  const result = runClassFileMetadataGuest({root, output, diagnostic, checked,
    className: 'classes.modern_test.ClassFileModuleAttributeRegression',
    requiredPackages: ['java/lang/classfile', 'java/lang/classfile/attribute', 'java/lang/classfile/constantpool', 'java/lang/constant']});
  assert.equal(result.stdout.replaceAll('\r\n', '\n'), 'CLASSFILE_MODULE_ATTRIBUTE_REGRESSION_OK|170\n'); assert.equal(result.stderr, '');
});
