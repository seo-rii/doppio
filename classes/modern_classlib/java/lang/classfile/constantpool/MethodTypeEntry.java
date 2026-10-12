package java.lang.classfile.constantpool;

import java.lang.constant.ConstantDesc;
import java.lang.constant.MethodTypeDesc;
public interface MethodTypeEntry extends LoadableConstantEntry {
  default ConstantDesc constantValue() { return asSymbol(); }
  Utf8Entry descriptor();
  MethodTypeDesc asSymbol();
  boolean matches(MethodTypeDesc descriptor);
}
