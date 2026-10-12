'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {before, test} = require('node:test');

const root = path.resolve(__dirname, '..');
const classlib = path.join(root, 'classes/modern_classlib/out');
const runtimeRoot = process.env.DOPPIO_RELEASE_CLI_ROOT || path.join(root, 'build/release-cli');
const artifact = path.join(root, 'build/modern-bootstrap-overlay/modern-bootstrap.jar');
const prefix = 'java/lang/invoke/';
const variable = 'Ljava/lang/invoke/VarHandle;';
const mode = 'Ljava/lang/invoke/VarHandle$AccessMode;';
const handle = 'Ljava/lang/invoke/MethodHandle;';
const type = 'Ljava/lang/invoke/MethodType;';
const lookup = 'Ljava/lang/invoke/MethodHandles$Lookup;';
const cls = 'Ljava/lang/Class;';
const text = 'Ljava/lang/String;';
const field = 'Ljava/lang/reflect/Field;';
const erased = '([Ljava/lang/Object;)';

// Independent public declaration inventory, not imported runtime mode tables.
// These units inspect compiled shared-library bytes, not genuine javac 21/25
// driver execution. Fences, nominal descriptors and complete API conformance
// remain outside the selected C3 surface.
const accessModes = [
  ['GET', 'get', 'Ljava/lang/Object;'],
  ['SET', 'set', 'V'],
  ['GET_VOLATILE', 'getVolatile', 'Ljava/lang/Object;'],
  ['SET_VOLATILE', 'setVolatile', 'V'],
  ['GET_ACQUIRE', 'getAcquire', 'Ljava/lang/Object;'],
  ['SET_RELEASE', 'setRelease', 'V'],
  ['GET_OPAQUE', 'getOpaque', 'Ljava/lang/Object;'],
  ['SET_OPAQUE', 'setOpaque', 'V'],
  ['COMPARE_AND_SET', 'compareAndSet', 'Z'],
  ['COMPARE_AND_EXCHANGE', 'compareAndExchange', 'Ljava/lang/Object;'],
  ['COMPARE_AND_EXCHANGE_ACQUIRE', 'compareAndExchangeAcquire', 'Ljava/lang/Object;'],
  ['COMPARE_AND_EXCHANGE_RELEASE', 'compareAndExchangeRelease', 'Ljava/lang/Object;'],
  ['WEAK_COMPARE_AND_SET_PLAIN', 'weakCompareAndSetPlain', 'Z'],
  ['WEAK_COMPARE_AND_SET', 'weakCompareAndSet', 'Z'],
  ['WEAK_COMPARE_AND_SET_ACQUIRE', 'weakCompareAndSetAcquire', 'Z'],
  ['WEAK_COMPARE_AND_SET_RELEASE', 'weakCompareAndSetRelease', 'Z'],
  ['GET_AND_SET', 'getAndSet', 'Ljava/lang/Object;'],
  ['GET_AND_SET_ACQUIRE', 'getAndSetAcquire', 'Ljava/lang/Object;'],
  ['GET_AND_SET_RELEASE', 'getAndSetRelease', 'Ljava/lang/Object;'],
  ['GET_AND_ADD', 'getAndAdd', 'Ljava/lang/Object;'],
  ['GET_AND_ADD_ACQUIRE', 'getAndAddAcquire', 'Ljava/lang/Object;'],
  ['GET_AND_ADD_RELEASE', 'getAndAddRelease', 'Ljava/lang/Object;'],
  ['GET_AND_BITWISE_OR', 'getAndBitwiseOr', 'Ljava/lang/Object;'],
  ['GET_AND_BITWISE_OR_RELEASE', 'getAndBitwiseOrRelease', 'Ljava/lang/Object;'],
  ['GET_AND_BITWISE_OR_ACQUIRE', 'getAndBitwiseOrAcquire', 'Ljava/lang/Object;'],
  ['GET_AND_BITWISE_AND', 'getAndBitwiseAnd', 'Ljava/lang/Object;'],
  ['GET_AND_BITWISE_AND_RELEASE', 'getAndBitwiseAndRelease', 'Ljava/lang/Object;'],
  ['GET_AND_BITWISE_AND_ACQUIRE', 'getAndBitwiseAndAcquire', 'Ljava/lang/Object;'],
  ['GET_AND_BITWISE_XOR', 'getAndBitwiseXor', 'Ljava/lang/Object;'],
  ['GET_AND_BITWISE_XOR_RELEASE', 'getAndBitwiseXorRelease', 'Ljava/lang/Object;'],
  ['GET_AND_BITWISE_XOR_ACQUIRE', 'getAndBitwiseXorAcquire', 'Ljava/lang/Object;']
];
const queryMethods = [
  ['varType', '()' + cls, 0x0001],
  ['coordinateTypes', '()Ljava/util/List;', 0x0001],
  ['hasInvokeExactBehavior', '()Z', 0x0001],
  ['withInvokeExactBehavior', '()' + variable, 0x0401],
  ['withInvokeBehavior', '()' + variable, 0x0401],
  ['accessModeType', '(' + mode + ')' + type, 0x0011],
  ['isAccessModeSupported', '(' + mode + ')Z', 0x0001],
  ['toMethodHandle', '(' + mode + ')' + handle, 0x0001],
  ['describeConstable', '()Ljava/util/Optional;', 0x0001],
  ['toString', '()Ljava/lang/String;', 0x0011]
];
const fieldFactoryType = '(' + cls + text + cls + ')' + variable;
const invokerType = '(' + mode + type + ')' + handle;
const facadeFactories = [
  ['findVarHandle', '(' + lookup + fieldFactoryType.slice(1)],
  ['findStaticVarHandle', '(' + lookup + fieldFactoryType.slice(1)],
  ['unreflectVarHandle', '(' + lookup + field + ')' + variable],
  ['arrayElementVarHandle', '(' + cls + ')' + variable],
  ['varHandleInvoker', invokerType],
  ['varHandleExactInvoker', invokerType],
  ['invoker', '(' + mode + type + 'Z)' + handle],
  ['findVirtual', '(' + lookup + cls + text + type + ')' + handle]
];
let readStructureLayout;
let decodeCoreCode;
const compiled = new Map();

