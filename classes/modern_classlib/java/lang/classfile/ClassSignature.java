package java.lang.classfile;

import java.util.Collections;
import java.util.List;

/** Generic class/interface signatures with declared type parameters and supertypes. */
public interface ClassSignature {
  List<Signature.TypeParam> typeParameters();
  Signature.ClassTypeSig superclassSignature();
  List<Signature.ClassTypeSig> superinterfaceSignatures();
  String signatureString();
  static ClassSignature of(Signature.ClassTypeSig superclass, Signature.ClassTypeSig... interfaces) {
    return of(Collections.emptyList(), superclass, interfaces);
  }
  static ClassSignature of(List<Signature.TypeParam> parameters, Signature.ClassTypeSig superclass,
      Signature.ClassTypeSig... interfaces) {
    return DoppioSignatures.classSignature(parameters, superclass, interfaces);
  }
  static ClassSignature parseFrom(String signature) { return DoppioSignatures.parseClass(signature); }
}
