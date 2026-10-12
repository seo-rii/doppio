package java.lang.classfile.constantpool;

import java.lang.classfile.TypeKind;
import java.lang.constant.ConstantDesc;
public interface LoadableConstantEntry extends PoolEntry {
  ConstantDesc constantValue();
  default TypeKind typeKind() {
    switch (tag()) {
      case TAG_INTEGER: return TypeKind.INT; case TAG_FLOAT: return TypeKind.FLOAT;
      case TAG_LONG: return TypeKind.LONG; case TAG_DOUBLE: return TypeKind.DOUBLE;
      default: return TypeKind.REFERENCE;
    }
  }
}
