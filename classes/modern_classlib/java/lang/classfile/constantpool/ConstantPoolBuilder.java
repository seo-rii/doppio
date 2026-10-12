package java.lang.classfile.constantpool;

import java.lang.classfile.ClassModel;
import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDesc;
import java.lang.constant.MethodTypeDesc;
import java.util.Objects;

/** Selected factories; unselected nominal module/bootstrap families are not backported. */
public interface ConstantPoolBuilder extends ConstantPool {
  static ConstantPoolBuilder of() { return new DoppioConstantPool(); }
  static ConstantPoolBuilder of(ClassModel model) { return DoppioConstantPool.copyOf(Objects.requireNonNull(model).constantPool()); }
  boolean canWriteDirect(ConstantPool source);
  Utf8Entry utf8Entry(String value);
  default Utf8Entry utf8Entry(ClassDesc value) { return utf8Entry(Objects.requireNonNull(value).descriptorString()); }
  default Utf8Entry utf8Entry(MethodTypeDesc value) { return utf8Entry(Objects.requireNonNull(value).descriptorString()); }
  ClassEntry classEntry(Utf8Entry name);
  default ClassEntry classEntry(ClassDesc type) {
    Objects.requireNonNull(type);
    if (type.isPrimitive()) throw new IllegalArgumentException("A pool class cannot be primitive");
    String descriptor = type.descriptorString();
    return classEntry(utf8Entry(type.isArray() ? descriptor : descriptor.substring(1, descriptor.length() - 1)));
  }
  NameAndTypeEntry nameAndTypeEntry(Utf8Entry name, Utf8Entry type);
  default NameAndTypeEntry nameAndTypeEntry(String name, ClassDesc type) { return nameAndTypeEntry(utf8Entry(name), utf8Entry(type)); }
  default NameAndTypeEntry nameAndTypeEntry(String name, MethodTypeDesc type) { return nameAndTypeEntry(utf8Entry(name), utf8Entry(type)); }
  FieldRefEntry fieldRefEntry(ClassEntry owner, NameAndTypeEntry member);
  default FieldRefEntry fieldRefEntry(ClassDesc owner, String name, ClassDesc type) {
    return fieldRefEntry(classEntry(owner), nameAndTypeEntry(name, type));
  }
  MethodRefEntry methodRefEntry(ClassEntry owner, NameAndTypeEntry member);
  default MethodRefEntry methodRefEntry(ClassDesc owner, String name, MethodTypeDesc type) {
    return methodRefEntry(classEntry(owner), nameAndTypeEntry(name, type));
  }
  InterfaceMethodRefEntry interfaceMethodRefEntry(ClassEntry owner, NameAndTypeEntry member);
  default InterfaceMethodRefEntry interfaceMethodRefEntry(ClassDesc owner, String name, MethodTypeDesc type) {
    return interfaceMethodRefEntry(classEntry(owner), nameAndTypeEntry(name, type));
  }
  MethodTypeEntry methodTypeEntry(MethodTypeDesc type);
  MethodTypeEntry methodTypeEntry(Utf8Entry descriptor);
  IntegerEntry intEntry(int value);
  FloatEntry floatEntry(float value);
  LongEntry longEntry(long value);
  DoubleEntry doubleEntry(double value);
  StringEntry stringEntry(Utf8Entry value);
  default StringEntry stringEntry(String value) { return stringEntry(utf8Entry(value)); }
  default ConstantValueEntry constantValueEntry(ConstantDesc constant) {
    Object value = Objects.requireNonNull(constant);
    if (value instanceof Integer) return intEntry(((Integer) value).intValue());
    if (value instanceof Float) return floatEntry(((Float) value).floatValue());
    if (value instanceof Long) return longEntry(((Long) value).longValue());
    if (value instanceof Double) return doubleEntry(((Double) value).doubleValue());
    if (value instanceof String) return stringEntry((String) value);
    throw new IllegalArgumentException("Not a constant-value entry");
  }
  default LoadableConstantEntry loadableConstantEntry(ConstantDesc constant) {
    Objects.requireNonNull(constant);
    if (constant instanceof ClassDesc) return classEntry((ClassDesc) constant);
    if (constant instanceof MethodTypeDesc) return methodTypeEntry((MethodTypeDesc) constant);
    return constantValueEntry(constant);
  }
}
