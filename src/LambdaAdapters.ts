import {ReferenceClassData} from './ClassData';
import {GeneratedClassPreparation, getGeneratedClassProvenance, installGeneratedClassAdapters,
  prepareGeneratedClassAdapters} from './GeneratedAdapters';
import {JVMThread} from './threading';
import {MethodHandleReferenceKind} from './enums';
import * as JVMTypes from '../includes/JVMTypes';

var factoryName = 'Ljava/lang/invoke/InnerClassLambdaMetafactory;',
  factoryPrefix = 'java/lang/invoke/InnerClassLambdaMetafactory/',
  validatingPrefix = 'java/lang/invoke/AbstractValidatingLambdaMetafactory/';

/** Java 8's pinned metafactory emits host-private invokespecial calls from an
 * anonymous forwarding class. Ordinary JVM bytecode cannot use that receiver.
 * Adapt only this actual bootstrap generator invocation, never a name prefix or
 * arbitrary Unsafe input. The transformed class still receives full verification.
 */
export function prepareLambdaAnonymousClass(thread: JVMThread, host: JVMTypes.java_lang_Class,
  bytes: Buffer, patches: JVMTypes.JVMArray<JVMTypes.java_lang_Object>): GeneratedClassPreparation {
  if (patches !== null || typeof thread.getStackTrace !== 'function') return null;
  var frames = thread.getStackTrace(), caller = frames[frames.length - 2];
  if (!caller) return null;
  var factoryClass = thread.getBsCl().getLoadedClass(factoryName);
  if (factoryClass === null || caller.method.cls !== factoryClass ||
      caller.method.signature !== 'spinInnerClass()Ljava/lang/Class;') return null;
  var factory: any = caller.locals[0];
  if (!factory || typeof factory.getClass !== 'function' || factory.getClass() !== factoryClass ||
      !factory[validatingPrefix + 'targetClass'] || factory[validatingPrefix + 'targetClass'].$cls !== host.$cls ||
      factory[validatingPrefix + 'implKind'] !== MethodHandleReferenceKind.INVOKESPECIAL) return null;

  var ownerMirror = <JVMTypes.java_lang_Class> factory[validatingPrefix + 'implDefiningClass'],
    owner = ownerMirror && <ReferenceClassData<JVMTypes.java_lang_Object>> ownerMirror.$cls,
    ownerName = factory[factoryPrefix + 'implMethodClassName'].toString(),
    methodName = factory[factoryPrefix + 'implMethodName'].toString(),
    descriptor = factory[factoryPrefix + 'implMethodDesc'].toString(),
    generatedName = 'L' + factory[factoryPrefix + 'lambdaClassName'].toString() + ';',
    samName = factory[validatingPrefix + 'samMethodName'].toString();
  if (!(owner instanceof ReferenceClassData) || owner.getInternalName() !== 'L' + ownerName + ';' ||
      methodName.charAt(0) === '<') return null;
  var target = owner.getMethods().filter(method => method.name === methodName && method.rawDescriptor === descriptor)[0];
  if (!target || target.isStatic || target.accessFlags.isAbstract()) return null;
  var original = new ReferenceClassData(bytes, host.$cls.getProtectionDomain(), host.$cls.getLoader());
  if (original.getInternalName() !== generatedName) return null;
  return prepareGeneratedClassAdapters(original, bytes, {specialCalls: [{target, methodNames: [samName]}]});
}

export const installLambdaAdapters = installGeneratedClassAdapters;
export const getLambdaGenerationProvenance = getGeneratedClassProvenance;
