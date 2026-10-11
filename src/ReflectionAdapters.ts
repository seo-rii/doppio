import {ReferenceClassData} from './ClassData';
import {ClassLoader} from './ClassLoader';
import {MethodReference} from './ConstantPool';
import {BytecodeFormatError, BytecodeVerificationError, decodeMethodCode} from './BytecodeVerifier';
import {GeneratedAdapterSpec, GeneratedClassPreparation, prepareGeneratedClassAdapters,
  installGeneratedClassAdapters, getGeneratedClassProvenance} from './GeneratedAdapters';
import {JVMThread} from './threading';
import * as JVMTypes from '../includes/JVMTypes';

export interface ReflectionClassDefinition {
  className: string;
  bytes: Buffer;
  sourceBytes: JVMTypes.JVMArray<number>;
  offset: number;
  length: number;
  loader: ClassLoader;
  protectionDomain: JVMTypes.java_security_ProtectionDomain;
}

var generatorName = 'Lsun/reflect/MethodAccessorGenerator;',
  actionName = 'Lsun/reflect/MethodAccessorGenerator$1;',
  definerName = 'Lsun/reflect/ClassDefiner;',
  delegatingName = 'Lsun/reflect/DelegatingClassLoader;',
  generatorPrefix = 'sun/reflect/MethodAccessorGenerator/',
  actionPrefix = 'sun/reflect/MethodAccessorGenerator$1/',
  commonPrefix = 'sun/reflect/AccessorGenerator/',
  generateSignature = 'generate(Ljava/lang/Class;Ljava/lang/String;[Ljava/lang/Class;Ljava/lang/Class;[Ljava/lang/Class;IZZLjava/lang/Class;)Lsun/reflect/MagicAccessorImpl;';

interface ReflectionSuperclassAccess {
  bootstrap: ClassLoader;
  loader: ClassLoader;
  className: string;
  superclass: string;
}

// The parent may not be loaded while the generator is preparing its bytes.
// Retain proof of the real producer, then require the actual bootstrap parent
// identity when hierarchy admission supplies it. No class name grants access.
var reflectionPreparations = new WeakMap<GeneratedClassPreparation, ReflectionSuperclassAccess>(),
  reflectionClasses = new WeakMap<ReferenceClassData<JVMTypes.java_lang_Object>, ReflectionSuperclassAccess>();

export function canAccessReflectionSuperclass(candidate: ReferenceClassData<JVMTypes.java_lang_Object>,
  parent: ReferenceClassData<JVMTypes.java_lang_Object>): boolean {
  var access = reflectionClasses.get(candidate);
  return !!access && candidate.getLoader() === access.loader && candidate.getInternalName() === access.className &&
    parent.getLoader() === access.bootstrap && parent === access.bootstrap.getLoadedClass(access.superclass);
}

/**
 * The pinned Java 8 reflection generator relies on privileged bytecode shapes:
 * an exact Object.toString call on a caught exception, and serialization's
 * allocation of one class followed by a superclass constructor. Adapt only an
 * actual bootstrap generator invocation with matching captured input identities.
 * Generated names, MagicAccessor inheritance, and arbitrary Unsafe input do not
 * grant this capability. The transformed declaration is verified normally.
 */
