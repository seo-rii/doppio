'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {before, test} = require('node:test');
const root = path.resolve(__dirname, '..');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.join(root, 'build/release-cli');
const rtJar = path.join(root, 'vendor/java_home/lib/rt.jar');
const artifact = path.join(root, 'build/modern-bootstrap-overlay/modern-bootstrap.jar');
const classlib = path.join(root, 'classes/modern_classlib/out');
const lookup = 'Ljava/lang/invoke/MethodHandles$Lookup;', optional = 'Ljava/util/Optional;';
const prefix = 'java/lang/invoke/', constable = 'java/lang/constant/Constable';
const descriptorAlias = '$doppio$nominal$toMethodDescriptorString';
let readStructureLayout, decodeCoreCode;
function transformer() {
  const filename = path.join(runtime, 'src/ClassLoader.js');
  if (process.env.DOPPIO_VERIFY_SOURCE !== '1') return require(filename);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(require('typescript').transpileModule(fs.readFileSync(path.join(root, 'src/ClassLoader.ts'), 'utf8'),
    {compilerOptions: {target: 1, module: 1, ignoreDeprecations: '6.0'}}).outputText, filename);
  return loaded.exports;
}
const {applyModernBootstrapOverlays, ClassLoader} = transformer();
const {ReferenceClassData} = require(path.join(runtime, 'src/ClassData'));
const units = new Map(), originals = new Map();
function stock(name) {
  if (!originals.has(name)) originals.set(name, execFileSync('unzip', ['-p', rtJar, name + '.class'], {timeout: 10000}));
  return originals.get(name);
}
before(async () => {
  ({readStructureLayout} = await import('./java_class_structure_test.mjs'));
  ({decodeCoreCode} = await import('./java_core_bytecode.mjs'));
  for (const type of ['MethodHandle', 'MethodType']) {
    const name = prefix + type, original = stock(name), copy = Buffer.from(original);
    const bytes = applyModernBootstrapOverlays('L' + name + ';', original);
    assert.deepEqual(original, copy, 'No stock input mutation');
    units.set(type, {bytes, layout: readStructureLayout(bytes), original, stockLayout: readStructureLayout(original)});
  }
});
function className(unit, index) {
  assert.equal(unit.layout.pool[index]?.tag, 7);
  return unit.layout.pool[unit.layout.pool[index].first].value;
}
function interfaces(unit, layout = unit.layout, bytes = unit.bytes) {
  return Array.from({length: layout.interfaceCount}, (_, index) => {
    const reference = layout.pool[bytes.readUInt16BE(layout.interfacesOffset + 2 * index)];
    assert.equal(reference.tag, 7);
    return layout.pool[reference.first].value;
  });
}
function method(unit, name, descriptor) {
  const entries = unit.layout.methods.entries.filter(entry => entry.name === name && entry.descriptor === descriptor);
  assert.equal(entries.length, 1, 'One actual parsed declaration ' + name + descriptor);
  return entries[0];
}
function code(unit, entry) {
  assert.ok(entry.code, 'Actual nonnative parsed Code');
  return decodeCoreCode(unit.bytes.subarray(entry.code.instructionsOffset,
    entry.code.instructionsOffset + entry.code.codeLength), unit.layout.pool, unit.bytes);
}
function signature(unit, entry) {
  const attribute = entry.attributes.entries.find(item => item.name === 'Signature');
  return attribute ? unit.layout.pool[unit.bytes.readUInt16BE(attribute.body)].value : null;
}
function compiledVarHandleDesc() {
  const filename = path.join(classlib, 'java/lang/invoke/VarHandle$VarHandleDesc.class');
  const stat = fs.lstatSync(filename);
  assert.ok(stat.isFile() && !stat.isSymbolicLink());
  const bytes = fs.readFileSync(filename);
  return {bytes, layout: readStructureLayout(bytes)};
}

