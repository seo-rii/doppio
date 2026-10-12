package java.lang.invoke;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.Objects;

/** Bridge from canonical mode types to existing MethodHandle adaptation. */
public final class DoppioVarHandles {
  private DoppioVarHandles() {}

  public static VarHandle findVarHandle(MethodHandles.Lookup lookup, Class<?> owner,
      String name, Class<?> type) throws NoSuchFieldException, IllegalAccessException {
    Objects.requireNonNull(owner);
    Objects.requireNonNull(name);
    Objects.requireNonNull(type);
    MethodHandle getter = lookup.findGetter(owner, name, type);
    return fieldHandle(owner, name, type, false, getter.type().parameterArray());
  }

  public static VarHandle findStaticVarHandle(MethodHandles.Lookup lookup, Class<?> owner,
      String name, Class<?> type) throws NoSuchFieldException, IllegalAccessException {
    Objects.requireNonNull(owner);
    Objects.requireNonNull(name);
    Objects.requireNonNull(type);
    lookup.findStaticGetter(owner, name, type);
    return fieldHandle(owner, name, type, true, new Class<?>[0]);
  }

  private static VarHandle fieldHandle(Class<?> owner, String name, Class<?> type,
      boolean isStatic, Class<?>[] coordinates) {
    DoppioVarHandle handle = new DoppioVarHandle(type, coordinates,
        fieldIsFinal(owner, name, type, isStatic), false);
    captureField(handle, owner, name, type, isStatic);
    return handle;
  }

  public static VarHandle unreflectVarHandle(MethodHandles.Lookup lookup, Field field)
      throws IllegalAccessException {
    Objects.requireNonNull(field);
    // Deliberately do not call unreflectGetter: Field.accessible grants nothing here.
    try {
      if (Modifier.isStatic(field.getModifiers())) {
        return findStaticVarHandle(lookup, field.getDeclaringClass(), field.getName(), field.getType());
      }
      return findVarHandle(lookup, field.getDeclaringClass(), field.getName(), field.getType());
    } catch (NoSuchFieldException impossible) {
      throw new InternalError(impossible);
    }
  }

  public static VarHandle arrayElementVarHandle(Class<?> arrayType) {
    Objects.requireNonNull(arrayType);
    if (!arrayType.isArray()) throw new IllegalArgumentException("not an array class");
    DoppioVarHandle handle = new DoppioVarHandle(arrayType.getComponentType(),
        new Class<?>[] {arrayType, int.class}, false, false);
    captureArray(handle, arrayType);
    return handle;
  }

  static MethodHandle accessHandle(VarHandle handle, VarHandle.AccessMode mode) {
    MethodType type = handle.accessModeType(mode);
    if (!handle.isAccessModeSupported(mode)) {
      MethodHandle failure = MethodHandles.throwException(type.returnType(), UnsupportedOperationException.class)
          .bindTo(new UnsupportedOperationException("unsupported VarHandle access mode"));
      return MethodHandles.dropArguments(failure, 0, type.parameterList());
    }
    try {
      MethodHandle operation = operationHandle();
      operation = MethodHandles.insertArguments(operation, 0, handle, mode.methodName());
      return operation.asCollector(Object[].class, type.parameterCount()).asType(type);
    } catch (ReflectiveOperationException impossible) {
      throw new InternalError(impossible);
    }
  }

  public static MethodHandle varHandleInvoker(VarHandle.AccessMode mode, MethodType type) {
    return invoker(mode, type, false);
  }

  public static MethodHandle varHandleExactInvoker(VarHandle.AccessMode mode, MethodType type) {
    return invoker(mode, type, true);
  }

  public static MethodHandle invoker(VarHandle.AccessMode mode, MethodType type, boolean exact) {
    Objects.requireNonNull(mode);
    Objects.requireNonNull(type);
    try {
      MethodHandle selector = selectorHandle();
      selector = MethodHandles.insertArguments(selector, 1, mode, type, Boolean.valueOf(exact));
      return MethodHandles.filterArguments(MethodHandles.exactInvoker(type), 0, selector);
    } catch (ReflectiveOperationException impossible) {
      throw new InternalError(impossible);
    }
  }

  private static MethodHandle select(VarHandle handle, VarHandle.AccessMode mode, MethodType requested,
      boolean exactInvoker) {
    Objects.requireNonNull(handle);
    MethodType actual = handle.accessModeType(mode);
    if (!exactInvoker && handle.hasInvokeExactBehavior() && !actual.equals(requested)) {
      throw new WrongMethodTypeException("VarHandle exact invocation type mismatch");
    }
    if (!handle.isAccessModeSupported(mode)) {
      throw new UnsupportedOperationException("unsupported VarHandle access mode");
    }
    if (exactInvoker || handle.hasInvokeExactBehavior()) {
      if (!actual.equals(requested)) throw new WrongMethodTypeException("VarHandle exact invocation type mismatch");
      return handle.toMethodHandle(mode);
    }
    return handle.toMethodHandle(mode).asType(requested);
  }

  public static MethodHandle findVirtual(MethodHandles.Lookup lookup, Class<?> owner,
      String name, MethodType type) throws NoSuchMethodException, IllegalAccessException {
    Objects.requireNonNull(owner);
    Objects.requireNonNull(name);
    Objects.requireNonNull(type);
    if (owner == VarHandle.class) {
      for (VarHandle.AccessMode mode : VarHandle.AccessMode.values()) {
        if (mode.methodName().equals(name)) {
          lookup.accessClass(owner);
          return invoker(mode, type, false);
        }
      }
    }
    return findVirtualBase(lookup, owner, name, type);
  }

  private static native MethodHandle findVirtualBase(MethodHandles.Lookup lookup, Class<?> owner,
      String name, MethodType type) throws NoSuchMethodException, IllegalAccessException;
  // The stock Java 8 lookup factory forbids untrusted java.lang.invoke callers.
  // Resolve only these two fixed bootstrap members; never expose a trusted
  // Lookup or use its authority for caller-requested fields.
  private static native MethodHandle operationHandle() throws NoSuchMethodException, IllegalAccessException;
  private static native MethodHandle selectorHandle() throws NoSuchMethodException, IllegalAccessException;
  private static native boolean fieldIsFinal(Class<?> owner, String name, Class<?> type, boolean isStatic);
  private static native void captureField(VarHandle handle, Class<?> owner, String name,
      Class<?> type, boolean isStatic);
  private static native void captureArray(VarHandle handle, Class<?> arrayType);
  static native void copyStorage(VarHandle original, VarHandle copy);
  private static native Object operate(VarHandle handle, String modeName, Object[] values);
}
