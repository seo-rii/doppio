package java.lang.constant;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

public abstract class DynamicConstantDesc<T> implements ConstantDesc {
  private final DirectMethodHandleDesc bootstrapMethod;
  private final String constantName;
  private final ClassDesc constantType;
  private final ConstantDesc[] bootstrapArgs;

  protected DynamicConstantDesc(DirectMethodHandleDesc bootstrapMethod, String constantName, ClassDesc constantType, ConstantDesc... bootstrapArgs) {
    this.bootstrapMethod = Objects.requireNonNull(bootstrapMethod);
    this.constantName = Objects.requireNonNull(constantName);
    this.constantType = Objects.requireNonNull(constantType);
    this.bootstrapArgs = Objects.requireNonNull(bootstrapArgs).clone();
    for (int i = 0; i < this.bootstrapArgs.length; i++) {
      Objects.requireNonNull(this.bootstrapArgs[i]);
    }
  }

  public static <T> ConstantDesc ofCanonical(DirectMethodHandleDesc bootstrapMethod, String constantName, ClassDesc constantType, ConstantDesc[] bootstrapArgs) {
    if (ConstantDescs.BSM_NULL_CONSTANT.equals(bootstrapMethod)
        && ConstantDescs.DEFAULT_NAME.equals(constantName)
        && ConstantDescs.CD_Object.equals(constantType)
        && bootstrapArgs != null
        && bootstrapArgs.length == 0) {
      return ConstantDescs.NULL;
    }
    return new AnonymousDynamicConstantDesc<T>(bootstrapMethod, constantName, constantType, bootstrapArgs);
  }

  public static <T> DynamicConstantDesc<T> ofNamed(DirectMethodHandleDesc bootstrapMethod, String constantName, ClassDesc constantType, ConstantDesc... bootstrapArgs) {
    return new AnonymousDynamicConstantDesc<T>(bootstrapMethod, constantName, constantType, bootstrapArgs);
  }

  public static <T> DynamicConstantDesc<T> of(DirectMethodHandleDesc bootstrapMethod, ConstantDesc... bootstrapArgs) {
    return ofNamed(bootstrapMethod, ConstantDescs.DEFAULT_NAME, bootstrapMethod.invocationType().returnType(), bootstrapArgs);
  }

  public static <T> DynamicConstantDesc<T> of(DirectMethodHandleDesc bootstrapMethod) {
    return of(bootstrapMethod, new ConstantDesc[0]);
  }

  public String constantName() {
    return constantName;
  }

  public ClassDesc constantType() {
    return constantType;
  }

  public DirectMethodHandleDesc bootstrapMethod() {
    return bootstrapMethod;
  }

  public ConstantDesc[] bootstrapArgs() {
    return bootstrapArgs.clone();
  }

  public List<ConstantDesc> bootstrapArgsList() {
    return Collections.unmodifiableList(Arrays.asList(bootstrapArgs()));
  }