for (const type of ['MethodHandle', 'MethodType']) {
  test('stock ' + type + ' CP, flags, fields and original member bodies retain exact bytes', () => {
    const unit = units.get(type), {bytes, layout, original, stockLayout} = unit;
    const cpEnd = stockLayout.pool.filter(Boolean).at(-1).end;
    assert.deepEqual(bytes.subarray(10, cpEnd), original.subarray(10, cpEnd));
    assert.equal(layout.flags, stockLayout.flags);
    assert.equal(layout.thisClass, stockLayout.thisClass);
    assert.equal(bytes.readUInt16BE(layout.superClassOffset), original.readUInt16BE(stockLayout.superClassOffset));
    assert.deepEqual(bytes.subarray(layout.fields.countOffset, layout.fields.end),
      original.subarray(stockLayout.fields.countOffset, stockLayout.fields.end));
    for (const entry of stockLayout.methods.entries) {
      if (type === 'MethodType' && entry.name === 'toMethodDescriptorString' && entry.descriptor === '()Ljava/lang/String;') {
        const retained = method(unit, descriptorAlias, entry.descriptor);
        assert.equal(retained.flags, (entry.flags & ~7) | 2 | 0x1000, 'Only access/name/synthetic change for the stock descriptor alias');
        assert.deepEqual(bytes.subarray(retained.start + 4, retained.end), original.subarray(entry.start + 4, entry.end));
        continue;
      }
      const retained = method(unit, entry.name, entry.descriptor);
      assert.deepEqual(bytes.subarray(retained.start, retained.end), original.subarray(entry.start, entry.end));
    }
    assert.deepEqual(interfaces(unit), [...interfaces(unit, stockLayout, original), constable]);
    assert.equal(interfaces(unit).filter(name => name === constable).length, 1);
    // Stock classes have no generic class Signature; preserve every attribute.
    assert.ok(!stockLayout.attributes.entries.some(attribute => attribute.name === 'Signature'));
    assert.deepEqual(bytes.subarray(layout.attributes.countOffset), original.subarray(stockLayout.attributes.countOffset));
  });

  test('parsed ' + type + '.describeConstable has exact public Code, generic Optional and helper descriptor', () => {
    const unit = units.get(type), entry = method(unit, 'describeConstable', '()' + optional);
    assert.equal(entry.flags, 1, 'public instance, nonnative, nonabstract and nonvarargs');
    assert.deepEqual(entry.attributes.entries.map(attribute => attribute.name), ['Code', 'Signature']);
    assert.equal(signature(unit, entry), '()Ljava/util/Optional<Ljava/lang/constant/' + type + 'Desc;>;');
    assert.equal(entry.code.maxStack, 1);
    assert.equal(entry.code.maxLocals, 1);
    assert.equal(entry.code.handlerCount, 0);
    assert.deepEqual(entry.code.attributes.entries, []);
    const instructions = code(unit, entry);
    assert.deepEqual(instructions.map(instruction => instruction.name), ['aload_0', 'invokestatic', 'areturn']);
    const reference = instructions[1].cp;
    assert.deepEqual(reference, {index: reference.index, tag: 10, owner: 'java.lang.invoke.DoppioNominalConstants',
      name: 'describe' + type, descriptor: '(Ljava/lang/invoke/' + type + ';)' + optional});
    assert.equal(unit.stockLayout.methods.entries.some(old => old.name === 'describeConstable'), false);
  });
}

test('parsed MethodType.descriptorString delegates the identity-aware public descriptor method', () => {
  const unit = units.get('MethodType'), entry = method(unit, 'descriptorString', '()Ljava/lang/String;');
  assert.equal(entry.flags, 1);
  assert.deepEqual(entry.attributes.entries.map(attribute => attribute.name), ['Code']);
  assert.equal(entry.code.maxStack, 1);
  assert.equal(entry.code.maxLocals, 1);
  assert.equal(entry.code.handlerCount, 0);
  assert.deepEqual(entry.code.attributes.entries, []);
  const instructions = code(unit, entry);
  assert.deepEqual(instructions.map(instruction => instruction.name), ['aload_0', 'invokevirtual', 'areturn']);
  assert.deepEqual(instructions[1].cp, {index: instructions[1].cp.index, tag: 10, owner: 'java.lang.invoke.MethodType',
    name: 'toMethodDescriptorString', descriptor: '()Ljava/lang/String;'});
  const publicDescriptor = method(unit, 'toMethodDescriptorString', '()Ljava/lang/String;');
  assert.equal(publicDescriptor.flags, 0x0101, 'public native resolves held Class metadata, not a nominal name heuristic');
  assert.equal(publicDescriptor.code, undefined);
  assert.equal(unit.stockLayout.methods.entries.filter(candidate => candidate.code).length, 73);
});

test('parsed MethodType retains complete original descriptor Code under exactly one private synthetic alias', () => {
  const unit = units.get('MethodType'), descriptor = '()Ljava/lang/String;';
  const original = unit.stockLayout.methods.entries.find(entry => entry.name === 'toMethodDescriptorString' && entry.descriptor === descriptor);
  assert.ok(original?.code);
  const alias = method(unit, descriptorAlias, descriptor);
  assert.equal(alias.flags, (original.flags & ~7) | 2 | 0x1000);
  assert.equal(alias.descriptorIndex, original.descriptorIndex);
  assert.deepEqual(unit.bytes.subarray(alias.start + 4, alias.end), unit.original.subarray(original.start + 4, original.end),
    'Alias preserves descriptor, complete Code/StackMapTable and every non-Code attribute');
  assert.deepEqual(unit.bytes.subarray(alias.code.start, alias.code.end), unit.original.subarray(original.code.start, original.code.end));
  assert.equal(unit.layout.methods.entries.filter(entry => entry.name === descriptorAlias).length, 1);
  assert.equal(unit.layout.methods.entries.filter(entry => entry.code).length, 75, '73 retained stock bodies plus2 nominal Java delegates');
});

