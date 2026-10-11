import {ArrayClassData, ClassData, ReferenceClassData} from './ClassData';
import {BytecodeFormatError, BytecodeVerificationError, decodeMethodCode} from './BytecodeVerifier';
import {GeneratedClassPreparation, getGeneratedClassProvenance, installGeneratedClassAdapters,
  prepareGeneratedClassAdapters} from './GeneratedAdapters';
import {AbstractMethodField, Method} from './methods';
import {JVMThread} from './threading';
import {MethodHandleReferenceKind} from './enums';
import * as JVMTypes from '../includes/JVMTypes';

var factoryName = 'Ljava/lang/invoke/InnerClassLambdaMetafactory;',
  factoryPrefix = 'java/lang/invoke/InnerClassLambdaMetafactory/',
  validatingPrefix = 'java/lang/invoke/AbstractValidatingLambdaMetafactory/';

interface LambdaAccess {
  host: ReferenceClassData<JVMTypes.java_lang_Object>;
  target: Method;
  classes: ClassData[];
  installed?: ReferenceClassData<JVMTypes.java_lang_Object>;
}

var lambdaPreparations = new WeakMap<GeneratedClassPreparation, LambdaAccess>(),
  lambdaClasses = new WeakMap<ReferenceClassData<JVMTypes.java_lang_Object>, LambdaAccess>();

export function canAccessLambdaClass(caller: ReferenceClassData<JVMTypes.java_lang_Object>, target: ClassData): boolean {
  var access = lambdaClasses.get(caller);
  return !!access && access.classes.indexOf(target) !== -1;
}

export function canAccessLambdaMember(caller: ReferenceClassData<JVMTypes.java_lang_Object>, member: AbstractMethodField): boolean {
  var access = lambdaClasses.get(caller);
  return !!access && access.target === member;
}

/** Java 8's pinned metafactory emits host-private invokespecial calls from an
 * anonymous forwarding class. Ordinary JVM bytecode cannot use that receiver.
 * Adapt only this actual bootstrap generator invocation, never a name prefix or
 * arbitrary Unsafe input. The transformed class still receives full verification.
 */
