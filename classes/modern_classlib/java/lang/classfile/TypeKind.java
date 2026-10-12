package java.lang.classfile;

import java.lang.constant.ClassDesc;
import java.lang.invoke.TypeDescriptor;
import java.util.Objects;

public enum TypeKind {
  BOOLEAN(1, 4, "Z"), BYTE(1, 8, "B"), CHAR(1, 5, "C"), SHORT(1, 9, "S"),
  INT(1, 10, "I"), LONG(2, 11, "J"), FLOAT(1, 6, "F"), DOUBLE(2, 7, "D"),
  REFERENCE(1, -1, "Ljava/lang/Object;"), VOID(0, -1, "V");
  private final int slots, arrayCode;
  private final String descriptor;
  TypeKind(int slots, int arrayCode, String descriptor) {
    this.slots = slots; this.arrayCode = arrayCode; this.descriptor = descriptor;
  }
  public ClassDesc upperBound() { return ClassDesc.ofDescriptor(descriptor); }
  public int newarrayCode() { return arrayCode; }
  public int slotSize() { return slots; }
  public TypeKind asLoadable() { return ordinal() < 4 ? INT : this; }
  public static TypeKind fromNewarrayCode(int code) {
    for (TypeKind kind : values()) if (kind.arrayCode == code && code >= 4) return kind;
    throw new IllegalArgumentException("Invalid newarray code: " + code);
  }
  public static TypeKind fromDescriptor(CharSequence descriptor) {
    Objects.requireNonNull(descriptor);
    if (descriptor.length() == 0) throw new IllegalArgumentException("Empty descriptor");
    switch (descriptor.charAt(0)) {
      case 'Z': return BOOLEAN; case 'B': return BYTE; case 'C': return CHAR; case 'S': return SHORT;
      case 'I': return INT; case 'J': return LONG; case 'F': return FLOAT; case 'D': return DOUBLE;
      case 'L': case '[': return REFERENCE; case 'V': return VOID;
      default: throw new IllegalArgumentException("Invalid type descriptor");
    }
  }
  public static TypeKind from(TypeDescriptor.OfField<?> descriptor) {
    Objects.requireNonNull(descriptor);
    return descriptor.isPrimitive() ? fromDescriptor(descriptor.descriptorString()) : REFERENCE;
  }
}