export function prepareReflectionClass(thread: JVMThread,
  definition: ReflectionClassDefinition): GeneratedClassPreparation {
  if (thread === null || typeof thread.getStackTrace !== 'function' || definition.protectionDomain !== null) return null;
  var frames = thread.getStackTrace(), definer = frames[frames.length - 2], actionFrame = frames[frames.length - 3],
    bootstrap = thread.getBsCl(), generatorClass = bootstrap.getLoadedClass(generatorName),
    actionClass = bootstrap.getLoadedClass(actionName), definerClass = bootstrap.getLoadedClass(definerName),
    delegatingClass = bootstrap.getLoadedClass(delegatingName);
  if (!definer || !actionFrame || !generatorClass || !actionClass || !definerClass || !delegatingClass ||
      definer.method.cls !== definerClass ||
      definer.method.signature !== 'defineClass(Ljava/lang/String;[BIILjava/lang/ClassLoader;)Ljava/lang/Class;' ||
      actionFrame.method.cls !== actionClass || actionFrame.method.signature !== 'run()Lsun/reflect/MagicAccessorImpl;') return null;
  var action: any = actionFrame.locals[0], factory: any = action && action[actionPrefix + 'this$0'],
    sourceBytes = action && action[actionPrefix + 'val$bytes'],
    generatedName = action && action[actionPrefix + 'val$generatedName'],
    declaringMirror = action && action[actionPrefix + 'val$declaringClass'],
    declaringClass = declaringMirror && <ReferenceClassData<JVMTypes.java_lang_Object>> declaringMirror.$cls,
    loaderObject = definition.loader.getLoaderObject();
  if (!action || typeof action.getClass !== 'function' || action.getClass() !== actionClass ||
      !factory || typeof factory.getClass !== 'function' || factory.getClass() !== generatorClass ||
      !(declaringClass instanceof ReferenceClassData) || factory[generatorPrefix + 'declaringClass'] !== declaringMirror ||
      !generatedName || definition.className !== 'L' + generatedName.toString() + ';' ||
      sourceBytes !== definition.sourceBytes || definer.locals[0] !== generatedName || definer.locals[1] !== sourceBytes ||
      definition.offset !== 0 || definer.locals[2] !== definition.offset || definer.locals[3] !== definition.length ||
      definition.length !== sourceBytes.array.length || definition.bytes.length !== definition.length ||
      !Buffer.from(sourceBytes.array).equals(definition.bytes) ||
      !loaderObject || loaderObject.getClass() !== delegatingClass ||
      loaderObject['java/lang/ClassLoader/parent'] !== declaringClass.getLoader().getLoaderObject() ||
      definer.locals[4] !== declaringClass.getLoader().getLoaderObject()) return null;

  // The action alone is not authority: require its still-active real producer,
  // with the same receiver and captured declaration/parameter/return mirrors.
  var generate = frames.filter(frame => frame.method.cls === generatorClass &&
    frame.method.signature === generateSignature && frame.locals[0] === factory).pop();
  if (!generate || generate.locals[1] !== declaringMirror ||
      generate.locals[3] !== factory[generatorPrefix + 'parameterTypes'] ||
      generate.locals[4] !== factory[generatorPrefix + 'returnType'] ||
      generate.locals[6] !== factory[commonPrefix + 'modifiers'] ||
      generate.locals[7] !== factory[generatorPrefix + 'isConstructor'] ||
      generate.locals[8] !== factory[generatorPrefix + 'forSerialization']) return null;
  var isConstructor = !!generate.locals[7], serialization = !!generate.locals[8],
    parameterTypes = <JVMTypes.JVMArray<JVMTypes.java_lang_Class>> generate.locals[3],
    returnType = <JVMTypes.java_lang_Class> generate.locals[4];
  if (!parameterTypes || !returnType || serialization && !isConstructor) return null;
  var targetName = generate.locals[2].toString(),
    targetDescriptor = '(' + parameterTypes.array.map(type => type.$cls.getInternalName()).join('') + ')' + returnType.$cls.getInternalName(),
    targetOwner = serialization ? generate.locals[9] && <ReferenceClassData<JVMTypes.java_lang_Object>> generate.locals[9].$cls : declaringClass;
  if (!(targetOwner instanceof ReferenceClassData) || isConstructor && (targetName !== '<init>' || returnType.$cls.getInternalName() !== 'V')) return null;
  var target = targetOwner.getMethods().filter(method => method.name === targetName && method.rawDescriptor === targetDescriptor)[0];
  if (!target || target.declaredAccessFlags !== generate.locals[6]) return null;
  if (serialization) {
    var ancestor = declaringClass;
    while (ancestor !== null && ancestor !== targetOwner) ancestor = ancestor.getSuperClass();
    if (ancestor === null || target.isStatic || target.accessFlags.isAbstract()) return null;
  }

  var original = new ReferenceClassData(definition.bytes, definition.protectionDomain, definition.loader),
    superclass = original.getSuperClassReference(),
    expectedSuperclass = serialization ? 'Lsun/reflect/SerializationConstructorAccessorImpl;' :
      isConstructor ? 'Lsun/reflect/ConstructorAccessorImpl;' : 'Lsun/reflect/MethodAccessorImpl;',
    methods = original.getMethods(), entryName = isConstructor ? 'newInstance' : 'invoke',
    entryDescriptor = isConstructor ? '([Ljava/lang/Object;)Ljava/lang/Object;' : '(Ljava/lang/Object;[Ljava/lang/Object;)Ljava/lang/Object;',
    entry = methods.filter(method => method.name === entryName && method.rawDescriptor === entryDescriptor)[0];
  if (original.getInternalName() !== definition.className || original.majorVersion !== 49 || definition.bytes.readUInt16BE(4) !== 0 ||
      original.accessFlags.getRawByte() !== 1 || !superclass || superclass.name !== expectedSuperclass ||
      original.getInterfaceClassReferences().length !== 0 || original.getFields().length !== 0 || methods.length !== 2 ||
      !entry || entry.declaredAccessFlags !== 1 || !entry.declaredCode ||
      methods.filter(method => method.name === '<init>' && method.rawDescriptor === '()V' && method.declaredAccessFlags === 1 && method.declaredCode).length !== 1) return null;

  var decoded: ReturnType<typeof decodeMethodCode>;
  try {
    decoded = decodeMethodCode({className: original.getInternalName(), superClassName: superclass.name,
      majorVersion: original.majorVersion, name: entry.name, descriptor: entry.rawDescriptor,
      declaredAccessFlags: entry.declaredAccessFlags, declaredCode: entry.declaredCode, constantPool: original.constantPool});
  } catch (failure) {
    // Ordinary class admission must retain the exact verifier error category.
    if (failure instanceof BytecodeFormatError || failure instanceof BytecodeVerificationError) return null;
    throw failure;
  }
  var targetIndex = factory[generatorPrefix + 'targetMethodRef'] & 0xffff,
    toStringIndex = factory[commonPrefix + 'toStringIdx'] & 0xffff,
    calls = decoded.instructions.filter(instruction => instruction.cpIndex === targetIndex && instruction.opcode >= 0xb6 && instruction.opcode <= 0xb9),
    helpers = decoded.instructions.filter(instruction => instruction.opcode === 0xb7 && instruction.cpIndex === toStringIndex),
    targetReference = <MethodReference> original.constantPool.getUnchecked(targetIndex),
    helperReference = <MethodReference> original.constantPool.getUnchecked(toStringIndex);
  if (calls.length !== 1 || helpers.length !== 1 || !targetReference || !targetReference.classInfo ||
      targetReference.classInfo.name !== targetOwner.getInternalName() || targetReference.nameAndTypeInfo.name !== targetName ||
      targetReference.nameAndTypeInfo.descriptor !== targetDescriptor ||
      !helperReference || !helperReference.classInfo || helperReference.classInfo.name !== 'Ljava/lang/Object;' ||
      helperReference.nameAndTypeInfo.name !== 'toString' || helperReference.nameAndTypeInfo.descriptor !== '()Ljava/lang/String;') return null;
  var helperPC = helpers[0].pc, invocationPC = calls[0].pc, handlers = decoded.exceptionHandlers;
  if (handlers.length !== 3 || !['Ljava/lang/ClassCastException;', 'Ljava/lang/NullPointerException;'].every(name =>
      handlers.some(handler => handler.catchType === name && handler.handlerPC === helperPC && handler.endPC === invocationPC)) ||
      !handlers.some(handler => handler.catchType === 'Ljava/lang/Throwable;' && handler.startPC === invocationPC && handler.endPC === calls[0].nextPC)) return null;

  var objectClass = <ReferenceClassData<JVMTypes.java_lang_Object>> bootstrap.getLoadedClass('Ljava/lang/Object;'),
    toString = objectClass && objectClass.getMethods().filter(method => method.signature === 'toString()Ljava/lang/String;')[0];
  if (!toString || toString.isStatic || toString.accessFlags.isAbstract()) return null;
  var spec: GeneratedAdapterSpec = {specialCalls: [{target: toString, methodNames: [entryName]}]};
  if (serialization) {
    var allocations = decoded.instructions.filter(instruction => instruction.opcode === 0xbb &&
      (<any> original.constantPool.get(instruction.cpIndex)).name === declaringClass.getInternalName());
    if (calls[0].opcode !== 0xb7 || allocations.length !== 1 || allocations[0].pc !== 0 ||
        decoded.instructionAt[3] === undefined || decoded.instructionAt[3].opcode !== 0x59) return null;
    spec.specialCalls.push({target, methodNames: [entryName], receiverType: declaringClass.getInternalName()});
    spec.allocations = [{allocatedClass: declaringClass, methodNames: [entryName]}];
  }
  var preparation = prepareGeneratedClassAdapters(original, definition.bytes, spec);
  if (preparation !== null) reflectionPreparations.set(preparation, {bootstrap, loader: definition.loader,
    className: definition.className, superclass: expectedSuperclass});
  return preparation;
}

export function installReflectionAdapters(preparation: GeneratedClassPreparation,
  cls: ReferenceClassData<JVMTypes.java_lang_Object>): void {
  var access = reflectionPreparations.get(preparation), superclass = cls.getSuperClassReference();
  if (!access || cls.getLoader() !== access.loader || cls.getInternalName() !== access.className ||
      !superclass || superclass.name !== access.superclass) throw new Error('Unproven reflection class preparation');
  installGeneratedClassAdapters(preparation, cls);
  reflectionClasses.set(cls, access);
}

export const getReflectionGenerationProvenance = getGeneratedClassProvenance;
