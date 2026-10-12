'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {before, test} = require('node:test');
const root = path.resolve(__dirname, '..');
const prefix = 'java/lang/constant/', lookup = 'Ljava/lang/invoke/MethodHandles$Lookup;';
const cd = 'Ljava/lang/constant/ClassDesc;', mt = 'Ljava/lang/constant/MethodTypeDesc;';
let readStructureLayout, decodeCoreCode;
const units = new Map();
before(async () => {
  ({readStructureLayout} = await import('./java_class_structure_test.mjs'));
  ({decodeCoreCode} = await import('./java_core_bytecode.mjs'));
  for (const name of ['ClassDesc', 'ClassDescImpl', 'MethodTypeDesc', 'MethodTypeDescImpl']) {
    const filename = path.join(root, 'classes/modern_classlib/out', prefix + name + '.class');
    const stat = fs.lstatSync(filename);
    assert.ok(stat.isFile() && !stat.isSymbolicLink());
    const bytes = fs.readFileSync(filename);
    units.set(name, {bytes, layout: readStructureLayout(bytes)});
  }
});
function method(name, entryName, descriptor) {
  const unit = units.get(name);
  const matches = unit.layout.methods.entries.filter(entry => entry.name === entryName && entry.descriptor === descriptor);
  assert.equal(matches.length, 1, 'Exactly one genuine compiled declaration ' + name + '.' + entryName + descriptor);
  return matches[0];
}
function instructions(name, entryName, descriptor) {
  const unit = units.get(name), entry = method(name, entryName, descriptor);
  assert.ok(entry.code, 'Genuine compiled method has executable Code');
  return decodeCoreCode(unit.bytes.subarray(entry.code.instructionsOffset,
    entry.code.instructionsOffset + entry.code.codeLength), unit.layout.pool, unit.bytes);
}
function calls(name, entryName, descriptor) {
  return instructions(name, entryName, descriptor).filter(entry => entry.name.startsWith('invoke'));
}
function exceptions(name, entry) {
  const unit = units.get(name), attribute = entry.attributes.entries.find(item => item.name === 'Exceptions');
  assert.ok(attribute);
  const count = unit.bytes.readUInt16BE(attribute.body);
  assert.equal(attribute.length, 2 + count * 2);
  return Array.from({length: count}, (_, index) => {
    const cls = unit.layout.pool[unit.bytes.readUInt16BE(attribute.body + 2 + index * 2)];
    assert.equal(cls.tag, 7);
    return unit.layout.pool[cls.first].value;
  });
}

for (const [owner, result] of [['ClassDesc', 'Ljava/lang/Class;'], ['MethodTypeDesc', 'Ljava/lang/invoke/MethodType;']]) {
  const typed = '(' + lookup + ')' + result, erased = '(' + lookup + ')Ljava/lang/Object;';
  test(owner + ' declares the exact Java21 covariant resolver and retained erased bridge', () => {
    const declaration = method(owner, 'resolveConstantDesc', typed);
    assert.equal(declaration.flags, 0x0401);
    assert.equal(declaration.code, undefined);
    assert.deepEqual(exceptions(owner, declaration), ['java/lang/ReflectiveOperationException']);
    const bridge = method(owner, 'resolveConstantDesc', erased);
    assert.equal(bridge.flags, 0x1041);
    const invoke = calls(owner, 'resolveConstantDesc', erased);
    assert.equal(invoke.length, 1);
    assert.equal(invoke[0].name, 'invokeinterface');
    const {index, ...operand} = invoke[0].cp;
    assert.ok(Number.isInteger(index) && index > 0);
    assert.deepEqual(operand, {tag: 11, owner: 'java.lang.constant.' + owner,
      name: 'resolveConstantDesc', descriptor: typed});
  });
  test(owner + 'Impl covariant resolver has actual Code and bridge delegates to that exact descriptor', () => {
    const name = owner + 'Impl', declaration = method(name, 'resolveConstantDesc', typed);
    assert.equal(declaration.flags, 1);
    assert.ok(declaration.code);
    assert.deepEqual(exceptions(name, declaration), ['java/lang/ReflectiveOperationException']);
    assert.equal(method(name, 'resolveConstantDesc', erased).flags, 0x1041);
    const invoke = calls(name, 'resolveConstantDesc', erased);
    assert.equal(invoke.length, 1);
    assert.equal(invoke[0].name, 'invokevirtual');
    const {index, ...operand} = invoke[0].cp;
    assert.ok(Number.isInteger(index) && index > 0);
    assert.deepEqual(operand, {tag: 10, owner: 'java.lang.constant.' + name,
      name: 'resolveConstantDesc', descriptor: typed});
  });
}

