package java.lang.classfile.attribute;

import java.lang.classfile.*;
import java.util.List;

/** Bootstrap records are generated from the constant pool, not arbitrary builder elements. */
public interface BootstrapMethodsAttribute extends Attribute<BootstrapMethodsAttribute> {
  List<BootstrapMethodEntry> bootstrapMethods();
  int bootstrapMethodsSize();
}
