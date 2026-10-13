package java.lang.classfile.attribute;

import java.lang.classfile.Attribute;
import java.lang.classfile.ClassElement;
import java.lang.classfile.DoppioMetadataAttributes;
import java.lang.classfile.constantpool.Utf8Entry;

public interface SourceIDAttribute extends Attribute<SourceIDAttribute>, ClassElement {
  Utf8Entry sourceId();
  static SourceIDAttribute of(Utf8Entry value) { return DoppioMetadataAttributes.sourceId(value); }
  static SourceIDAttribute of(String value) { return DoppioMetadataAttributes.sourceId(value); }
}