function className(layout, index) {
  assert.equal(layout.pool[index]?.tag, 7, 'Class metadata references an actual Class constant');
  const value = layout.pool[layout.pool[index].first];
  assert.equal(value?.tag, 1);
  return value.value;
}

function signature(unit, metadata) {
  const attribute = metadata.attributes.entries.find(entry => entry.name === 'Signature');
  if (!attribute) return null;
  assert.equal(attribute.length, 2);
  const value = unit.layout.pool[unit.bytes.readUInt16BE(attribute.body)];
  assert.equal(value?.tag, 1);
  return value.value;
}

function exceptions(unit, member) {
  const attribute = member.attributes.entries.find(entry => entry.name === 'Exceptions');
  if (!attribute) return [];
  const count = unit.bytes.readUInt16BE(attribute.body);
  assert.equal(attribute.length, 2 + count * 2);
  return Array.from({length: count}, (_, index) =>
    className(unit.layout, unit.bytes.readUInt16BE(attribute.body + 2 + index * 2)));
}

function method(unit, name, descriptor) {
  const members = unit.layout.methods.entries.filter(entry => entry.name === name && entry.descriptor === descriptor);
  assert.equal(members.length, 1, 'Exactly one compiled declaration: ' + name + descriptor);
  return members[0];
}

function code(unit, member) {
  assert.ok(member.code, 'Compiled non-native, non-abstract method has genuine Code');
  const metadata = member.code;
  return decodeCoreCode(unit.bytes.subarray(metadata.instructionsOffset,
    metadata.instructionsOffset + metadata.codeLength), unit.layout.pool, unit.bytes);
}

function publicMethods(unit) {
  return unit.layout.methods.entries.filter(member => (member.flags & 0x0001) !== 0)
    .map(member => [member.name, member.descriptor, member.flags]).sort((first, second) =>
      (first[0] + first[1]).localeCompare(second[0] + second[1]));
}

function expectedPublicMethods(entries) {
  return entries.map(entry => [...entry]).sort((first, second) =>
    (first[0] + first[1]).localeCompare(second[0] + second[1]));
}

