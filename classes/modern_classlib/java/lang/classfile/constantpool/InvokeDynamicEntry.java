package java.lang.classfile.constantpool;

import java.lang.constant.ConstantDesc;
import java.lang.constant.DynamicCallSiteDesc;
import java.lang.constant.MethodTypeDesc;
import java.util.List;

public interface InvokeDynamicEntry extends DynamicConstantPoolEntry {
  default MethodTypeDesc typeSymbol() { return MethodTypeDesc.ofDescriptor(type().stringValue()); }
  default DynamicCallSiteDesc asSymbol() {
    List<LoadableConstantEntry> entries = bootstrap().arguments();
    ConstantDesc[] arguments = new ConstantDesc[entries.size()];
    for (int index = 0; index < arguments.length; index++) arguments[index] = entries.get(index).constantValue();
    return DynamicCallSiteDesc.of(bootstrap().bootstrapMethod().asSymbol(), name().stringValue(), typeSymbol(), arguments);
  }
}
