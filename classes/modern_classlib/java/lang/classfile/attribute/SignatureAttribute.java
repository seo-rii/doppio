package java.lang.classfile.attribute;

import java.lang.classfile.*;
import java.lang.classfile.constantpool.Utf8Entry;

/** Selected encoded-signature API; signature-tree parsing is not backported. */
public interface SignatureAttribute extends Attribute<SignatureAttribute>, ClassElement, MethodElement, FieldElement {
  Utf8Entry signature();
  static SignatureAttribute of(Utf8Entry signature) { return DoppioAttributes.signature(signature); }
}