before(async () => {
  ({readStructureLayout} = await import('./java_class_structure_test.mjs'));
  ({decodeCoreCode} = await import('./java_core_bytecode.mjs'));
  for (const name of ['VarHandle', 'VarHandle$AccessMode', 'DoppioVarHandle', 'DoppioVarHandles']) {
    const filename = path.join(classlib, prefix + name + '.class');
    assert.ok(fs.existsSync(filename), 'Required compiled C3 classlib is missing; run the strict release build: ' + filename);
    const stat = fs.lstatSync(filename);
    assert.ok(stat.isFile() && !stat.isSymbolicLink(), 'Actual regular compiled classlib file');
    const bytes = fs.readFileSync(filename);
    const layout = readStructureLayout(bytes);
    assert.equal(className(layout, layout.thisClass), prefix + name);
    compiled.set(name, {bytes, layout});
  }
  assert.ok(fs.existsSync(artifact) && fs.statSync(artifact).isFile(),
    'Required compiler-facing bootstrap artifact is missing; run the strict release build');
  const entries = execFileSync('unzip', ['-Z1', artifact], {encoding: 'utf8', timeout: 10000}).trim().split('\n');
  const {applyModernBootstrapOverlays} = require(path.join(runtimeRoot, 'src/ClassLoader'));
  for (const name of ['MethodHandles', 'MethodHandles$Lookup']) {
    const entry = prefix + name + '.class';
    assert.equal(entries.filter(item => item === entry).length, 1, 'Exactly one actual compiler-facing factory class');
    const packaged = execFileSync('unzip', ['-p', artifact, entry], {timeout: 10000});
    const stock = execFileSync('unzip', ['-p', path.join(root, 'vendor/java_home/lib/rt.jar'), entry], {timeout: 10000});
    const bytes = applyModernBootstrapOverlays('L' + prefix + name + ';', stock);
    assert.deepEqual(bytes, packaged, 'Parsed compiler-facing and actual compiled runtime factory bytes agree exactly');
    compiled.set(name, {bytes, layout: readStructureLayout(bytes)});
  }
});

test('compiled VarHandle and immutable behavior-view classes retain their selected identities and visibility', () => {
  const variableClass = compiled.get('VarHandle');
  assert.equal(variableClass.layout.flags, 0x0421, 'public abstract class with ACC_SUPER');
  assert.equal(className(variableClass.layout, variableClass.bytes.readUInt16BE(variableClass.layout.superClassOffset)), 'java/lang/Object');
  assert.equal(variableClass.layout.interfaceCount, 1);
  assert.equal(className(variableClass.layout, variableClass.bytes.readUInt16BE(variableClass.layout.interfacesOffset)),
    'java/lang/constant/Constable');
  assert.deepEqual(variableClass.layout.fields.entries.map(entry => [entry.name, entry.descriptor, entry.flags]), [
    ['valueType', cls, 0x0010], ['coordinates', 'Ljava/util/List;', 0x0010],
    ['readOnly', 'Z', 0x0010], ['exactBehavior', 'Z', 0x0010]
  ]);
  assert.equal(method(variableClass, '<init>', '(' + cls + '[' + cls + 'ZZ)V').flags, 0,
    'Package-private constructor does not expose user subclass construction');
  const view = compiled.get('DoppioVarHandle');
  assert.equal(view.layout.flags, 0x0030, 'package-private final implementation class');
  assert.equal(className(view.layout, view.bytes.readUInt16BE(view.layout.superClassOffset)), prefix + 'VarHandle');
  assert.equal(compiled.get('DoppioVarHandles').layout.flags, 0x0031);
});

test('all31 compiled access-mode placeholders are exactly public-final-native-varargs erased declarations', () => {
  const unit = compiled.get('VarHandle');
  assert.equal(accessModes.length, 31);
  for (const [, name, result] of accessModes) {
    const member = method(unit, name, erased + result);
    assert.equal(member.flags, 0x0191, name + ' public/final/native/varargs flags');
    assert.equal(member.code, undefined, 'Native placeholder has no fabricated Code body');
    assert.deepEqual(exceptions(unit, member), [], 'Access placeholders do not declare Throwable');
  }
  assert.deepEqual(unit.layout.methods.entries.filter(member => (member.flags & 0x0100) !== 0)
    .map(member => member.name).sort(), accessModes.map(entry => entry[1]).sort());
});

