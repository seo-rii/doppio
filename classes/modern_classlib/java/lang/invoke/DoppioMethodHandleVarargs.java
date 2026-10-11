package java.lang.invoke;

/** Modern varargs mode switching for the retained Java 8 handle hierarchy. */
public final class DoppioMethodHandleVarargs {
  private DoppioMethodHandleVarargs() {}

  public static MethodHandle withVarargs(MethodHandle target, boolean variableArity) {
    if (variableArity == target.isVarargsCollector()) {
      return target;
    }
    if (!variableArity) {
      return target.asFixedArity();
    }
    MethodType type = target.type();
    int parameterCount = type.parameterCount();
    if (parameterCount == 0 || !type.parameterType(parameterCount - 1).isArray()) {
      throw new IllegalArgumentException("no trailing array parameter");
    }
    return target.asVarargsCollector(type.parameterType(parameterCount - 1));
  }
}
