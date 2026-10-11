import ByteStream from './ByteStream';
import {ReferenceClassData} from './ClassData';
import {ClassReference, ConstantPool, ConstUTF8, MethodReference} from './ConstantPool';
import {BytecodeFormatError, BytecodeVerificationError, decodeMethodCode} from './BytecodeVerifier';
import {Method} from './methods';
import {BytecodeStackFrame, InternalStackFrame, JVMThread, NativeStackFrame} from './threading';
import {ThreadStatus} from './enums';
import * as JVMTypes from '../includes/JVMTypes';

export interface GeneratedAdapterSpec {
  specialCalls: {
    target: Method;
    methodNames: string[];
    /** Symbolic owner in the original generated invocation. */
    referenceOwner?: string;
    /** Serialization can allocate a subclass of the constructor owner. */
    receiverType?: string;
  }[];
  allocations?: {allocatedClass: ReferenceClassData<JVMTypes.java_lang_Object>; methodNames: string[]}[];
}

export interface GeneratedAdapterEdit {
  kind: 'special-call' | 'allocation';
  method: string;
  pc: number;
  originalCPIndex: number;
  adapterCPIndex: number;
}

export interface GeneratedClassProvenance {
  originalBytes: Buffer;
  transformedBytes: Buffer;
  edits: GeneratedAdapterEdit[];
}

interface GeneratedNativeAdapter {
  signature: string;
  referenceIndex: number;
  target?: Method;
  allocatedClass?: ReferenceClassData<JVMTypes.java_lang_Object>;
}

export interface GeneratedClassPreparation {
  bytes: Buffer;
  originalBytes: Buffer;
  className: string;
  adapters: GeneratedNativeAdapter[];
  edits: GeneratedAdapterEdit[];
}

var provenance = new WeakMap<ReferenceClassData<JVMTypes.java_lang_Object>, GeneratedClassProvenance>();

/** Internal code generation, not a verification exemption. Callers must prove
 * the actual bootstrap producer's identity before supplying exact target specs.
 * All resulting Code attributes still take the ordinary verification path.
 */