  public T resolveConstantDesc(MethodHandles.Lookup lookup) throws ReflectiveOperationException {
    Objects.requireNonNull(lookup);
    if (ConstantDescs.BSM_NULL_CONSTANT.equals(bootstrapMethod)) {
      return null;
    }
    if (ConstantDescs.BSM_PRIMITIVE_CLASS.equals(bootstrapMethod)) {
      try {
        return (T) ClassDesc.ofDescriptor(constantName).resolveConstantDesc(lookup);
      } catch (IllegalArgumentException e) {
        throw new BootstrapMethodError(e);
      }
    }
    if (ConstantDescs.BSM_ENUM_CONSTANT.equals(bootstrapMethod)) {
      try {
        @SuppressWarnings({ "rawtypes", "unchecked" })
        T value = (T) Enum.valueOf((Class) constantType.resolveConstantDesc(lookup), constantName);
        return value;
      } catch (IllegalArgumentException e) {
        throw new BootstrapMethodError(e);
      }
    }
    if (ConstantDescs.BSM_GET_STATIC_FINAL.equals(bootstrapMethod)) {
      ClassDesc owner = bootstrapArgs.length == 0 ? constantType : (ClassDesc) bootstrapArgs[0];
      try {
        MethodHandle handle = (MethodHandle) MethodHandleDesc
          .ofField(DirectMethodHandleDesc.Kind.STATIC_GETTER, owner, constantName, constantType)
          .resolveConstantDesc(lookup);
        return (T) handle.invoke();
      } catch (NoSuchFieldException e) {
        throw new NoSuchFieldError(e.getMessage());
      } catch (ClassCastException e) {
        throw new NoSuchFieldError(e.getMessage());
      } catch (ReflectiveOperationException e) {
        throw e;
      } catch (RuntimeException e) {
        throw e;
      } catch (Error e) {
        throw e;
      } catch (Throwable e) {
        throw new BootstrapMethodError(e);
      }
    }
    if (ConstantDescs.BSM_EXPLICIT_CAST.equals(bootstrapMethod) && bootstrapArgs.length == 1) {
      Object arg = bootstrapArgs[0];
      Object value = arg == null
        || arg instanceof String
        || arg instanceof Integer
        || arg instanceof Long
        || arg instanceof Float
        || arg instanceof Double
        ? arg
        : ((ConstantDesc) arg).resolveConstantDesc(lookup);
      Class<?> targetType = (Class<?>) constantType.resolveConstantDesc(lookup);
      try {
        if (targetType.isPrimitive()) {
          if (targetType == Boolean.TYPE && value instanceof Boolean) {
            return (T) value;
          }
          if (targetType == Byte.TYPE) {
            if (value instanceof Number) {
              return (T) Byte.valueOf(((Number) value).byteValue());
            }
            if (value instanceof Character) {
              return (T) Byte.valueOf((byte) ((Character) value).charValue());
            }
          }
          if (targetType == Character.TYPE) {
            if (value instanceof Character) {
              return (T) value;
            }
            if (value instanceof Number) {
              return (T) Character.valueOf((char) ((Number) value).intValue());
            }
          }
          if (targetType == Short.TYPE) {
            if (value instanceof Number) {
              return (T) Short.valueOf(((Number) value).shortValue());
            }
            if (value instanceof Character) {
              return (T) Short.valueOf((short) ((Character) value).charValue());
            }
          }
          if (targetType == Integer.TYPE) {
            if (value instanceof Number) {
              return (T) Integer.valueOf(((Number) value).intValue());
            }
            if (value instanceof Character) {
              return (T) Integer.valueOf(((Character) value).charValue());
            }
          }
          if (targetType == Long.TYPE) {
            if (value instanceof Number) {
              return (T) Long.valueOf(((Number) value).longValue());
            }
            if (value instanceof Character) {
              return (T) Long.valueOf(((Character) value).charValue());
            }
          }
          if (targetType == Float.TYPE) {
            if (value instanceof Number) {
              return (T) Float.valueOf(((Number) value).floatValue());
            }
            if (value instanceof Character) {
              return (T) Float.valueOf(((Character) value).charValue());
            }
          }
          if (targetType == Double.TYPE) {
            if (value instanceof Number) {
              return (T) Double.valueOf(((Number) value).doubleValue());
            }
            if (value instanceof Character) {
              return (T) Double.valueOf(((Character) value).charValue());
            }
          }
          throw new ClassCastException();
        }
        return (T) targetType.cast(value);
      } catch (ClassCastException e) {
        throw new BootstrapMethodError(e);
      }
    }
    if (ConstantDescs.BSM_INVOKE.equals(bootstrapMethod) && bootstrapArgs.length >= 1) {
      try {
        MethodHandle handle = (MethodHandle) ((MethodHandleDesc) bootstrapArgs[0]).resolveConstantDesc(lookup);
        Object[] args = new Object[bootstrapArgs.length - 1];
        for (int i = 0; i < args.length; i++) {
          Object arg = bootstrapArgs[i + 1];
          if (arg == null
              || arg instanceof String
              || arg instanceof Integer
              || arg instanceof Long
              || arg instanceof Float
              || arg instanceof Double) {
            args[i] = arg;
          } else {
            args[i] = ((ConstantDesc) arg).resolveConstantDesc(lookup);
          }
        }
        Object value = handle.invokeWithArguments(args);
        Class<?> targetType = (Class<?>) constantType.resolveConstantDesc(lookup);
        if (targetType.isPrimitive()) {
          if (targetType == Boolean.TYPE && value instanceof Boolean) {
            return (T) value;
          }
          if (targetType == Byte.TYPE && value instanceof Byte) {
            return (T) value;
          }
          if (targetType == Character.TYPE && value instanceof Character) {
            return (T) value;
          }
          if (targetType == Short.TYPE) {
            if (value instanceof Short) {
              return (T) value;
            }
            if (value instanceof Byte) {
              return (T) Short.valueOf(((Byte) value).shortValue());
            }
          }
          if (targetType == Integer.TYPE) {
            if (value instanceof Integer) {
              return (T) value;
            }
            if (value instanceof Byte) {
              return (T) Integer.valueOf(((Byte) value).intValue());
            }
            if (value instanceof Short) {
              return (T) Integer.valueOf(((Short) value).intValue());
            }
            if (value instanceof Character) {
              return (T) Integer.valueOf(((Character) value).charValue());
            }
          }
          if (targetType == Long.TYPE) {
            if (value instanceof Long) {
              return (T) value;
            }
            if (value instanceof Byte) {
              return (T) Long.valueOf(((Byte) value).longValue());
            }
            if (value instanceof Short) {
              return (T) Long.valueOf(((Short) value).longValue());
            }
            if (value instanceof Character) {
              return (T) Long.valueOf(((Character) value).charValue());
            }
            if (value instanceof Integer) {
              return (T) Long.valueOf(((Integer) value).longValue());
            }
          }
          if (targetType == Float.TYPE) {
            if (value instanceof Float) {
              return (T) value;
            }
            if (value instanceof Byte) {
              return (T) Float.valueOf(((Byte) value).floatValue());
            }
            if (value instanceof Short) {
              return (T) Float.valueOf(((Short) value).floatValue());
            }
            if (value instanceof Character) {
              return (T) Float.valueOf(((Character) value).charValue());
            }
            if (value instanceof Integer) {
              return (T) Float.valueOf(((Integer) value).floatValue());
            }
            if (value instanceof Long) {
              return (T) Float.valueOf(((Long) value).floatValue());
            }
          }
          if (targetType == Double.TYPE) {
            if (value instanceof Double) {
              return (T) value;
            }
            if (value instanceof Byte) {
              return (T) Double.valueOf(((Byte) value).doubleValue());
            }
            if (value instanceof Short) {
              return (T) Double.valueOf(((Short) value).doubleValue());
            }
            if (value instanceof Character) {
              return (T) Double.valueOf(((Character) value).charValue());
            }
            if (value instanceof Integer) {
              return (T) Double.valueOf(((Integer) value).doubleValue());
            }
            if (value instanceof Long) {
              return (T) Double.valueOf(((Long) value).doubleValue());
            }
            if (value instanceof Float) {
              return (T) Double.valueOf(((Float) value).doubleValue());
            }
          }
          throw new ClassCastException();
        }
        return (T) targetType.cast(value);
      } catch (BootstrapMethodError e) {
        throw e;
      } catch (Throwable e) {
        throw new BootstrapMethodError(e);
      }
    }
    throw new UnsupportedOperationException();
  }

