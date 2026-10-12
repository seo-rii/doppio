import * as Doppio from '../doppiojvm';
import * as JVMTypes from '../../includes/JVMTypes';
import JVMThread = Doppio.VM.Threading.JVMThread;
import ClassData = Doppio.VM.ClassFile.ClassData;
import ReferenceClassData = Doppio.VM.ClassFile.ReferenceClassData;
import util = Doppio.VM.Util;

interface DirectMember {
  referenceKind: number;
  owner: JVMTypes.java_lang_Class;
  name: JVMTypes.java_lang_String;
  descriptor: string;
}

export default function createJavaLangConstantNatives(): any {
  function classMirror(thread: JVMThread, value: JVMTypes.java_lang_Class): boolean {
    return value !== null && value !== undefined && typeof value.getClass === 'function' &&
      value.getClass() === thread.getBsCl().getLoadedClass('Ljava/lang/Class;') && value.$cls instanceof ClassData;
  }

  function directMember(thread: JVMThread, handle: JVMTypes.java_lang_invoke_MethodHandle): DirectMember {
    if (handle === null || handle === undefined) {
      thread.throwNewException('Ljava/lang/NullPointerException;', 'Null nominal MethodHandle');
      return null;
    }
    var bootstrap = thread.getBsCl(), directClass = bootstrap.getLoadedClass('Ljava/lang/invoke/DirectMethodHandle;'),
      memberClass = bootstrap.getLoadedClass('Ljava/lang/invoke/MemberName;'),
      handleClass = handle.getClass();
    // Canonical bootstrap identity, not a same-name class or a guest-supplied
    // field, identifies the stock immutable direct-member capability.
    if (!(directClass instanceof ReferenceClassData) || !(memberClass instanceof ReferenceClassData) ||
        !(handleClass instanceof ReferenceClassData) ||
        handleClass.getLoader() !== bootstrap || !handleClass.isSubclass(directClass)) return null;
    var member = (<JVMTypes.java_lang_invoke_DirectMethodHandle> handle)['java/lang/invoke/DirectMethodHandle/member'];
    if (member === null || member === undefined || typeof member.getClass !== 'function' || member.getClass() !== memberClass ||
        member['java/lang/invoke/MemberName/resolution'] !== null) return null;
    var flags = member['java/lang/invoke/MemberName/flags'], kind = flags & 0x000f0000,
      referenceKind = flags >>> 24, owner = member['java/lang/invoke/MemberName/clazz'],
      name = member['java/lang/invoke/MemberName/name'], type = member['java/lang/invoke/MemberName/type'],
      descriptor: string;
    if (!classMirror(thread, owner) || !(owner.$cls instanceof ReferenceClassData) ||
        name === null || name === undefined || typeof name.getClass !== 'function' ||
        name.getClass() !== bootstrap.getLoadedClass('Ljava/lang/String;') ||
        type === null || type === undefined || typeof type.getClass !== 'function') return null;
    if (kind === 0x00040000) {
      if (referenceKind < 1 || referenceKind > 4 || !classMirror(thread, <JVMTypes.java_lang_Class> type)) return null;
      descriptor = (<JVMTypes.java_lang_Class> type).$cls.getInternalName();
      if (descriptor === 'V') return null;
    } else if (kind === 0x00010000 || kind === 0x00020000) {
      if (kind === 0x00020000) {
        if ((referenceKind !== 7 && referenceKind !== 8) || name.toString() !== '<init>') return null;
        referenceKind = 8;
      } else if (referenceKind !== 5 && referenceKind !== 6 && referenceKind !== 7 && referenceKind !== 9) return null;
      if (type.getClass() !== bootstrap.getLoadedClass('Ljava/lang/invoke/MethodType;')) return null;
      var methodType = <JVMTypes.java_lang_invoke_MethodType> type,
        result = methodType['java/lang/invoke/MethodType/rtype'],
        parameters = methodType['java/lang/invoke/MethodType/ptypes'];
      if (!classMirror(thread, result) || parameters === null || parameters === undefined ||
          !Array.isArray(parameters.array)) return null;
      for (var i = 0; i < parameters.array.length; i++) {
        if (!classMirror(thread, parameters.array[i])) return null;
      }
      descriptor = util.getDescriptorString(result, parameters);
      if (kind === 0x00020000 && result.$cls.getInternalName() !== 'V') return null;
    } else return null;
    return {referenceKind: referenceKind, owner: owner, name: name, descriptor: descriptor};
  }

  class DoppioNominalConstants {
    public static 'referenceKind(Ljava/lang/invoke/MethodHandle;)I'(
        thread: JVMThread, handle: JVMTypes.java_lang_invoke_MethodHandle): number {
      var metadata = directMember(thread, handle);
      return metadata === null ? 0 : metadata.referenceKind;
    }

    public static 'declaringClass(Ljava/lang/invoke/MethodHandle;)Ljava/lang/Class;'(
        thread: JVMThread, handle: JVMTypes.java_lang_invoke_MethodHandle): JVMTypes.java_lang_Class {
      var metadata = directMember(thread, handle);
      return metadata === null ? null : metadata.owner;
    }

    public static 'memberName(Ljava/lang/invoke/MethodHandle;)Ljava/lang/String;'(
        thread: JVMThread, handle: JVMTypes.java_lang_invoke_MethodHandle): JVMTypes.java_lang_String {
      var metadata = directMember(thread, handle);
      return metadata === null ? null : metadata.name;
    }

    public static 'memberDescriptor(Ljava/lang/invoke/MethodHandle;)Ljava/lang/String;'(
        thread: JVMThread, handle: JVMTypes.java_lang_invoke_MethodHandle): JVMTypes.java_lang_String {
      var metadata = directMember(thread, handle);
      return metadata === null ? null : thread.getJVM().internString(metadata.descriptor);
    }
  }
  return {'java/lang/invoke/DoppioNominalConstants': DoppioNominalConstants};
}