export function prepareGeneratedClassAdapters(original: ReferenceClassData<JVMTypes.java_lang_Object>, bytes: Buffer,
  specification: GeneratedAdapterSpec): GeneratedClassPreparation {
  var originalBytes = Buffer.from(bytes), sourceMethods = original.getMethods(),
    stream = new ByteStream(originalBytes), pool = new ConstantPool();
  stream.seek(8);
  var poolCount = stream.getUint16();
  stream.seek(8);
  pool.parse(stream, null, original.majorVersion);
  var poolEnd = stream.pos();
  stream.skip(2);
  var thisClass = stream.getUint16();
  stream.skip(2);
  stream.skip(2 * stream.getUint16());
  var skipAttributes = (): void => {
    var count = stream.getUint16();
    for (var i = 0; i < count; i++) { stream.skip(2); stream.skip(stream.getUint32()); }
  };
  var fieldCount = stream.getUint16();
  for (var field = 0; field < fieldCount; field++) { stream.skip(6); skipAttributes(); }
  var methodsOffset = stream.pos(), methodCount = stream.getUint16(),
    rewritten = Buffer.from(originalBytes), edits: GeneratedAdapterEdit[] = [],
    adapters: GeneratedNativeAdapter[] = [], additions: Buffer[] = [], nativeMethods: Buffer[] = [],
    adapterForSpecial: GeneratedNativeAdapter[] = [], adapterForAllocation: GeneratedNativeAdapter[] = [],
    specialCalls = specification.specialCalls, allocations = specification.allocations || [], nextName = 0;
  var u2 = (value: number): Buffer => { var result = Buffer.alloc(2); result.writeUInt16BE(value, 0); return result; };
  var utf = (value: string): Buffer => {
    // Java modified UTF-8 encodes UTF-16 surrogate units, not Unicode scalars.
    var encoded: number[] = [];
    for (var i = 0; i < value.length; i++) {
      var unit = value.charCodeAt(i);
      if (unit > 0 && unit < 0x80) encoded.push(unit);
      else if (unit < 0x800) encoded.push(0xc0 | unit >> 6, 0x80 | unit & 0x3f);
      else encoded.push(0xe0 | unit >> 12, 0x80 | unit >> 6 & 0x3f, 0x80 | unit & 0x3f);
    }
    if (encoded.length > 65535) throw new Error('Generated adapter descriptor exceeds UTF-8 entry limit');
    return Buffer.concat([Buffer.from([1]), u2(encoded.length), Buffer.from(encoded)]);
  };
  var addAdapter = (descriptor: string, target?: Method,
    allocatedClass?: ReferenceClassData<JVMTypes.java_lang_Object>): GeneratedNativeAdapter => {
    var name: string;
    do { name = '$doppio$generated$adapter$' + nextName++; }
    while (sourceMethods.some(method => method.name === name));
    var firstIndex = poolCount + adapters.length * 4;
    if (firstIndex > 65531 || methodCount + adapters.length === 65535) throw new Error('Generated adapter exceeds class-file entry limits');
    additions.push(utf(name), utf(descriptor), Buffer.from([12]), u2(firstIndex), u2(firstIndex + 1),
      Buffer.from([10]), u2(thisClass), u2(firstIndex + 2));
    // Genuine private static native synthetic declaration, not discarded Code.
    nativeMethods.push(Buffer.concat([u2(0x110a), u2(firstIndex), u2(firstIndex + 1), u2(0)]));
    var result: GeneratedNativeAdapter = {signature: name + descriptor, referenceIndex: firstIndex + 3, target, allocatedClass};
    adapters.push(result);
    return result;
  };

  for (var methodIndex = 0; methodIndex < methodCount; methodIndex++) {
    var method = sourceMethods[methodIndex];
    stream.skip(6);
    var attributeCount = stream.getUint16();
    for (var attribute = 0; attribute < attributeCount; attribute++) {
      var attributeName = (<ConstUTF8> pool.get(stream.getUint16())).value,
        attributeLength = stream.getUint32(), attributeStart = stream.pos();
      if (attributeName === 'Code' && (specialCalls.some(item => item.methodNames.indexOf(method.name) !== -1) ||
          allocations.some(item => item.methodNames.indexOf(method.name) !== -1))) {
        var instructions: ReturnType<typeof decodeMethodCode>['instructions'];
        try {
          instructions = decodeMethodCode({className: original.getInternalName(),
            superClassName: original.getSuperClassReference() === null ? null : original.getSuperClassReference().name,
            majorVersion: original.majorVersion, name: method.name, descriptor: method.rawDescriptor,
            declaredAccessFlags: method.declaredAccessFlags, declaredCode: method.declaredCode,
            constantPool: original.constantPool}).instructions;
        } catch (failure) {
          // Leave bad input to the ordinary gate, preserving its error category.
          if (failure instanceof BytecodeVerificationError || failure instanceof BytecodeFormatError) return null;
          throw failure;
        }
        instructions.forEach(instruction => {
          var adapter: GeneratedNativeAdapter = null, kind: 'special-call' | 'allocation', i: number;
          if (instruction.opcode === 0xb7) {
            var reference = <MethodReference> original.constantPool.get(instruction.cpIndex);
            for (i = 0; i < specialCalls.length; i++) {
              var call = specialCalls[i], target = call.target;
              if (call.methodNames.indexOf(method.name) === -1 ||
                  reference.classInfo.name !== (call.referenceOwner || target.cls.getInternalName()) ||
                  reference.nameAndTypeInfo.name !== target.name || reference.nameAndTypeInfo.descriptor !== target.rawDescriptor) continue;
              if (target.isStatic || target.accessFlags.isAbstract()) throw new Error('Invalid generated special-call target');
              adapter = adapterForSpecial[i] || (adapterForSpecial[i] = addAdapter(
                '(' + (call.receiverType || target.cls.getInternalName()) + target.rawDescriptor.slice(1), target));
              kind = 'special-call';
              break;
            }
          } else if (instruction.opcode === 0xbb) {
            var allocated = <ClassReference> original.constantPool.get(instruction.cpIndex);
            for (i = 0; i < allocations.length; i++) {
              var allocation = allocations[i];
              if (allocation.methodNames.indexOf(method.name) === -1 || allocated.name !== allocation.allocatedClass.getInternalName()) continue;
              adapter = adapterForAllocation[i] || (adapterForAllocation[i] = addAdapter(
                '()' + allocation.allocatedClass.getInternalName(), undefined, allocation.allocatedClass));
              kind = 'allocation';
              break;
            }
          }
          if (adapter !== null) {
            var offset = attributeStart + 8 + instruction.pc;
            rewritten[offset] = 0xb8;
            rewritten.writeUInt16BE(adapter.referenceIndex, offset + 1);
            edits.push({kind, method: method.signature, pc: instruction.pc,
              originalCPIndex: instruction.cpIndex, adapterCPIndex: adapter.referenceIndex});
          }
        });
      }
      stream.seek(attributeStart + attributeLength);
    }
  }
  if (edits.length === 0) return null;
  var methodsEnd = stream.pos(), transformed = Buffer.concat([
    rewritten.slice(0, 8), u2(poolCount + adapters.length * 4), rewritten.slice(10, poolEnd), ...additions,
    rewritten.slice(poolEnd, methodsOffset), u2(methodCount + adapters.length), rewritten.slice(methodsOffset + 2, methodsEnd),
    ...nativeMethods, rewritten.slice(methodsEnd)]);
  return {bytes: transformed, originalBytes, className: original.getInternalName(), adapters, edits};
}

