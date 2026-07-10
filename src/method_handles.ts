import {ReferenceClassData} from './ClassData';
import {MethodHandleReferenceKind} from './enums';
import {JVMThread} from './threading';
import {Method} from './methods';
import * as JVMTypes from '../includes/JVMTypes';

const enum MemberNameFlags {
  IS_METHOD = 0x00010000,
  IS_CONSTRUCTOR = 0x00020000,
  ALL_KINDS = 0x000f0000,
  REFERENCE_KIND_SHIFT = 24
}

export function refreshMemberNameMethodTarget(thread: JVMThread, memberName: JVMTypes.java_lang_invoke_MemberName): void {
  var flags = memberName['java/lang/invoke/MemberName/flags'],
    refKind = flags >>> MemberNameFlags.REFERENCE_KIND_SHIFT,
    clazz = memberName['java/lang/invoke/MemberName/clazz'],
    name = memberName['java/lang/invoke/MemberName/name'],
    type = memberName['java/lang/invoke/MemberName/type'],
    clazzData: ReferenceClassData<JVMTypes.java_lang_Object>,
    methodTarget: Method;

  if (((flags & MemberNameFlags.ALL_KINDS) & (MemberNameFlags.IS_METHOD | MemberNameFlags.IS_CONSTRUCTOR)) === 0 ||
      clazz === null || clazz === undefined || !(clazz.$cls instanceof ReferenceClassData) ||
      name === null || type === null) {
    return;
  }

  clazzData = <ReferenceClassData<JVMTypes.java_lang_Object>> clazz.$cls;
  methodTarget = clazzData.signaturePolymorphicAwareMethodLookup(name.toString() + type.toString());
  if (methodTarget === null) {
    return;
  }

  memberName.vmtarget = methodTarget.getVMTargetBridgeMethod(thread, refKind);
  memberName.vmindex =
    refKind === MethodHandleReferenceKind.INVOKEINTERFACE ||
    refKind === MethodHandleReferenceKind.INVOKEVIRTUAL ?
      clazzData.getVMIndexForMethod(methodTarget) :
      -1;
}
