package java.lang.classfile.constantpool;

import java.lang.classfile.TypeKind;
import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDesc;
import java.lang.constant.DynamicConstantDesc;
import java.util.List;

public interface ConstantDynamicEntry extends DynamicConstantPoolEntry, LoadableConstantEntry {
  default ClassDesc typeSymbol() { return ClassDesc.ofDescriptor(type().stringValue()); }
  default ConstantDesc constantValue() { return asSymbol(); }
  default DynamicConstantDesc<?> asSymbol() {
    List<LoadableConstantEntry> entries = bootstrap().arguments();
    ConstantDesc[] arguments = new ConstantDesc[entries.size()];
    for (int index = 0; index < arguments.length; index++) arguments[index] = entries.get(index).constantValue();
    return DynamicConstantDesc.ofNamed(bootstrap().bootstrapMethod().asSymbol(), name().stringValue(), typeSymbol(), arguments);
  }
  default TypeKind typeKind() { return TypeKind.fromDescriptor(type()); }
}