test('compiled query methods preserve non-final metadata and the exact selected public surface', () => {
  const unit = compiled.get('VarHandle');
  assert.deepEqual(publicMethods(unit), expectedPublicMethods([
    ...accessModes.map(([, name, result]) => [name, erased + result, 0x0191]), ...queryMethods
  ]));
  for (const [name, descriptor, flags] of queryMethods) {
    const member = method(unit, name, descriptor);
    assert.equal(member.flags, flags);
    if ((flags & 0x0400) !== 0) assert.equal(member.code, undefined);
    else assert.ok(member.code);
  }
  assert.equal(signature(unit, method(unit, 'varType', '()' + cls)), '()Ljava/lang/Class<*>;');
  assert.equal(signature(unit, method(unit, 'coordinateTypes', '()Ljava/util/List;')),
    '()Ljava/util/List<Ljava/lang/Class<*>;>;');
});

test('compiled exact/invoke views retain public signatures and the same stored capability bridge', () => {
  const unit = compiled.get('DoppioVarHandle');
  assert.deepEqual(publicMethods(unit), expectedPublicMethods([
    ['withInvokeExactBehavior', '()' + variable, 0x0001], ['withInvokeBehavior', '()' + variable, 0x0001]
  ]));
  const calls = code(unit, method(unit, 'view', '(Z)' + variable));
  assert.ok(calls.some(instruction => instruction.name === 'invokestatic' && instruction.cp?.tag === 10 &&
    instruction.cp.owner === 'java.lang.invoke.DoppioVarHandles' && instruction.cp.name === 'copyStorage' &&
    instruction.cp.descriptor === '(' + variable + variable + ')V'));
  const constructor = compiled.get('VarHandle');
  assert.ok(code(constructor, method(constructor, '<init>', '(' + cls + '[' + cls + 'ZZ)V'))
    .some(instruction => instruction.name === 'invokestatic' && instruction.cp?.tag === 10 &&
      instruction.cp.owner === 'java.util.Collections' && instruction.cp.name === 'unmodifiableList' &&
      instruction.cp.descriptor === '(Ljava/util/List;)Ljava/util/List;'));
});

test('compiled AccessMode enum independently declares all31 canonical constants and exact public names', () => {
  const unit = compiled.get('VarHandle$AccessMode');
  assert.equal(unit.layout.flags, 0x4031, 'public final ACC_ENUM/ACC_SUPER class');
  assert.equal(className(unit.layout, unit.bytes.readUInt16BE(unit.layout.superClassOffset)), 'java/lang/Enum');
  assert.equal(signature(unit, unit.layout), 'Ljava/lang/Enum<Ljava/lang/invoke/VarHandle$AccessMode;>;');
  assert.deepEqual(unit.layout.fields.entries.filter(member => (member.flags & 0x0001) !== 0)
    .map(member => [member.name, member.descriptor, member.flags]), accessModes.map(([name]) => [name, mode, 0x4019]));
  assert.deepEqual(publicMethods(unit), expectedPublicMethods([
    ['values', '()[' + mode, 0x0009], ['valueOf', '(' + text + ')' + mode, 0x0009],
    ['methodName', '()' + text, 0x0001], ['valueFromMethodName', '(' + text + ')' + mode, 0x0009]
  ]));
  const initializer = code(unit, method(unit, '<clinit>', '()V'));
  for (const [, name] of accessModes) assert.ok(initializer.some(instruction => ['ldc', 'ldc_w'].includes(instruction.name) &&
    instruction.cp?.tag === 8 && instruction.cp.value === name), 'Actual enum initialization contains canonical method name ' + name);
});

