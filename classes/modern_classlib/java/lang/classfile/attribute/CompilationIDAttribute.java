package java.lang.classfile.attribute;

import java.lang.classfile.Attribute;
import java.lang.classfile.ClassElement;
import java.lang.classfile.DoppioMetadataAttributes;
import java.lang.classfile.constantpool.Utf8Entry;

public interface CompilationIDAttribute extends Attribute<CompilationIDAttribute>, ClassElement {
  Utf8Entry compilationId();
  static CompilationIDAttribute of(Utf8Entry value) { return DoppioMetadataAttributes.compilationId(value); }
  static CompilationIDAttribute of(String value) { return DoppioMetadataAttributes.compilationId(value); }
}
