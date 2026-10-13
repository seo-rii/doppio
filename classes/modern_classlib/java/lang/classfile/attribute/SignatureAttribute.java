package java.lang.classfile.attribute;

import java.lang.classfile.*;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.classfile.constantpool.DoppioConstantPool;

/** Encoded generic signatures with context-specific typed tree conversions. */
public interface SignatureAttribute extends Attribute<SignatureAttribute>, ClassElement, MethodElement, FieldElement {
  Utf8Entry signature();
  default ClassSignature asClassSignature() { return ClassSignature.parseFrom(signature().stringValue()); }
  default MethodSignature asMethodSignature() { return MethodSignature.parseFrom(signature().stringValue()); }
  default Signature asTypeSignature() { return Signature.parseFrom(signature().stringValue()); }
  static SignatureAttribute of(ClassSignature signature) {
    return of(DoppioConstantPool.temporaryPool().utf8Entry(signature.signatureString()));
  }
  static SignatureAttribute of(MethodSignature signature) {
    return of(DoppioConstantPool.temporaryPool().utf8Entry(signature.signatureString()));
  }
  static SignatureAttribute of(Signature signature) {
    return of(DoppioConstantPool.temporaryPool().utf8Entry(signature.signatureString()));
  }
  static SignatureAttribute of(Utf8Entry signature) { return DoppioAttributes.signature(signature); }
}