/** Bind by actual class/Method identity. Ordinary target frames retain the
 * execution gate, synchronized-method monitors, and Java exception handling.
 */
export function installGeneratedClassAdapters(preparation: GeneratedClassPreparation,
  cls: ReferenceClassData<JVMTypes.java_lang_Object>): void {
  if (cls.getInternalName() !== preparation.className) throw new Error('Generated adapter class identity mismatch');
  preparation.adapters.forEach(binding => {
    var adapter = cls.getMethods().filter(method => method.signature === binding.signature)[0], target = binding.target;
    if (!adapter || (adapter.declaredAccessFlags & 0x110a) !== 0x110a) throw new Error('Missing typed generated native adapter');
    if (binding.allocatedClass) {
      adapter.installNativeBody(function(thread: JVMThread) {
        thread.setStatus(ThreadStatus.ASYNC_WAITING);
        binding.allocatedClass.initialize(thread, initialized => {
          if (initialized !== null) {
            var constructor = (<ReferenceClassData<JVMTypes.java_lang_Object>> initialized).getConstructor(thread);
            thread.asyncReturn(new constructor(thread));
          }
        }, false);
      });
      return;
    }
    adapter.installNativeBody(function(thread: JVMThread, receiver: JVMTypes.java_lang_Object) {
      if (receiver === null) { thread.throwNewException('Ljava/lang/NullPointerException;', ''); return; }
      var locals: any[] = [receiver];
      for (var i = 0; i < target.parameterTypes.length; i++) {
        locals.push(arguments[i + 2]);
        if (target.parameterTypes[i] === 'J' || target.parameterTypes[i] === 'D') locals.push(null);
      }
      var continuation = new InternalStackFrame((error?: JVMTypes.java_lang_Throwable, value?: any) => {
        if (error) thread.throwException(error);
        else if (target.returnType === 'V') thread.asyncReturn();
        else if (target.returnType === 'J' || target.returnType === 'D') thread.asyncReturn(value, null);
        else thread.asyncReturn(value);
      });
      // Same frame protocol as Method's emitted wrappers, without virtual
      // property lookup on the receiver (including same-signature shadows).
      (<any> thread).stack.push(continuation,
        target.isNative ? new NativeStackFrame(target, locals) : new BytecodeStackFrame(target, locals));
      thread.setStatus(ThreadStatus.RUNNABLE);
    });
  });
  provenance.set(cls, {originalBytes: Buffer.from(preparation.originalBytes), transformedBytes: Buffer.from(preparation.bytes),
    edits: preparation.edits.map(edit => ({kind: edit.kind, method: edit.method, pc: edit.pc,
      originalCPIndex: edit.originalCPIndex, adapterCPIndex: edit.adapterCPIndex}))});
}

export function getGeneratedClassProvenance(cls: ReferenceClassData<JVMTypes.java_lang_Object>): GeneratedClassProvenance {
  var source = provenance.get(cls);
  return source ? {originalBytes: Buffer.from(source.originalBytes), transformedBytes: Buffer.from(source.transformedBytes),
    edits: source.edits.map(edit => ({kind: edit.kind, method: edit.method, pc: edit.pc,
      originalCPIndex: edit.originalCPIndex, adapterCPIndex: edit.adapterCPIndex}))} : null;
}
