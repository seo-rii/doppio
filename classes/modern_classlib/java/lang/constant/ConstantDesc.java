package java.lang.constant;

import java.lang.invoke.MethodHandles;

public interface ConstantDesc {
  Object resolveConstantDesc(MethodHandles.Lookup lookup) throws ReflectiveOperationException;
}
