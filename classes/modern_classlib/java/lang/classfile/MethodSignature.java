package java.lang.classfile;

import java.lang.constant.MethodTypeDesc;
import java.util.Collections;
import java.util.List;

/** Generic method/constructor signatures, including bounds and declared thrown types. */
public interface MethodSignature {
  List<Signature.TypeParam> typeParameters();
  List<Signature> arguments();
  Signature result();
  List<Signature.ThrowableSig> throwableSignatures();
  String signatureString();
  static MethodSignature of(MethodTypeDesc descriptor) { return DoppioSignatures.methodSignature(descriptor); }
  static MethodSignature of(Signature result, Signature... arguments) {
    return of(Collections.emptyList(), Collections.emptyList(), result, arguments);
  }
  static MethodSignature of(List<Signature.TypeParam> parameters, List<Signature.ThrowableSig> exceptions,
      Signature result, Signature... arguments) {
    return DoppioSignatures.methodSignature(parameters, exceptions, result, arguments);
  }
  static MethodSignature parseFrom(String signature) { return DoppioSignatures.parseMethod(signature); }
}
