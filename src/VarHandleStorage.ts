import {ArrayClassData, ClassData, ReferenceClassData} from './ClassData';
import {Field} from './methods';
import {JVMThread} from './threading';
import Long from './gLong';
import * as JVMTypes from '../includes/JVMTypes';

/** Captured by the access-checked bootstrap factory, never from caller names. */
export interface VarHandleStorageCapability {
  field?: Field;
  arrayClass?: ArrayClassData<any>;
  readonly: boolean;
}

export interface VarHandleStorageResult {
  ok: boolean;
  value: any;
}

export interface VarHandleStorageMode {
  family: 'get' | 'set' | 'compareAndSet' | 'compareAndExchange' | 'getAndSet' | 'add' | 'or' | 'and' | 'xor';
  valueArity: number;
}

var modes: {[name: string]: VarHandleStorageMode} = Object.create(null);
[
  {family: 'get', valueArity: 0, names: ['get', 'getVolatile', 'getAcquire', 'getOpaque']},
  {family: 'set', valueArity: 1, names: ['set', 'setVolatile', 'setRelease', 'setOpaque']},
  {family: 'compareAndSet', valueArity: 2, names: ['compareAndSet', 'weakCompareAndSet',
    'weakCompareAndSetPlain', 'weakCompareAndSetAcquire', 'weakCompareAndSetRelease']},
  {family: 'compareAndExchange', valueArity: 2, names: ['compareAndExchange',
    'compareAndExchangeAcquire', 'compareAndExchangeRelease']},
  {family: 'getAndSet', valueArity: 1, names: ['getAndSet', 'getAndSetAcquire', 'getAndSetRelease']},
  {family: 'add', valueArity: 1, names: ['getAndAdd', 'getAndAddAcquire', 'getAndAddRelease']},
  {family: 'or', valueArity: 1, names: ['getAndBitwiseOr', 'getAndBitwiseOrAcquire', 'getAndBitwiseOrRelease']},
  {family: 'and', valueArity: 1, names: ['getAndBitwiseAnd', 'getAndBitwiseAndAcquire', 'getAndBitwiseAndRelease']},
  {family: 'xor', valueArity: 1, names: ['getAndBitwiseXor', 'getAndBitwiseXorAcquire', 'getAndBitwiseXorRelease']}
].forEach(group => {
  var mode = Object.freeze({family: <VarHandleStorageMode['family']> group.family, valueArity: group.valueArity});
  group.names.forEach(name => { modes[name] = mode; });
});
Object.freeze(modes);

/** Exact public access-mode names only; suffixes are not ordering proofs. */
export function varHandleStorageMode(modeName: string): VarHandleStorageMode {
  return modes[modeName] || null;
}

/**
 * Caller has already authorized the exact lookup via findGetter or
 * findStaticGetter. This only captures linked declaration identity; it neither
 * grants access nor resolves/initializes classes or uses name-only field lookup.
 */
export function captureVarHandleField(refc: ReferenceClassData<JVMTypes.java_lang_Object>,
    name: string, descriptor: string, isStatic: boolean): Field {
  if (refc === null || !refc.isResolved()) return null;
  var field = refc.fieldLookup(name, descriptor);
  return field !== null && field.rawDescriptor === descriptor && field.cls.isResolved() &&
    field.accessFlags.isStatic() === isStatic ? field : null;
}

function variableDescriptor(capability: VarHandleStorageCapability): string {
  if (!capability || !!capability.field === !!capability.arrayClass) return null;
  return capability.field ? capability.field.rawDescriptor : capability.arrayClass.getComponentClass().getInternalName();
}

function readOnly(capability: VarHandleStorageCapability): boolean {
  return capability.readonly || !!capability.field && capability.field.accessFlags.isFinal();
}

