'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {before, test} = require('node:test');
const root = path.resolve(__dirname, '..');
const classlib = path.join(root, 'classes/modern_classlib/out/java/lang/constant');
const lookup = 'Ljava/lang/invoke/MethodHandles$Lookup;';
const typed = '(' + lookup + ')Ljava/lang/invoke/MethodHandle;';
const erased = '(' + lookup + ')Ljava/lang/Object;';
let readStructureLayout, decodeCoreCode;
const compiled = new Map();
before(async () => {
  ({readStructureLayout} = await import('./java_class_structure_test.mjs'));
  ({decodeCoreCode} = await import('./java_core_bytecode.mjs'));
  for (const name of ['MethodHandleDesc', 'DirectMethodHandleDesc', 'DirectMethodHandleDescImpl', 'AsTypeMethodHandleDesc']) {
    const filename = path.join(classlib, name + '.class'), stat = fs.lstatSync(filename);
    assert.ok(stat.isFile() && !stat.isSymbolicLink());
    const bytes = fs.readFileSync(filename);
    compiled.set(name, {bytes, layout: readStructureLayout(bytes)});
  }
});
function member(unit, name, descriptor) {
  const entries = unit.layout.methods.entries.filter(method => method.name === name && method.descriptor === descriptor);
  assert.equal(entries.length, 1, 'One genuine compiled declaration ' + name + descriptor);
  return entries[0];
}
function code(unit, method) {
  assert.ok(method.code, 'Genuine javac Code is present');
  return decodeCoreCode(unit.bytes.subarray(method.code.instructionsOffset,
    method.code.instructionsOffset + method.code.codeLength), unit.layout.pool, unit.bytes);
}
function exceptions(unit, method) {
  const attribute = method.attributes.entries.find(entry => entry.name === 'Exceptions');
  if (!attribute) return [];
  const count = unit.bytes.readUInt16BE(attribute.body);
  assert.equal(attribute.length, 2 + 2 * count);
  return Array.from({length: count}, (_, index) => {
    const cls = unit.layout.pool[unit.bytes.readUInt16BE(attribute.body + 2 + index * 2)];
    assert.equal(cls.tag, 7);
    return unit.layout.pool[cls.first].value;
  });
}

test('MethodHandleDesc redeclares the actual covariant MethodHandle resolution API', () => {
  const unit = compiled.get('MethodHandleDesc'), method = member(unit, 'resolveConstantDesc', typed);
  assert.equal(method.flags, 0x0401);
  assert.equal(method.code, undefined);
  assert.deepEqual(exceptions(unit, method), ['java/lang/ReflectiveOperationException']);
});

test('MethodHandleDesc has a genuine javac default bridge for erased ConstantDesc dispatch', () => {
  const unit = compiled.get('MethodHandleDesc'), method = member(unit, 'resolveConstantDesc', erased);
  assert.equal(method.flags, 0x1041, 'public synthetic bridge, not a native overlay');
  const instructions = code(unit, method);
  assert.deepEqual(instructions.map(instruction => instruction.name), ['aload_0', 'aload_1', 'invokeinterface', 'areturn']);
  assert.deepEqual(instructions[2].cp, {index: instructions[2].cp.index, tag: 11,
    owner: 'java.lang.constant.MethodHandleDesc', name: 'resolveConstantDesc', descriptor: typed});
  assert.deepEqual(exceptions(unit, method), ['java/lang/ReflectiveOperationException']);
});

for (const name of ['DirectMethodHandleDescImpl', 'AsTypeMethodHandleDesc']) {
  test(name + ' keeps a public typed Java resolution body and checked exception', () => {
    const unit = compiled.get(name), method = member(unit, 'resolveConstantDesc', typed);
    assert.equal(method.flags, 0x0001);
    assert.ok(method.code);
    assert.deepEqual(exceptions(unit, method), ['java/lang/ReflectiveOperationException']);
  });

  test(name + ' has a real javac erased bridge to its exact typed body', () => {
    const unit = compiled.get(name), method = member(unit, 'resolveConstantDesc', erased);
    assert.equal(method.flags, 0x1041);
    const instructions = code(unit, method);
    assert.deepEqual(instructions.map(instruction => instruction.name), ['aload_0', 'aload_1', 'invokevirtual', 'areturn']);
    assert.equal(instructions[2].cp.owner, 'java.lang.constant.' + name);
    assert.equal(instructions[2].cp.name, 'resolveConstantDesc');
    assert.equal(instructions[2].cp.descriptor, typed);
    assert.deepEqual(exceptions(unit, method), ['java/lang/ReflectiveOperationException']);
  });
}

test('direct descriptor resolution delegates all selected member operations to the supplied Lookup', () => {
  const unit = compiled.get('DirectMethodHandleDescImpl'), instructions = code(unit, member(unit, 'resolveConstantDesc', typed));
  const lookupCalls = instructions.filter(instruction => instruction.cp?.owner === 'java.lang.invoke.MethodHandles$Lookup')
    .map(instruction => instruction.cp.name);
  assert.deepEqual([...new Set(lookupCalls)].sort(), ['findConstructor', 'findGetter', 'findSetter', 'findSpecial',
    'findStatic', 'findStaticGetter', 'findStaticSetter', 'findVirtual', 'lookupClass'].sort());
  assert.equal(unit.layout.pool.filter(Boolean).some(entry => entry.tag === 1 && entry.value === 'IMPL_LOOKUP'), false);
});

test('asType descriptor resolution uses the covariant underlying API and the actual MethodHandle adapter', () => {
  const unit = compiled.get('AsTypeMethodHandleDesc'), instructions = code(unit, member(unit, 'resolveConstantDesc', typed));
  assert.ok(instructions.some(instruction => instruction.name === 'invokeinterface' &&
    instruction.cp.owner === 'java.lang.constant.MethodHandleDesc' && instruction.cp.name === 'resolveConstantDesc' &&
    instruction.cp.descriptor === typed));
  assert.ok(instructions.some(instruction => instruction.name === 'invokevirtual' &&
    instruction.cp.owner === 'java.lang.invoke.MethodHandle' && instruction.cp.name === 'asType' &&
    instruction.cp.descriptor === '(Ljava/lang/invoke/MethodType;)Ljava/lang/invoke/MethodHandle;'));
});
