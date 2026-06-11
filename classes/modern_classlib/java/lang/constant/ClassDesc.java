package java.lang.constant;

import java.lang.invoke.MethodHandles;
import java.lang.invoke.TypeDescriptor;
import java.util.Objects;

public interface ClassDesc extends ConstantDesc, TypeDescriptor.OfField<ClassDesc> {
  static ClassDesc of(String name) {
    Objects.requireNonNull(name);
    if (!isValidBinaryName(name)) {
      throw new IllegalArgumentException();
    }
    return ofDescriptor("L" + name.replace('.', '/') + ";");
  }

  static ClassDesc of(String packageName, String className) {
    Objects.requireNonNull(packageName);
    Objects.requireNonNull(className);
    if (!isValidPackageName(packageName) || !isValidMemberName(className)) {
      throw new IllegalArgumentException();
    }
    if (packageName.length() == 0) {
      return ofDescriptor("L" + className + ";");
    }
    return ofDescriptor("L" + packageName.replace('.', '/') + "/" + className + ";");
  }

  static ClassDesc ofDescriptor(String descriptor) {
    Objects.requireNonNull(descriptor);
    if (!isValidDescriptor(descriptor)) {
      throw new IllegalArgumentException();
    }
    return new ClassDescImpl(descriptor);
  }

  default ClassDesc arrayType() {
    return ofDescriptor("[" + descriptorString());
  }

  default ClassDesc arrayType(int rank) {
    if (rank <= 0) {
      throw new IllegalArgumentException();
    }
    StringBuilder builder = new StringBuilder(descriptorString().length() + rank);
    for (int i = 0; i < rank; i++) {
      builder.append('[');
    }
    builder.append(descriptorString());
    return ofDescriptor(builder.toString());
  }

  default ClassDesc nested(String nestedName) {
    Objects.requireNonNull(nestedName);
    String descriptor = descriptorString();
    if (!isClassOrInterface() || !isValidMemberName(nestedName)) {
      throw new IllegalArgumentException();
    }
    return ofDescriptor(descriptor.substring(0, descriptor.length() - 1) + "$" + nestedName + ";");
  }

  default ClassDesc nested(String firstNestedName, String... moreNestedNames) {
    Objects.requireNonNull(moreNestedNames);
    ClassDesc desc = nested(firstNestedName);
    for (int i = 0; i < moreNestedNames.length; i++) {
      desc = desc.nested(moreNestedNames[i]);
    }
    return desc;
  }

  default boolean isArray() {
    return descriptorString().charAt(0) == '[';
  }

  default boolean isPrimitive() {
    String descriptor = descriptorString();
    return descriptor.length() == 1 && primitiveName(descriptor.charAt(0)) != null;
  }

  default boolean isClassOrInterface() {
    String descriptor = descriptorString();
    return descriptor.length() > 2 && descriptor.charAt(0) == 'L'
      && descriptor.charAt(descriptor.length() - 1) == ';';
  }

  default ClassDesc componentType() {
    if (!isArray()) {
      return null;
    }
    return ofDescriptor(descriptorString().substring(1));
  }

  default String packageName() {
    String descriptor = descriptorString();
    while (descriptor.charAt(0) == '[') {
      descriptor = descriptor.substring(1);
    }
    if (descriptor.length() < 3 || descriptor.charAt(0) != 'L') {
      return "";
    }
    int slash = descriptor.lastIndexOf('/');
    if (slash < 2) {
      return "";
    }
    return descriptor.substring(1, slash).replace('/', '.');
  }

  default String displayName() {
    String descriptor = descriptorString();
    int arrayDepth = 0;
    while (descriptor.charAt(arrayDepth) == '[') {
      arrayDepth++;
    }
    String baseName = primitiveName(descriptor.charAt(arrayDepth));
    if (baseName == null) {
      int slash = descriptor.lastIndexOf('/');
      baseName = descriptor.substring(slash + 1, descriptor.length() - 1);
    }
    if (arrayDepth == 0) {
      return baseName;
    }
    StringBuilder builder = new StringBuilder(baseName.length() + arrayDepth * 2);
    builder.append(baseName);
    for (int i = 0; i < arrayDepth; i++) {
      builder.append("[]");
    }
    return builder.toString();
  }

