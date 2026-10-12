'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {before, test} = require('node:test');
const root = path.resolve(__dirname, '..');
const runtime = process.env.DOPPIO_RELEASE_CLI_ROOT || path.join(root, 'build/release-cli');
const classlib = path.join(root, 'classes/modern_classlib/out');
const artifact = path.join(root, 'build/modern-bootstrap-overlay/modern-bootstrap.jar');
const rtJar = path.join(root, 'vendor/java_home/lib/rt.jar');
const prefix = 'java/lang/invoke/', lookup = 'Ljava/lang/invoke/MethodHandles$Lookup;',
  options = '[Ljava/lang/invoke/MethodHandles$Lookup$ClassOption;';
let readStructureLayout, decodeCoreCode;
const compiled = new Map();
const factories = [
  ['java/lang/invoke/MethodHandles$Lookup', 'defineHiddenClass', '([BZ' + options + ')' + lookup, 0x0081, 4],
  ['java/lang/invoke/MethodHandles$Lookup', 'defineHiddenClassWithClassData', '([BLjava/lang/Object;Z' + options + ')' + lookup, 0x0081, 5],
  ['java/lang/invoke/MethodHandles', 'classData', '(' + lookup + 'Ljava/lang/String;Ljava/lang/Class;)Ljava/lang/Object;', 0x0009, 3],
  ['java/lang/invoke/MethodHandles', 'classDataAt', '(' + lookup + 'Ljava/lang/String;Ljava/lang/Class;I)Ljava/lang/Object;', 0x0009, 4]
];
function className(unit, index) {
  assert.equal(unit.layout.pool[index]?.tag, 7);
  assert.equal(unit.layout.pool[unit.layout.pool[index].first]?.tag, 1);
  return unit.layout.pool[unit.layout.pool[index].first].value;
}
function method(unit, name, descriptor) {
  const entries = unit.layout.methods.entries.filter(member => member.name === name && member.descriptor === descriptor);
  assert.equal(entries.length, 1, 'Exactly one actual compiled declaration ' + name + descriptor);
  return entries[0];
}
function exceptions(unit, member) {
  const attribute = member.attributes.entries.find(entry => entry.name === 'Exceptions');
  if (!attribute) return [];
  const count = unit.bytes.readUInt16BE(attribute.body);
  assert.equal(attribute.length, 2 + count * 2);
  return Array.from({length: count}, (_, index) => className(unit, unit.bytes.readUInt16BE(attribute.body + 2 + index * 2)));
}
function instructions(unit, member) {
  assert.ok(member.code);
  return decodeCoreCode(unit.bytes.subarray(member.code.instructionsOffset,
    member.code.instructionsOffset + member.code.codeLength), unit.layout.pool, unit.bytes);
}
function innerEntries(unit) {
  const attribute = unit.layout.attributes.entries.find(entry => entry.name === 'InnerClasses');
  assert.ok(attribute, 'Actual nested type metadata is present');
  const count = unit.bytes.readUInt16BE(attribute.body);
  assert.equal(attribute.length, 2 + 8 * count);
  return Array.from({length: count}, (_, index) => {
    const start = attribute.body + 2 + index * 8;
    return {inner: className(unit, unit.bytes.readUInt16BE(start)),
      outer: unit.bytes.readUInt16BE(start + 2) === 0 ? null : className(unit, unit.bytes.readUInt16BE(start + 2)),
      name: unit.bytes.readUInt16BE(start + 4) === 0 ? null : unit.layout.pool[unit.bytes.readUInt16BE(start + 4)].value,
      flags: unit.bytes.readUInt16BE(start + 6)};
  });
}
before(async () => {
  ({readStructureLayout} = await import('./java_class_structure_test.mjs'));
  ({decodeCoreCode} = await import('./java_core_bytecode.mjs'));
  const {applyModernBootstrapOverlays} = require(path.join(runtime, 'src/ClassLoader'));
  const entries = execFileSync('unzip', ['-Z1', artifact], {encoding: 'utf8', timeout: 10000}).trim().split('\n');
  assert.equal(entries.length, 43, 'Exact complete compiler-facing class-only inventory');
  assert.ok(entries.every(entry => /^[A-Za-z0-9_$/]+\.class$/.test(entry)));
  assert.equal(new Set(entries).size, 43, 'No duplicate compiler-facing entries');
  for (const name of ['java/lang/invoke/MethodHandles', 'java/lang/invoke/MethodHandles$Lookup',
    'java/lang/reflect/Field', 'java/lang/Class']) {
    const stock = execFileSync('unzip', ['-p', rtJar, name + '.class'], {timeout: 10000}),
      bytes = applyModernBootstrapOverlays('L' + name + ';', stock),
      packaged = execFileSync('unzip', ['-p', artifact, name + '.class'], {timeout: 10000});
    assert.deepEqual(bytes, packaged, 'Actual runtime/compiler-facing transformed bytes agree exactly: ' + name);
    compiled.set(name, {bytes, layout: readStructureLayout(bytes), stock, stockLayout: readStructureLayout(stock)});
  }
  for (const name of ['DoppioHiddenClasses', 'MethodHandles$Lookup$ClassOption']) {
    const filename = path.join(classlib, prefix + name + '.class'), stat = fs.lstatSync(filename);
    assert.ok(stat.isFile() && !stat.isSymbolicLink());
    const original = fs.readFileSync(filename), bytes = applyModernBootstrapOverlays('L' + prefix + name + ';', original);
    compiled.set(prefix + name, {bytes, layout: readStructureLayout(bytes), original});
    if (name.endsWith('$ClassOption')) assert.deepEqual(execFileSync('unzip', ['-p', artifact, prefix + name + '.class'],
      {timeout: 10000}), bytes, 'Compiler-facing nested enum uses genuine compiled bytes and the runtime metadata overlay');
  }
});