test('compiled C3 helper exposes exactly the intended factory signatures and no public native bypass', () => {
  const unit = compiled.get('DoppioVarHandles');
  assert.deepEqual(publicMethods(unit), expectedPublicMethods(facadeFactories.map(([name, descriptor]) => [name, descriptor, 0x0009])));
  for (const [name, descriptor] of facadeFactories) assert.ok(method(unit, name, descriptor).code,
    'Each public factory is parsed Java Code, not a public native storage bypass');
  assert.equal(method(unit, 'copyStorage', '(' + variable + variable + ')V').flags, 0x0108,
    'Capability copying is package-private static native');
  for (const [name, descriptor] of [['fieldIsFinal', '(' + cls + text + cls + 'Z)Z'],
    ['captureField', '(' + variable + cls + text + cls + 'Z)V'], ['captureArray', '(' + variable + cls + ')V'],
    ['operate', '(' + variable + text + '[Ljava/lang/Object;)Ljava/lang/Object;'],
    ['operationHandle', '()' + handle], ['selectorHandle', '()' + handle]])
    assert.equal(method(unit, name, descriptor).flags, 0x010a, 'Storage bridge is private static native: ' + name);
  assert.deepEqual(unit.layout.methods.entries.filter(member => (member.flags & 0x0100) !== 0)
    .map(member => [member.name, member.descriptor, member.flags]).sort((first, second) =>
      (first[0] + first[1]).localeCompare(second[0] + second[1])), expectedPublicMethods([
        ['findVirtualBase', '(' + lookup + cls + text + type + ')' + handle, 0x010a],
        ['fieldIsFinal', '(' + cls + text + cls + 'Z)Z', 0x010a],
        ['captureField', '(' + variable + cls + text + cls + 'Z)V', 0x010a],
        ['captureArray', '(' + variable + cls + ')V', 0x010a],
        ['copyStorage', '(' + variable + variable + ')V', 0x0108],
        ['operate', '(' + variable + text + '[Ljava/lang/Object;)Ljava/lang/Object;', 0x010a],
        ['operationHandle', '()' + handle, 0x010a], ['selectorHandle', '()' + handle, 0x010a]
      ]), 'Exactly eight fixed native declarations, with no trusted Lookup getter');
});

test('compiled private helper selection uses only the two fixed zero-argument MethodHandle bridges', () => {
  const unit = compiled.get('DoppioVarHandles');
  for (const [caller, descriptor, bridge] of [
    ['accessHandle', '(' + variable + mode + ')' + handle, 'operationHandle'],
    ['invoker', '(' + mode + type + 'Z)' + handle, 'selectorHandle']
  ]) {
    const body = code(unit, method(unit, caller, descriptor));
    const selected = body.filter(instruction => instruction.name === 'invokestatic' && instruction.cp?.tag === 10 &&
      instruction.cp.owner === 'java.lang.invoke.DoppioVarHandles' && instruction.cp.name === bridge);
    assert.equal(selected.length, 1, 'Exactly one fixed private helper selection in ' + caller);
    assert.equal(selected[0].cp.descriptor, '()' + handle, 'No caller, owner, name or type can redirect trusted resolution');
    assert.ok(!body.some(instruction => instruction.cp?.owner === 'java.lang.invoke.DoppioVarHandles' &&
      instruction.cp.name === (bridge === 'operationHandle' ? 'selectorHandle' : 'operationHandle')));
    const native = method(unit, bridge, '()' + handle);
    assert.equal(native.flags, 0x010a);
    assert.equal(native.code, undefined);
    assert.deepEqual(exceptions(unit, native), ['java/lang/NoSuchMethodException', 'java/lang/IllegalAccessException']);
  }
  assert.equal(method(unit, 'operate', '(' + variable + text + '[Ljava/lang/Object;)Ljava/lang/Object;').flags, 0x010a);
  assert.equal(method(unit, 'select', '(' + variable + mode + type + 'Z)' + handle).flags, 0x000a,
    'The selected Java operation selector remains private static');
  for (const member of unit.layout.methods.entries) {
    assert.ok(!member.descriptor.endsWith(')' + lookup), 'No helper exposes a trusted Lookup return type');
    if (!member.code) continue;
    const body = code(unit, member);
    assert.ok(!body.some(instruction => instruction.cp?.owner === 'java.lang.invoke.MethodHandles' &&
      instruction.cp.name === 'lookup'), 'Illegal package caller lookup cannot recur in compiled helper Code');
    assert.ok(!body.some(instruction => instruction.name === 'getstatic' && instruction.cp?.name === 'IMPL_LOOKUP'),
      'Release9 Java Code does not depend on the private SDK symbol or expose trusted authority');
  }
});