  private static boolean isValidDescriptor(String descriptor) {
    if (descriptor.length() == 0) {
      return false;
    }
    if (descriptor.length() == 1) {
      return primitiveName(descriptor.charAt(0)) != null;
    }
    if (descriptor.charAt(0) == '[') {
      int index = 0;
      while (index < descriptor.length() && descriptor.charAt(index) == '[') {
        index++;
      }
      return index < descriptor.length()
        && index <= 255
        && descriptor.charAt(index) != 'V'
        && isValidDescriptor(descriptor.substring(index));
    }
    return descriptor.length() > 2
      && descriptor.charAt(0) == 'L'
      && descriptor.charAt(descriptor.length() - 1) == ';'
      && isValidInternalName(descriptor.substring(1, descriptor.length() - 1));
  }

  private static boolean isValidInternalName(String name) {
    if (name.length() == 0 || name.charAt(0) == '/' || name.charAt(name.length() - 1) == '/') {
      return false;
    }
    for (int i = 0; i < name.length(); i++) {
      char ch = name.charAt(i);
      if (ch == '.' || ch == '[' || ch == ';') {
        return false;
      }
      if (ch == '/' && i + 1 < name.length() && name.charAt(i + 1) == '/') {
        return false;
      }
    }
    return true;
  }

  private static boolean isValidBinaryName(String name) {
    if (name.length() == 0) {
      return false;
    }
    return isValidDottedName(name);
  }

  private static boolean isValidPackageName(String name) {
    return name.length() == 0 || isValidDottedName(name);
  }

  private static boolean isValidDottedName(String name) {
    if (name.charAt(0) == '.' || name.charAt(name.length() - 1) == '.') {
      return false;
    }
    for (int i = 0; i < name.length(); i++) {
      char ch = name.charAt(i);
      if (ch == '/' || ch == '[' || ch == ';') {
        return false;
      }
      if (ch == '.' && i + 1 < name.length() && name.charAt(i + 1) == '.') {
        return false;
      }
    }
    return true;
  }

  private static boolean isValidMemberName(String name) {
    if (name.length() == 0 || name.charAt(0) == '/' || name.charAt(name.length() - 1) == '/') {
      return false;
    }
    for (int i = 0; i < name.length(); i++) {
      char ch = name.charAt(i);
      if (ch == '/' || ch == '.' || ch == '[' || ch == ';') {
        return false;
      }
    }
    return true;
  }

  private static String primitiveName(char descriptor) {
    switch (descriptor) {
      case 'B':
        return "byte";
      case 'C':
        return "char";
      case 'D':
        return "double";
      case 'F':
        return "float";
      case 'I':
        return "int";
      case 'J':
        return "long";
      case 'S':
        return "short";
      case 'Z':
        return "boolean";
      case 'V':
        return "void";
      default:
        return null;
    }
  }
}

final class ClassDescImpl implements ClassDesc {
  private final String descriptor;

  ClassDescImpl(String descriptor) {
    this.descriptor = descriptor;
  }

  public String descriptorString() {
    return descriptor;
  }

  public Object resolveConstantDesc(MethodHandles.Lookup lookup) throws ReflectiveOperationException {
    Objects.requireNonNull(lookup);
    if (descriptor.length() == 1) {
      switch (descriptor.charAt(0)) {
        case 'B':
          return byte.class;
        case 'C':
          return char.class;
        case 'D':
          return double.class;
        case 'F':
          return float.class;
        case 'I':
          return int.class;
        case 'J':
          return long.class;
        case 'S':
          return short.class;
        case 'Z':
          return boolean.class;
        case 'V':
          return void.class;
        default:
          throw new ClassNotFoundException(descriptor);
      }
    }
    ClassLoader loader = lookup.lookupClass().getClassLoader();
    if (descriptor.charAt(0) == '[') {
      return Class.forName(descriptor.replace('/', '.'), false, loader);
    }
    return Class.forName(descriptor.substring(1, descriptor.length() - 1).replace('/', '.'), false, loader);
  }

  public boolean equals(Object obj) {
    return obj instanceof ClassDesc
      && descriptor.equals(((ClassDesc) obj).descriptorString());
  }

  public int hashCode() {
    return descriptor.hashCode();
  }

  public String toString() {
    return "ClassDesc[" + displayName() + "]";
  }
}
