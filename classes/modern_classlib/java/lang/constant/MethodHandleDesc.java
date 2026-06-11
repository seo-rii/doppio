package java.lang.constant;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.util.Objects;

public interface MethodHandleDesc extends ConstantDesc {
  static DirectMethodHandleDesc of(DirectMethodHandleDesc.Kind kind, ClassDesc owner, String name, String lookupDescriptor) {
    return new DirectMethodHandleDescImpl(kind, owner, name, lookupDescriptor);
  }

  static DirectMethodHandleDesc ofMethod(DirectMethodHandleDesc.Kind kind, ClassDesc owner, String name, MethodTypeDesc lookupMethodType) {
    Objects.requireNonNull(lookupMethodType);
    switch (Objects.requireNonNull(kind)) {
      case GETTER:
      case SETTER:
      case STATIC_GETTER:
      case STATIC_SETTER:
        throw new IllegalArgumentException();
      default:
    }
    return of(kind, owner, name, lookupMethodType.descriptorString());
  }

  static DirectMethodHandleDesc ofField(DirectMethodHandleDesc.Kind kind, ClassDesc owner, String name, ClassDesc fieldType) {
    Objects.requireNonNull(fieldType);
    switch (Objects.requireNonNull(kind)) {
      case GETTER:
      case SETTER:
      case STATIC_GETTER:
      case STATIC_SETTER:
        break;
      default:
        throw new IllegalArgumentException();
    }
    return of(kind, owner, name, fieldType.descriptorString());
  }

  static DirectMethodHandleDesc ofConstructor(ClassDesc owner, ClassDesc... paramTypes) {
    return ofMethod(DirectMethodHandleDesc.Kind.CONSTRUCTOR, owner, "<init>", MethodTypeDesc.of(ConstantDescs.CD_void, paramTypes));
  }

  default MethodHandleDesc asType(MethodTypeDesc invocationType) {
    Objects.requireNonNull(invocationType);
    return invocationType().equals(invocationType) ? this : new AsTypeMethodHandleDesc(this, invocationType);
  }

  MethodTypeDesc invocationType();

  boolean equals(Object obj);
}

final class AsTypeMethodHandleDesc implements MethodHandleDesc {
  private final MethodHandleDesc underlying;
  private final MethodTypeDesc invocationType;

  AsTypeMethodHandleDesc(MethodHandleDesc underlying, MethodTypeDesc invocationType) {
    this.underlying = Objects.requireNonNull(underlying);
    this.invocationType = Objects.requireNonNull(invocationType);
  }

  public MethodTypeDesc invocationType() {
    return invocationType;
  }

  public Object resolveConstantDesc(MethodHandles.Lookup lookup) throws ReflectiveOperationException {
    Objects.requireNonNull(lookup);
    MethodHandle handle = (MethodHandle) underlying.resolveConstantDesc(lookup);
    MethodType type = (MethodType) invocationType.resolveConstantDesc(lookup);
    return handle.asType(type);
  }

  public boolean equals(Object obj) {
    if (!(obj instanceof AsTypeMethodHandleDesc)) {
      return false;
    }
    AsTypeMethodHandleDesc other = (AsTypeMethodHandleDesc) obj;
    return underlying.equals(other.underlying) && invocationType.equals(other.invocationType);
  }

  public int hashCode() {
    return 31 * underlying.hashCode() + invocationType.hashCode();
  }

  public String toString() {
    return underlying.toString() + ".asType" + invocationType.displayDescriptor();
  }
}