test('hidden definition and class-data APIs have exact public Code, varargs, checked-exception and generic metadata', () => {
  for (const [owner, name, descriptor, flags, words] of factories) {
    const unit = compiled.get(owner), entry = method(unit, name, descriptor);
    assert.equal(entry.flags, flags);
    assert.equal(entry.code.maxStack, words);
    assert.equal(entry.code.maxLocals, words);
    assert.equal(entry.code.handlerCount, 0);
    assert.deepEqual(exceptions(unit, entry), ['java/lang/IllegalAccessException']);
    const decoded = instructions(unit, entry), calls = decoded.filter(instruction => instruction.name === 'invokestatic');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].cp.owner, 'java.lang.invoke.DoppioHiddenClasses');
    assert.equal(calls[0].cp.name, name);
    assert.equal(calls[0].cp.descriptor, owner.endsWith('$Lookup') ? '(' + lookup + descriptor.slice(1) : descriptor);
    assert.equal(decoded.at(-1).name, 'areturn');
    if (name.startsWith('classData')) {
      const signature = entry.attributes.entries.find(attribute => attribute.name === 'Signature');
      assert.ok(signature);
      const value = unit.layout.pool[unit.bytes.readUInt16BE(signature.body)].value;
      assert.equal(value, '<T:Ljava/lang/Object;>(' + lookup + 'Ljava/lang/String;Ljava/lang/Class<TT;>;' +
        (name === 'classDataAt' ? 'I' : '') + ')TT;');
    }
  }
});

test('ClassOption is a genuine compiled public enum with exactly NESTMATE/STRONG and reciprocal nested Lookup metadata', () => {
  const unit = compiled.get(prefix + 'MethodHandles$Lookup$ClassOption');
  assert.equal(unit.layout.flags, 0x4031);
  assert.deepEqual(unit.layout.fields.entries.filter(entry => (entry.flags & 1) !== 0)
    .map(entry => [entry.name, entry.descriptor, entry.flags]), [
    ['NESTMATE', 'Ljava/lang/invoke/MethodHandles$Lookup$ClassOption;', 0x4019],
    ['STRONG', 'Ljava/lang/invoke/MethodHandles$Lookup$ClassOption;', 0x4019]
  ]);
  const expected = {inner: prefix + 'MethodHandles$Lookup$ClassOption', outer: prefix + 'MethodHandles$Lookup',
    name: 'ClassOption', flags: 0x4019};
  assert.deepEqual(innerEntries(unit).filter(entry => entry.inner === expected.inner), [expected]);
  assert.deepEqual(innerEntries(compiled.get(prefix + 'MethodHandles$Lookup')).filter(entry => entry.inner === expected.inner), [expected]);
  assert.ok(method(unit, 'values', '()[Ljava/lang/invoke/MethodHandles$Lookup$ClassOption;').code);
  assert.ok(method(unit, 'valueOf', '(Ljava/lang/String;)Ljava/lang/invoke/MethodHandles$Lookup$ClassOption;').code);
});

