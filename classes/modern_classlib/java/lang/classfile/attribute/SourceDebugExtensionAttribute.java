package java.lang.classfile.attribute;

import java.lang.classfile.Attribute;
import java.lang.classfile.ClassElement;
import java.lang.classfile.DoppioDebugAttributes;

public interface SourceDebugExtensionAttribute extends Attribute<SourceDebugExtensionAttribute>, ClassElement {
  byte[] contents();
  static SourceDebugExtensionAttribute of(byte[] contents) {
    return DoppioDebugAttributes.sourceDebugExtension(contents);
  }
}