test('compiled user-field factories keep authorization on their supplied caller Lookup', () => {
  const unit = compiled.get('DoppioVarHandles');
  for (const [factory, getter] of [['findVarHandle', 'findGetter'], ['findStaticVarHandle', 'findStaticGetter']]) {
    const body = code(unit, method(unit, factory, '(' + lookup + fieldFactoryType.slice(1)));
    const calls = body.filter(instruction => instruction.cp?.owner === 'java.lang.invoke.MethodHandles$Lookup');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].name, 'invokevirtual');
    assert.equal(calls[0].cp.tag, 10);
    assert.equal(calls[0].cp.name, getter);
    assert.equal(calls[0].cp.descriptor, '(' + cls + text + cls + ')' + handle);
    const index = body.indexOf(calls[0]);
    assert.deepEqual(body.slice(index - 4, index).map(instruction => instruction.name),
      ['aload_0', 'aload_1', 'aload_2', 'aload_3'], 'Caller Lookup and exact original field identity reach access checking');
    assert.ok(!body.some(instruction => instruction.cp?.owner === 'java.lang.invoke.DoppioVarHandles' &&
      ['operationHandle', 'selectorHandle'].includes(instruction.cp.name)), 'Trusted internal selection cannot authorize user fields');
  }
});

test('actual compiler bootstrap artifact has exactly the C3 public factories and typed helper delegates', () => {
  const factoryGroups = [
    ['MethodHandles', [
      ['arrayElementVarHandle', '(' + cls + ')' + variable, 0x0009],
      ['varHandleInvoker', invokerType, 0x0009], ['varHandleExactInvoker', invokerType, 0x0009]
    ]],
    ['MethodHandles$Lookup', [
      ['findVarHandle', fieldFactoryType, 0x0001], ['findStaticVarHandle', fieldFactoryType, 0x0001],
      ['unreflectVarHandle', '(' + field + ')' + variable, 0x0001]
    ]]
  ];
  for (const [name, expected] of factoryGroups) {
    const unit = compiled.get(name);
    assert.deepEqual(publicMethods(unit).filter(entry => entry[1].includes('Ljava/lang/invoke/VarHandle')),
      expectedPublicMethods(expected));
    for (const [memberName, descriptor, flags] of expected) {
      const member = method(unit, memberName, descriptor);
      assert.equal(member.flags, flags);
      const body = code(unit, member);
      assert.equal(body.at(-1).name, 'areturn');
      assert.equal(body.filter(instruction => instruction.name === 'invokestatic').length, 1);
      const target = body.find(instruction => instruction.name === 'invokestatic').cp;
      assert.equal(target.tag, 10);
      assert.equal(target.owner, 'java.lang.invoke.DoppioVarHandles');
      assert.equal(target.name, memberName);
      assert.equal(target.descriptor, name === 'MethodHandles$Lookup' ? '(' + lookup + descriptor.slice(1) : descriptor);
      assert.equal(member.code.handlerCount, 0);
      if (memberName === 'findVarHandle' || memberName === 'findStaticVarHandle') {
        assert.equal(signature(unit, member), '(Ljava/lang/Class<*>;Ljava/lang/String;Ljava/lang/Class<*>;)Ljava/lang/invoke/VarHandle;');
        assert.deepEqual(exceptions(unit, member), ['java/lang/NoSuchFieldException', 'java/lang/IllegalAccessException']);
      } else if (memberName === 'unreflectVarHandle') {
        assert.deepEqual(exceptions(unit, member), ['java/lang/IllegalAccessException']);
      } else if (memberName === 'arrayElementVarHandle') {
        assert.equal(signature(unit, member), '(Ljava/lang/Class<*>;)Ljava/lang/invoke/VarHandle;');
      }
    }
  }
});