  public final boolean equals(Object obj) {
    if (!(obj instanceof DynamicConstantDesc)) {
      return false;
    }
    DynamicConstantDesc<?> other = (DynamicConstantDesc<?>) obj;
    return bootstrapMethod.equals(other.bootstrapMethod())
      && constantName.equals(other.constantName())
      && constantType.equals(other.constantType())
      && Arrays.equals(bootstrapArgs, other.bootstrapArgs());
  }

  public final int hashCode() {
    int hash = bootstrapMethod.hashCode();
    hash = 31 * hash + constantName.hashCode();
    hash = 31 * hash + constantType.hashCode();
    hash = 31 * hash + Arrays.hashCode(bootstrapArgs);
    return hash;
  }

  public String toString() {
    StringBuilder builder = new StringBuilder();
    builder.append("DynamicConstantDesc[")
      .append(bootstrapMethod.owner().displayName())
      .append("::")
      .append(bootstrapMethod.methodName())
      .append("(");
    if (!ConstantDescs.DEFAULT_NAME.equals(constantName)) {
      builder.append(constantName).append("/");
    }
    for (int i = 0; i < bootstrapArgs.length; i++) {
      if (i > 0) {
        builder.append(",");
      }
      builder.append(bootstrapArgs[i]);
    }
    return builder.append(")")
      .append(constantType.displayName())
      .append("]")
      .toString();
  }
}

final class AnonymousDynamicConstantDesc<T> extends DynamicConstantDesc<T> {
  AnonymousDynamicConstantDesc(DirectMethodHandleDesc bootstrapMethod, String constantName, ClassDesc constantType, ConstantDesc... bootstrapArgs) {
    super(bootstrapMethod, constantName, constantType, bootstrapArgs);
  }
}

final class ResolvedDynamicConstantDesc<T> extends DynamicConstantDesc<T> {
  private final T value;

  ResolvedDynamicConstantDesc(DirectMethodHandleDesc bootstrapMethod, String constantName, ClassDesc constantType, T value, ConstantDesc... bootstrapArgs) {
    super(bootstrapMethod, constantName, constantType, bootstrapArgs);
    this.value = value;
  }

  public T resolveConstantDesc(MethodHandles.Lookup lookup) {
    Objects.requireNonNull(lookup);
    return value;
  }
}