export function prepareLambdaAnonymousClass(thread: JVMThread, host: JVMTypes.java_lang_Class,
  bytes: Buffer, patches: JVMTypes.JVMArray<JVMTypes.java_lang_Object>): GeneratedClassPreparation {
  if (thread === null || patches !== null || typeof thread.getStackTrace !== 'function') return null;
  var frames = thread.getStackTrace(), caller = frames[frames.length - 2];
  if (!caller) return null;
  var factoryClass = thread.getBsCl().getLoadedClass(factoryName);
  if (factoryClass === null || caller.method.cls !== factoryClass ||
      caller.method.signature !== 'spinInnerClass()Ljava/lang/Class;') return null;
  var factory: any = caller.locals[0];
  if (!factory || typeof factory.getClass !== 'function' || factory.getClass() !== factoryClass ||
      !factory[validatingPrefix + 'targetClass'] || factory[validatingPrefix + 'targetClass'].$cls !== host.$cls ||
      !(host.$cls instanceof ReferenceClassData)) return null;

  var kind = factory[validatingPrefix + 'implKind'],
    ownerMirror = <JVMTypes.java_lang_Class> factory[validatingPrefix + 'implDefiningClass'],
    owner = ownerMirror && <ReferenceClassData<JVMTypes.java_lang_Object>> ownerMirror.$cls,
    ownerName = factory[factoryPrefix + 'implMethodClassName'].toString(),
    methodName = factory[factoryPrefix + 'implMethodName'].toString(),
    descriptor = factory[factoryPrefix + 'implMethodDesc'].toString(),
    generatedName = 'L' + factory[factoryPrefix + 'lambdaClassName'].toString() + ';',
    samName = factory[validatingPrefix + 'samMethodName'].toString();
  if (!(owner instanceof ReferenceClassData) || owner.getInternalName() !== 'L' + ownerName + ';' ||
      kind < MethodHandleReferenceKind.INVOKEVIRTUAL || kind > MethodHandleReferenceKind.INVOKEINTERFACE) return null;
  var target = owner.methodLookup(methodName + descriptor),
    constructor = kind === MethodHandleReferenceKind.NEWINVOKESPECIAL;
  if (!target || target.accessFlags.isStatic() !== (kind === MethodHandleReferenceKind.INVOKESTATIC) ||
      (constructor ? target.name !== '<init>' || target.returnType !== 'V' : target.name.charAt(0) === '<') ||
      kind === MethodHandleReferenceKind.INVOKESPECIAL && target.accessFlags.isAbstract()) return null;
  var original = new ReferenceClassData(bytes, host.$cls.getProtectionDomain(), host.$cls.getLoader());
  if (original.getInternalName() !== generatedName) return null;

  // Bind the captured implementation to the real forwarding invocation, not
  // merely to the generated class's name. Bridges share the SAM method name.
  var forwarding = original.getMethods().filter(method => method.name === samName && method.declaredCode),
    expectedOpcode = constructor ? 0xb7 : kind === MethodHandleReferenceKind.INVOKEVIRTUAL ? 0xb6 :
      kind === MethodHandleReferenceKind.INVOKESTATIC ? 0xb8 : kind === MethodHandleReferenceKind.INVOKEINTERFACE ? 0xb9 : 0xb7;
  if (forwarding.length === 0) return null;
  for (var method of forwarding) {
    var instructions: ReturnType<typeof decodeMethodCode>['instructions'];
    try {
      instructions = decodeMethodCode({className: original.getInternalName(),
        superClassName: original.getSuperClassReference().name, majorVersion: original.majorVersion,
        name: method.name, descriptor: method.rawDescriptor, declaredAccessFlags: method.declaredAccessFlags,
        declaredCode: method.declaredCode, constantPool: original.constantPool}).instructions;
    } catch (failure) {
      if (failure instanceof BytecodeFormatError || failure instanceof BytecodeVerificationError) return null;
      throw failure;
    }
    var calls = instructions.filter(instruction => {
      if (instruction.opcode < 0xb6 || instruction.opcode > 0xb9) return false;
      var reference: any = original.constantPool.get(instruction.cpIndex);
      return reference.classInfo.name === owner.getInternalName() && reference.nameAndTypeInfo.name === methodName &&
        reference.nameAndTypeInfo.descriptor === descriptor;
    });
    if (calls.length !== 1 || calls[0].opcode !== expectedOpcode) return null;
  }

  var access: LambdaAccess = {host: <ReferenceClassData<JVMTypes.java_lang_Object>> host.$cls, target, classes: []};
  var captureClass = (cls: ClassData): void => {
    if (!(cls instanceof ReferenceClassData) && !(cls instanceof ArrayClassData)) return;
    if (access.classes.indexOf(cls) !== -1) return;
    access.classes.push(cls);
    if (cls instanceof ArrayClassData) captureClass(cls.getComponentClass());
  };
  var captureType = (type: JVMTypes.java_lang_invoke_MethodType): boolean => {
    var parameters = type && type['java/lang/invoke/MethodType/ptypes'], result = type && type['java/lang/invoke/MethodType/rtype'];
    if (!parameters || !result) return false;
    parameters.array.forEach(mirror => captureClass(mirror.$cls));
    captureClass(result.$cls);
    return true;
  };
  captureClass(host.$cls); captureClass(owner); captureClass(target.cls);
  for (var typeName of ['invokedType', 'implMethodType', 'samMethodType', 'instantiatedMethodType']) {
    if (!captureType(factory[validatingPrefix + typeName])) return null;
  }
  var markers = <JVMTypes.JVMArray<JVMTypes.java_lang_Class>> factory[validatingPrefix + 'markerInterfaces'],
    bridges = <JVMTypes.JVMArray<JVMTypes.java_lang_invoke_MethodType>> factory[validatingPrefix + 'additionalBridges'];
  if (!markers || !bridges) return null;
  markers.array.forEach(mirror => captureClass(mirror.$cls));
  if (!bridges.array.every(captureType)) return null;

  var preparation = kind === MethodHandleReferenceKind.INVOKESPECIAL ?
    prepareGeneratedClassAdapters(original, bytes, {specialCalls: [{target, referenceOwner: owner.getInternalName(), methodNames: [samName]}]}) :
    {bytes: Buffer.from(bytes), originalBytes: Buffer.from(bytes), className: generatedName, adapters: [], edits: []};
  if (preparation !== null) lambdaPreparations.set(preparation, access);
  return preparation;
}

export function installLambdaAdapters(preparation: GeneratedClassPreparation,
  cls: ReferenceClassData<JVMTypes.java_lang_Object>): void {
  var access = lambdaPreparations.get(preparation);
  if (!access || access.installed && access.installed !== cls || cls.getInternalName() !== preparation.className ||
      cls.getLoader() !== access.host.getLoader()) throw new Error('Unproven lambda class preparation');
  installGeneratedClassAdapters(preparation, cls);
  access.installed = cls;
  lambdaClasses.set(cls, access);
}
export const getLambdaGenerationProvenance = getGeneratedClassProvenance;
