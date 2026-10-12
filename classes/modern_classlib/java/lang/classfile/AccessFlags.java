package java.lang.classfile;

import java.lang.reflect.AccessFlag;
import java.util.Set;

public interface AccessFlags extends ClassElement, MethodElement, FieldElement {
  int flagsMask();
  Set<AccessFlag> flags();
  boolean has(AccessFlag flag);
  AccessFlag.Location location();
}