test('parsed actual Constable interface hierarchy preserves defining-loader identity for both held types', () => {
  // Install real parsed stock/shim hierarchy metadata. This explicit readiness
  // seam is not a verification, full linking or native/guest execution claim.
  const bootstrap = new ClassLoader(null), definitions = new Map();
  bootstrap.bootstrap = bootstrap;
  bootstrap.getLoaderObject = () => null;
  bootstrap._loadClass = () => assert.fail('No class loading in metadata isolation');
  const ifaceBytes = fs.readFileSync(path.join(classlib, constable + '.class'));
  function define(name) {
    if (definitions.has(name)) return definitions.get(name);
    const input = name === constable ? ifaceBytes : stock(name);
    const cls = new ReferenceClassData(applyModernBootstrapOverlays('L' + name + ';', input), null, bootstrap);
    definitions.set(name, cls);
    bootstrap.addClass(cls.getInternalName(), cls);
    const parent = cls.getSuperClassReference();
    cls.setResolved(parent === null ? null : define(parent.name.slice(1, -1)),
      cls.getInterfaceClassReferences().map(reference => define(reference.name.slice(1, -1))));
    return cls;
  }
  const iface = define(constable), owner = new ClassLoader(null);
  owner.bootstrap = bootstrap;
  owner.getLoaderObject = () => null;
  const foreign = new ReferenceClassData(ifaceBytes, null, owner);
  foreign.setResolved(define('java/lang/Object'), []);
  assert.equal(iface.getInternalName(), foreign.getInternalName());
  assert.notEqual(iface, foreign);
  const declaration = iface.getDeclaredMethod('describeConstable()Ljava/util/Optional;');
  assert.ok(declaration && declaration.accessFlags.isAbstract());
  for (const type of ['MethodHandle', 'MethodType']) {
    const cls = define(prefix + type);
    assert.ok(cls.isCastable(iface));
    assert.equal(cls.isCastable(foreign), false, 'Equal binary spelling is not equal loader identity');
    const implementation = cls.getDeclaredMethod('describeConstable()Ljava/util/Optional;');
    assert.ok(implementation && implementation.declaredCode && (implementation.declaredAccessFlags & 0x0100) === 0);
    assert.equal(implementation.cls, cls);
  }
});

test('compiler nominal MethodHandle/MethodType projection equals exact runtime bytes in the44-class artifact', () => {
  const entries = execFileSync('unzip', ['-Z1', artifact], {encoding: 'utf8', timeout: 10000}).trim().split('\n');
  assert.equal(entries.length, 44);
  assert.equal(new Set(entries).size, 44);
  assert.ok(entries.every(entry => /^[A-Za-z0-9_$/]+\.class$/.test(entry)));
  assert.ok(entries.includes('java/lang/invoke/MethodType.class'));
  assert.ok(entries.includes('java/lang/invoke/MethodHandles$Lookup$ClassOption.class'));
  for (const type of ['MethodHandle', 'MethodType']) {
    const packaged = execFileSync('unzip', ['-p', artifact, prefix + type + '.class'], {timeout: 10000});
    assert.deepEqual(packaged, units.get(type).bytes);
  }
});

test('compiled VarHandleDesc exposes genuine covariant VarHandle resolution and exact checked ClassDesc calls', () => {
  const unit = compiledVarHandleDesc(), typed = '(' + lookup + ')Ljava/lang/invoke/VarHandle;';
  const entry = method(unit, 'resolveConstantDesc', typed);
  assert.equal(entry.flags, 1);
  assert.ok(entry.code);
  const exceptions = entry.attributes.entries.find(attribute => attribute.name === 'Exceptions');
  assert.ok(exceptions && exceptions.length === 4);
  assert.equal(unit.bytes.readUInt16BE(exceptions.body), 1);
  assert.equal(className(unit, unit.bytes.readUInt16BE(exceptions.body + 2)), 'java/lang/ReflectiveOperationException');
  const calls = code(unit, entry).filter(instruction => instruction.name.startsWith('invoke'));
  assert.equal(calls.filter(instruction => instruction.cp.owner === 'java.lang.constant.ClassDesc'
    && instruction.cp.name === 'resolveConstantDesc' && instruction.cp.descriptor === '(' + lookup + ')Ljava/lang/Class;').length, 2);
  assert.deepEqual([...new Set(calls.filter(instruction => instruction.cp.owner === 'java.lang.invoke.MethodHandles$Lookup')
    .map(instruction => instruction.cp.name))].sort(), ['findStaticVarHandle', 'findVarHandle']);
  assert.ok(calls.some(instruction => instruction.cp.owner === 'java.lang.invoke.MethodHandles'
    && instruction.cp.name === 'arrayElementVarHandle'));
});

test('compiled VarHandleDesc has a genuine erased javac bridge to the exact covariant resolver', () => {
  const unit = compiledVarHandleDesc(), erased = '(' + lookup + ')Ljava/lang/Object;';
  const entry = method(unit, 'resolveConstantDesc', erased);
  assert.equal(entry.flags, 0x1041, 'public synthetic bridge, not a native trap');
  const instructions = code(unit, entry);
  assert.deepEqual(instructions.map(instruction => instruction.name), ['aload_0', 'aload_1', 'invokevirtual', 'areturn']);
  assert.deepEqual(instructions[2].cp, {index: instructions[2].cp.index, tag: 10,
    owner: 'java.lang.invoke.VarHandle$VarHandleDesc', name: 'resolveConstantDesc',
    descriptor: '(' + lookup + ')Ljava/lang/invoke/VarHandle;'});
});