test('ClassDesc.ofInternalName is an actual static factory delegating to checked descriptor construction', () => {
  const descriptor = '(Ljava/lang/String;)' + cd;
  assert.equal(method('ClassDesc', 'ofInternalName', descriptor).flags, 9);
  const invoke = calls('ClassDesc', 'ofInternalName', descriptor);
  assert.ok(invoke.some(entry => entry.cp.owner === 'java.lang.constant.ClassDesc'
    && entry.cp.name === 'ofDescriptor' && entry.cp.descriptor === descriptor && entry.name === 'invokestatic'));
});

test('MethodTypeDesc has exact Java21 noarg and List factories alongside the varargs factory', () => {
  assert.equal(method('MethodTypeDesc', 'of', '(' + cd + ')' + mt).flags, 9);
  assert.equal(method('MethodTypeDesc', 'of', '(' + cd + 'Ljava/util/List;)' + mt).flags, 9);
  assert.equal(method('MethodTypeDesc', 'of', '(' + cd + '[' + cd + ')' + mt).flags, 0x0089);
  const list = calls('MethodTypeDesc', 'of', '(' + cd + 'Ljava/util/List;)' + mt);
  assert.ok(list.some(entry => entry.cp.owner === 'java.util.List' && entry.cp.name === 'toArray'));
  assert.ok(list.some(entry => entry.cp.owner === 'java.lang.constant.MethodTypeDesc'
    && entry.cp.name === 'of' && entry.cp.descriptor === '(' + cd + '[' + cd + ')' + mt));
});

test('ClassDesc resolution uses genuine caller Lookup.findClass, never unchecked Class.forName', () => {
  const invoke = calls('ClassDescImpl', 'resolveConstantDesc', '(' + lookup + ')Ljava/lang/Class;');
  const checked = invoke.filter(entry => entry.cp.owner === 'java.lang.invoke.MethodHandles$Lookup'
    && entry.cp.name === 'findClass' && entry.cp.descriptor === '(Ljava/lang/String;)Ljava/lang/Class;');
  assert.equal(checked.length, 2, 'Both actual class and array paths are Lookup mediated');
  assert.ok(!invoke.some(entry => entry.cp.owner === 'java.lang.Class' && entry.cp.name === 'forName'));
});

test('MethodTypeDesc resolution checks actual return and parameter Class identities after parsing', () => {
  const invoke = calls('MethodTypeDescImpl', 'resolveConstantDesc', '(' + lookup + ')Ljava/lang/invoke/MethodType;');
  const parsed = invoke.filter(entry => entry.cp.owner === 'java.lang.invoke.MethodType'
    && entry.cp.name === 'fromMethodDescriptorString');
  assert.equal(parsed.length, 1);
  const checked = invoke.filter(entry => entry.cp.owner === 'java.lang.invoke.MethodHandles$Lookup'
    && entry.cp.name === 'accessClass' && entry.cp.descriptor === '(Ljava/lang/Class;)Ljava/lang/Class;');
  assert.equal(checked.length, 2, 'Return type and the actual parameter-array loop are checked');
  assert.ok(invoke.some(entry => entry.cp.owner === 'java.lang.invoke.MethodType' && entry.cp.name === 'returnType'));
  assert.ok(invoke.some(entry => entry.cp.owner === 'java.lang.invoke.MethodType' && entry.cp.name === 'parameterArray'));
});
