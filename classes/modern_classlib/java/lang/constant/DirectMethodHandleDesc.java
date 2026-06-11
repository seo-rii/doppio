package java.lang.constant;

import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.util.Objects;

public interface DirectMethodHandleDesc extends MethodHandleDesc {
  Kind kind();

  int refKind();

  boolean isOwnerInterface();

  ClassDesc owner();

  String methodName();

  String lookupDescriptor();

  public static enum Kind {
    STATIC(6, false),
    INTERFACE_STATIC(6, true),
    VIRTUAL(5, false),
    INTERFACE_VIRTUAL(9, true),
    SPECIAL(7, false),
    INTERFACE_SPECIAL(7, true),
    CONSTRUCTOR(8, false),
    GETTER(1, false),
    SETTER(3, false),
    STATIC_GETTER(2, false),
    STATIC_SETTER(4, false);

    public final int refKind;
    public final boolean isInterface;

    Kind(int refKind, boolean isInterface) {
      this.refKind = refKind;
      this.isInterface = isInterface;
    }

    public static Kind valueOf(int refKind) {
      return valueOf(refKind, false);
    }

    public static Kind valueOf(int refKind, boolean isInterface) {
      switch (refKind) {
        case 1:
          return GETTER;
        case 2:
          return STATIC_GETTER;
        case 3:
          return SETTER;
        case 4:
          return STATIC_SETTER;
        case 5:
          return VIRTUAL;
        case 8:
          return CONSTRUCTOR;
        case 9:
          return INTERFACE_VIRTUAL;
        default:
      }
      Kind[] kinds = values();
      for (int i = 0; i < kinds.length; i++) {
        if (kinds[i].refKind == refKind && kinds[i].isInterface == isInterface) {
          return kinds[i];
        }
      }
      throw new IllegalArgumentException();
    }
  }
}

final class DirectMethodHandleDescImpl implements DirectMethodHandleDesc {
  private final Kind kind;
  private final ClassDesc owner;
  private final String methodName;
  private final String lookupDescriptor;

  DirectMethodHandleDescImpl(Kind kind, ClassDesc owner, String methodName, String lookupDescriptor) {
    this.kind = Objects.requireNonNull(kind);
    this.owner = Objects.requireNonNull(owner);
    this.methodName = Objects.requireNonNull(methodName);
    this.lookupDescriptor = Objects.requireNonNull(lookupDescriptor);
    if (!owner.isClassOrInterface()) {
      throw new IllegalArgumentException();
    }
    switch (kind) {
      case GETTER:
      case SETTER:
      case STATIC_GETTER:
      case STATIC_SETTER:
        ClassDesc fieldType = ClassDesc.ofDescriptor(lookupDescriptor);
        if ("V".equals(fieldType.descriptorString())) {
          throw new IllegalArgumentException();
        }
        break;
      case CONSTRUCTOR:
        MethodTypeDesc constructorType = MethodTypeDesc.ofDescriptor(lookupDescriptor);
        if (!"V".equals(constructorType.returnType().descriptorString())) {
          throw new IllegalArgumentException();
        }
        break;
      default:
        MethodTypeDesc.ofDescriptor(lookupDescriptor);
    }
  }

  public Kind kind() {
    return kind;
  }

  public int refKind() {
    return kind.refKind;
  }

  public boolean isOwnerInterface() {
    return kind.isInterface;
  }

  public ClassDesc owner() {
    return owner;
  }

  public String methodName() {
    return methodName;
  }

  public String lookupDescriptor() {
    return lookupDescriptor;
  }

  public MethodTypeDesc invocationType() {
    if (lookupDescriptor.charAt(0) == '(') {
      MethodTypeDesc lookupType = MethodTypeDesc.ofDescriptor(lookupDescriptor);
      switch (kind) {
        case CONSTRUCTOR:
          return lookupType.changeReturnType(owner);
        case VIRTUAL:
        case INTERFACE_VIRTUAL:
        case SPECIAL:
        case INTERFACE_SPECIAL:
          return lookupType.insertParameterTypes(0, owner);
        default:
          return lookupType;
      }
    }

    ClassDesc fieldType = ClassDesc.ofDescriptor(lookupDescriptor);
    switch (kind) {
      case GETTER:
        return MethodTypeDesc.of(fieldType, owner);
      case SETTER:
        return MethodTypeDesc.of(ConstantDescs.CD_void, owner, fieldType);
      case STATIC_SETTER:
        return MethodTypeDesc.of(ConstantDescs.CD_void, fieldType);
      default:
        return MethodTypeDesc.of(fieldType);
    }
  }

  public Object resolveConstantDesc(MethodHandles.Lookup lookup) throws ReflectiveOperationException {
    Objects.requireNonNull(lookup);
    Class<?> ownerClass = (Class<?>) owner.resolveConstantDesc(lookup);
    if (lookupDescriptor.charAt(0) == '(') {
      MethodType type = (MethodType) MethodTypeDesc.ofDescriptor(lookupDescriptor).resolveConstantDesc(lookup);
      switch (kind) {
        case STATIC:
        case INTERFACE_STATIC:
          return lookup.findStatic(ownerClass, methodName, type);
        case VIRTUAL:
        case INTERFACE_VIRTUAL:
          return lookup.findVirtual(ownerClass, methodName, type);
        case SPECIAL:
        case INTERFACE_SPECIAL:
          return lookup.findSpecial(ownerClass, methodName, type, lookup.lookupClass());
        case CONSTRUCTOR:
          return lookup.findConstructor(ownerClass, type);
        default:
          throw new IllegalArgumentException();
      }
    }

    Class<?> fieldType = (Class<?>) ClassDesc.ofDescriptor(lookupDescriptor).resolveConstantDesc(lookup);
    switch (kind) {
      case GETTER:
        return lookup.findGetter(ownerClass, methodName, fieldType);
      case SETTER:
        return lookup.findSetter(ownerClass, methodName, fieldType);
      case STATIC_GETTER:
        return lookup.findStaticGetter(ownerClass, methodName, fieldType);
      case STATIC_SETTER:
        return lookup.findStaticSetter(ownerClass, methodName, fieldType);
      default:
        throw new IllegalArgumentException();
    }
  }

  public boolean equals(Object obj) {
    if (!(obj instanceof DirectMethodHandleDesc)) {
      return false;
    }
    DirectMethodHandleDesc other = (DirectMethodHandleDesc) obj;
    return kind == other.kind()
      && owner.equals(other.owner())
      && methodName.equals(other.methodName())
      && lookupDescriptor.equals(other.lookupDescriptor());
  }

  public int hashCode() {
    int hash = kind.hashCode();
    hash = 31 * hash + owner.hashCode();
    hash = 31 * hash + methodName.hashCode();
    hash = 31 * hash + lookupDescriptor.hashCode();
    return hash;
  }

  public String toString() {
    return "MethodHandleDesc[" + kind + "/" + owner.displayName() + "::" + methodName
      + invocationType().displayDescriptor() + "]";
  }
}