export function isVarHandleStorageModeSupported(capability: VarHandleStorageCapability, modeName: string): boolean {
  var mode = varHandleStorageMode(modeName), descriptor = variableDescriptor(capability);
  if (mode === null || descriptor === null) return false;
  var primitive = descriptor.length === 1 && 'ZBCSIJFD'.indexOf(descriptor) !== -1,
    reference = descriptor.charAt(0) === 'L' || descriptor.charAt(0) === '[';
  if (!primitive && !reference) return false;
  if (mode.family === 'get') return true;
  if (readOnly(capability)) return false;
  if (mode.family === 'add') return primitive && descriptor !== 'Z';
  if (mode.family === 'or' || mode.family === 'and' || mode.family === 'xor') {
    return primitive && 'ZBCSIJ'.indexOf(descriptor) !== -1;
  }
  return true;
}

function fail(thread: JVMThread, type: string, message: string): VarHandleStorageResult {
  thread.throwNewException(type, message);
  return {ok: false, value: undefined};
}

function normalize(value: any, descriptor: string): any {
  switch (descriptor) {
    case 'Z': return value ? 1 : 0;
    case 'B': return (value << 24) >> 24;
    case 'S': return (value << 16) >> 16;
    case 'C': return value & 0xffff;
    case 'I': return value | 0;
    case 'F': return Math.fround(value);
    default: return value;
  }
}

// The VM represents floats/doubles as JS numbers. Compare the same raw-bit
// conversions used by Float/Double, not == (NaN and signed zero differ).
// Arbitrary NaN payload preservation is not established by this helper.
var comparisonBits = Buffer.alloc(8);
function sameValue(actual: any, expected: any, descriptor: string): boolean {
  if (descriptor === 'J') return (<Long> actual).equals(<Long> expected);
  if (descriptor === 'F') {
    comparisonBits.writeFloatLE(actual, 0);
    var actualBits = comparisonBits.readInt32LE(0);
    comparisonBits.writeFloatLE(expected, 0);
    return actualBits === comparisonBits.readInt32LE(0);
  }
  if (descriptor === 'D') {
    comparisonBits.writeDoubleLE(actual, 0);
    var actualLow = comparisonBits.readInt32LE(0), actualHigh = comparisonBits.readInt32LE(4);
    comparisonBits.writeDoubleLE(expected, 0);
    return actualLow === comparisonBits.readInt32LE(0) && actualHigh === comparisonBits.readInt32LE(4);
  }
  return actual === expected;
}

/**
 * One synchronous storage operation. Values are canonical, already unboxed
 * logical arguments, without category-2 padding. The native wrapper owns
 * signature adaptation/boxing and must initialize an actual static declaration
 * before calling this routine. No Java invocation, callback, lookup or yield
 * occurs here. Ordered mode aliases establish single-thread values only, not
 * concurrent visibility or general Java memory-model conformance.
 *
 * After ok:false the caller must not asyncReturn: a guest exception is pending.
 */
