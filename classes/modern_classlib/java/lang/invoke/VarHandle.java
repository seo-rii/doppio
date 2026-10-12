package java.lang.invoke;

import java.lang.constant.Constable;
import java.lang.constant.ConstantDesc;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/** Selected field/array execution; memory-order conformance is tracked separately. */
public abstract class VarHandle implements Constable {
  final Class<?> valueType;
  final List<Class<?>> coordinates;
  final boolean readOnly;
  final boolean exactBehavior;

  VarHandle(Class<?> valueType, Class<?>[] coordinates, boolean readOnly, boolean exactBehavior) {
    this.valueType = Objects.requireNonNull(valueType);
    this.coordinates = Collections.unmodifiableList(Arrays.asList(coordinates.clone()));
    this.readOnly = readOnly;
    this.exactBehavior = exactBehavior;
  }

  public Class<?> varType() { return valueType; }
  public List<Class<?>> coordinateTypes() { return coordinates; }
  public boolean hasInvokeExactBehavior() { return exactBehavior; }
  public abstract VarHandle withInvokeExactBehavior();
  public abstract VarHandle withInvokeBehavior();

  public final MethodType accessModeType(AccessMode mode) {
    Objects.requireNonNull(mode);
    Class<?> result = mode.family == 1 ? void.class : mode.family == 2 ? boolean.class : valueType;
    int values = mode.family == 0 ? 0 : mode.family == 2 || mode.family == 3 ? 2 : 1;
    Class<?>[] parameters = new Class<?>[coordinates.size() + values];
    for (int i = 0; i < coordinates.size(); i++) parameters[i] = coordinates.get(i);
    for (int i = coordinates.size(); i < parameters.length; i++) parameters[i] = valueType;
    return MethodType.methodType(result, parameters);
  }

  public boolean isAccessModeSupported(AccessMode mode) {
    Objects.requireNonNull(mode);
    if (mode.family == 0) return true;
    if (readOnly) return false;
    if (mode.family == 5) return valueType.isPrimitive() && valueType != boolean.class;
    if (mode.family >= 6) return valueType.isPrimitive() && valueType != float.class && valueType != double.class;
    return true;
  }

  public MethodHandle toMethodHandle(AccessMode mode) {
    Objects.requireNonNull(mode);
    return DoppioVarHandles.accessHandle(this, mode);
  }

  public Optional<? extends ConstantDesc> describeConstable() { return Optional.empty(); }

  public final String toString() {
    return new StringBuilder("VarHandle[varType=").append(valueType.getName())
        .append(", coord=").append(coordinates).append(']').toString();
  }

  public final native Object get(Object... arguments);
  public final native void set(Object... arguments);
  public final native Object getVolatile(Object... arguments);
  public final native void setVolatile(Object... arguments);
  public final native Object getAcquire(Object... arguments);
  public final native void setRelease(Object... arguments);
  public final native Object getOpaque(Object... arguments);
  public final native void setOpaque(Object... arguments);
  public final native boolean compareAndSet(Object... arguments);
  public final native Object compareAndExchange(Object... arguments);
  public final native Object compareAndExchangeAcquire(Object... arguments);
  public final native Object compareAndExchangeRelease(Object... arguments);
  public final native boolean weakCompareAndSetPlain(Object... arguments);
  public final native boolean weakCompareAndSet(Object... arguments);
  public final native boolean weakCompareAndSetAcquire(Object... arguments);
  public final native boolean weakCompareAndSetRelease(Object... arguments);
  public final native Object getAndSet(Object... arguments);
  public final native Object getAndSetAcquire(Object... arguments);
  public final native Object getAndSetRelease(Object... arguments);
  public final native Object getAndAdd(Object... arguments);
  public final native Object getAndAddAcquire(Object... arguments);
  public final native Object getAndAddRelease(Object... arguments);
  public final native Object getAndBitwiseOr(Object... arguments);
  public final native Object getAndBitwiseOrAcquire(Object... arguments);
  public final native Object getAndBitwiseOrRelease(Object... arguments);
  public final native Object getAndBitwiseAnd(Object... arguments);
  public final native Object getAndBitwiseAndAcquire(Object... arguments);
  public final native Object getAndBitwiseAndRelease(Object... arguments);
  public final native Object getAndBitwiseXor(Object... arguments);
  public final native Object getAndBitwiseXorAcquire(Object... arguments);
  public final native Object getAndBitwiseXorRelease(Object... arguments);

  public enum AccessMode {
    GET("get", 0), SET("set", 1),
    GET_VOLATILE("getVolatile", 0), SET_VOLATILE("setVolatile", 1),
    GET_ACQUIRE("getAcquire", 0), SET_RELEASE("setRelease", 1),
    GET_OPAQUE("getOpaque", 0), SET_OPAQUE("setOpaque", 1),
    COMPARE_AND_SET("compareAndSet", 2),
    COMPARE_AND_EXCHANGE("compareAndExchange", 3),
    COMPARE_AND_EXCHANGE_ACQUIRE("compareAndExchangeAcquire", 3),
    COMPARE_AND_EXCHANGE_RELEASE("compareAndExchangeRelease", 3),
    WEAK_COMPARE_AND_SET_PLAIN("weakCompareAndSetPlain", 2),
    WEAK_COMPARE_AND_SET("weakCompareAndSet", 2),
    WEAK_COMPARE_AND_SET_ACQUIRE("weakCompareAndSetAcquire", 2),
    WEAK_COMPARE_AND_SET_RELEASE("weakCompareAndSetRelease", 2),
    GET_AND_SET("getAndSet", 4), GET_AND_SET_ACQUIRE("getAndSetAcquire", 4),
    GET_AND_SET_RELEASE("getAndSetRelease", 4),
    GET_AND_ADD("getAndAdd", 5), GET_AND_ADD_ACQUIRE("getAndAddAcquire", 5),
    GET_AND_ADD_RELEASE("getAndAddRelease", 5),
    GET_AND_BITWISE_OR("getAndBitwiseOr", 6), GET_AND_BITWISE_OR_RELEASE("getAndBitwiseOrRelease", 6),
    GET_AND_BITWISE_OR_ACQUIRE("getAndBitwiseOrAcquire", 6),
    GET_AND_BITWISE_AND("getAndBitwiseAnd", 7), GET_AND_BITWISE_AND_RELEASE("getAndBitwiseAndRelease", 7),
    GET_AND_BITWISE_AND_ACQUIRE("getAndBitwiseAndAcquire", 7),
    GET_AND_BITWISE_XOR("getAndBitwiseXor", 8), GET_AND_BITWISE_XOR_RELEASE("getAndBitwiseXorRelease", 8),
    GET_AND_BITWISE_XOR_ACQUIRE("getAndBitwiseXorAcquire", 8);

    private final String methodName;
    final int family;
    AccessMode(String methodName, int family) { this.methodName = methodName; this.family = family; }
    public String methodName() { return methodName; }
    public static AccessMode valueFromMethodName(String name) {
      Objects.requireNonNull(name);
      for (AccessMode mode : values()) if (mode.methodName.equals(name)) return mode;
      throw new IllegalArgumentException("No access mode for method name");
    }
  }
}
