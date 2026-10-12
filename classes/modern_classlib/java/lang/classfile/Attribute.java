package java.lang.classfile;

import java.lang.classfile.constantpool.Utf8Entry;

public interface Attribute<A extends Attribute<A>> extends ClassFileElement {
  Utf8Entry attributeName();
  AttributeMapper<A> attributeMapper();
}