export function operateVarHandleStorage(thread: JVMThread, capability: VarHandleStorageCapability,
    modeName: string, values: any[]): VarHandleStorageResult {
  var mode = varHandleStorageMode(modeName), descriptor = variableDescriptor(capability);
  if (mode === null) return fail(thread, 'Ljava/lang/IllegalArgumentException;', 'Unknown VarHandle access mode');
  if (descriptor === null) return fail(thread, 'Ljava/lang/InternalError;', 'Invalid VarHandle storage capability');
  if (!isVarHandleStorageModeSupported(capability, modeName)) {
    return fail(thread, 'Ljava/lang/UnsupportedOperationException;', 'Unsupported VarHandle access mode');
  }
  var field = capability.field,
    coordinateCount = field ? (field.accessFlags.isStatic() ? 0 : 1) : 2;
  if (!Array.isArray(values) || values.length !== coordinateCount + mode.valueArity) {
    return fail(thread, 'Ljava/lang/invoke/WrongMethodTypeException;', 'Incorrect VarHandle logical argument count');
  }
  var base: any, key: string | number, declaredValueClass: ClassData = null,
    actualArrayClass: ArrayClassData<any> = null;
  if (field) {
    if (field.accessFlags.isStatic()) {
      // This guard does not initialize or attempt to repair the wrapper's
      // lifecycle. In particular, do not expose prepared default static values.
      if (!field.cls.isInitialized(thread)) {
        return fail(thread, 'Ljava/lang/InternalError;', 'VarHandle static declaration is not initialized');
      }
      base = field.cls.getConstructor(thread);
    } else {
      base = values[0];
      if (base === null) return fail(thread, 'Ljava/lang/NullPointerException;', 'Null VarHandle receiver');
      if (!base.getClass().isCastable(field.cls)) {
        return fail(thread, 'Ljava/lang/ClassCastException;', 'Incorrect VarHandle receiver');
      }
    }
    key = field.fullName;
    if (descriptor.charAt(0) === 'L' || descriptor.charAt(0) === '[') {
      // Cache-only: the factory's access-checked MethodType already resolved
      // this value class. Do not call getResolvedClass/tryToResolve here.
      declaredValueClass = field.cls.getLoader().getLoadedClass(descriptor);
      if (declaredValueClass === null) {
        return fail(thread, 'Ljava/lang/InternalError;', 'VarHandle value class is not loaded');
      }
    }
  } else {
    var array = <JVMTypes.JVMArray<any>> values[0];
    if (array === null) return fail(thread, 'Ljava/lang/NullPointerException;', 'Null VarHandle array');
    if (!array.getClass().isCastable(capability.arrayClass)) {
      return fail(thread, 'Ljava/lang/ClassCastException;', 'Incorrect VarHandle array');
    }
    actualArrayClass = array.getClass();
    var index: number = values[1];
    key = index;
    if (index < 0 || index >= array.array.length) {
      return fail(thread, 'Ljava/lang/ArrayIndexOutOfBoundsException;', 'VarHandle array index out of bounds');
    }
    base = array.array;
    if (descriptor.charAt(0) === 'L' || descriptor.charAt(0) === '[') {
      declaredValueClass = capability.arrayClass.getComponentClass();
    }
  }
  var expected: any, replacement: any;
  if (mode.valueArity > 0) {
    replacement = normalize(values[coordinateCount + mode.valueArity - 1], descriptor);
    if (mode.valueArity === 2) expected = normalize(values[coordinateCount], descriptor);
    if (declaredValueClass !== null) {
      if (expected !== null && mode.valueArity === 2 && !expected.getClass().isCastable(declaredValueClass)) {
        return fail(thread, 'Ljava/lang/ClassCastException;', 'Incorrect VarHandle expected value');
      }
      if (replacement !== null && !replacement.getClass().isCastable(declaredValueClass)) {
        return fail(thread, 'Ljava/lang/ClassCastException;', 'Incorrect VarHandle replacement value');
      }
      // Even a mismatching compare validates NEW against the actual array's
      // component. EXPECTED is checked against the handle's declared type only.
      if (actualArrayClass !== null && replacement !== null &&
          !replacement.getClass().isCastable(actualArrayClass.getComponentClass())) {
        return fail(thread, 'Ljava/lang/ArrayStoreException;', 'Incorrect runtime array component value');
      }
    }
  }
  var actual = normalize(base[key], descriptor), changed: any;
  switch (mode.family) {
    case 'get': return {ok: true, value: actual};
    case 'set': base[key] = replacement; return {ok: true, value: null};
    case 'compareAndSet':
      if (!sameValue(actual, expected, descriptor)) return {ok: true, value: 0};
      base[key] = replacement;
      return {ok: true, value: 1};
    case 'compareAndExchange':
      if (sameValue(actual, expected, descriptor)) base[key] = replacement;
      return {ok: true, value: actual};
    case 'getAndSet': base[key] = replacement; return {ok: true, value: actual};
    case 'add': changed = descriptor === 'J' ? (<Long> actual).add(<Long> replacement) : actual + replacement; break;
    case 'or': changed = descriptor === 'J' ? (<Long> actual).or(<Long> replacement) : actual | replacement; break;
    case 'and': changed = descriptor === 'J' ? (<Long> actual).and(<Long> replacement) : actual & replacement; break;
    case 'xor': changed = descriptor === 'J' ? (<Long> actual).xor(<Long> replacement) : actual ^ replacement; break;
  }
  base[key] = normalize(changed, descriptor);
  return {ok: true, value: actual};
}