test('all9 Field write wrappers call the fixed guard and retain complete original Code under private aliases', () => {
  const unit = compiled.get('java/lang/reflect/Field');
  const entries = [['set', 'Ljava/lang/Object;'], ['setBoolean', 'Z'], ['setByte', 'B'], ['setChar', 'C'],
    ['setShort', 'S'], ['setInt', 'I'], ['setLong', 'J'], ['setFloat', 'F'], ['setDouble', 'D']];
  for (const [name, type] of entries) {
    const descriptor = '(Ljava/lang/Object;' + type + ')V', entry = method(unit, name, descriptor),
      alias = method(unit, 'doppioHiddenFinalBase$' + name, descriptor),
      original = unit.stockLayout.methods.entries.find(member => member.name === name && member.descriptor === descriptor);
    assert.equal(alias.flags, (original.flags & ~7) | 2);
    assert.deepEqual(unit.bytes.subarray(alias.code.start, alias.code.end), unit.stock.subarray(original.code.start, original.code.end));
    const decoded = instructions(unit, entry), guard = decoded.find(instruction => instruction.name === 'invokestatic');
    assert.equal(guard.cp.owner, 'java.lang.invoke.DoppioHiddenClasses');
    assert.equal(guard.cp.name, 'checkFieldWritable');
    assert.equal(guard.cp.descriptor, '(Ljava/lang/reflect/Field;)V');
    assert.equal(decoded.filter(instruction => instruction.name === 'invokespecial').length, 1);
    assert.equal(decoded.find(instruction => instruction.name === 'invokespecial').cp.name, alias.name);
    assert.equal(decoded.at(-1).name, 'return');
  }
});

test('Lookup final-setter and Class canonical-name wrappers preserve complete stock Code and all original CP operands', () => {
  for (const [owner, name, aliasName, descriptor] of [
    [prefix + 'MethodHandles$Lookup', 'unreflectSetter', 'doppioHiddenFinalBase$unreflectSetter', '(Ljava/lang/reflect/Field;)Ljava/lang/invoke/MethodHandle;'],
    ['java/lang/Class', 'getCanonicalName', 'doppioHiddenCanonicalNameBase', '()Ljava/lang/String;']
  ]) {
    const unit = compiled.get(owner), original = unit.stockLayout.methods.entries.find(entry => entry.name === name && entry.descriptor === descriptor),
      alias = method(unit, aliasName, descriptor);
    assert.deepEqual(unit.bytes.subarray(alias.code.start, alias.code.end), unit.stock.subarray(original.code.start, original.code.end));
    assert.equal(alias.flags, (original.flags & ~7) | 2);
    const originalEnd = unit.stockLayout.pool.filter(Boolean).at(-1).end;
    assert.deepEqual(unit.bytes.subarray(10, originalEnd), unit.stock.subarray(10, originalEnd));
    assert.ok(method(unit, name, descriptor).code, 'Public replacement is genuine verified Code');
  }
});

test('compiled helper keeps defining/data/setter hooks private and exposes no trusted Lookup or class data Java field', () => {
  const unit = compiled.get(prefix + 'DoppioHiddenClasses'), privateNatives = [
    ['defineHiddenClass0', '(' + lookup + '[BLjava/lang/Object;Z' + options + ')' + lookup],
    ['classData0', '(' + lookup + ')Ljava/lang/Object;'],
    ['unreflectSetterBase', '(' + lookup + 'Ljava/lang/reflect/Field;)Ljava/lang/invoke/MethodHandle;']
  ];
  for (const [name, descriptor] of privateNatives) {
    const entry = method(unit, name, descriptor);
    assert.equal(entry.flags, 0x010a);
    assert.equal(entry.code, undefined);
    assert.deepEqual(exceptions(unit, entry), ['java/lang/IllegalAccessException']);
  }
  assert.deepEqual(unit.layout.fields.entries, [], 'Data is stored privately on the VM class identity, not a reflected Java field');
  assert.equal(unit.layout.pool.filter(Boolean).some(entry => entry.tag === 1 && entry.value === 'IMPL_LOOKUP'), false);
  const convert = instructions(unit, method(unit, 'convert', '(Ljava/lang/Object;Ljava/lang/Class;)Ljava/lang/Object;'));
  assert.ok(convert.some(instruction => instruction.cp?.owner === 'java.lang.Class' && instruction.cp.name === 'cast'));
  assert.ok(convert.some(instruction => instruction.cp?.owner === 'java.lang.invoke.MethodHandles' && instruction.cp.name === 'identity'));
  assert.ok(convert.some(instruction => instruction.cp?.owner === 'java.lang.invoke.MethodHandle' && instruction.cp.name === 'invoke' &&
    instruction.cp.descriptor === '(Ljava/lang/Object;)Ljava/lang/Object;'));
});
