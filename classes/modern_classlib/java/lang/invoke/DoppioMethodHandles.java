package java.lang.invoke;

import java.lang.reflect.Array;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public final class DoppioMethodHandles {
  private DoppioMethodHandles() {}

  public static MethodHandle zero(Class<?> type) {
    Objects.requireNonNull(type);
    if (type == void.class) {
      return MethodHandles.constant(Object.class, null).asType(MethodType.methodType(void.class));
    }
    if (type == boolean.class) {
      return MethodHandles.constant(type, Boolean.FALSE);
    }
    if (type == byte.class) {
      return MethodHandles.constant(type, Byte.valueOf((byte) 0));
    }
    if (type == char.class) {
      return MethodHandles.constant(type, Character.valueOf((char) 0));
    }
    if (type == short.class) {
      return MethodHandles.constant(type, Short.valueOf((short) 0));
    }
    if (type == int.class) {
      return MethodHandles.constant(type, Integer.valueOf(0));
    }
    if (type == long.class) {
      return MethodHandles.constant(type, Long.valueOf(0L));
    }
    if (type == float.class) {
      return MethodHandles.constant(type, Float.valueOf(0f));
    }
    if (type == double.class) {
      return MethodHandles.constant(type, Double.valueOf(0d));
    }
    return MethodHandles.constant(type, null);
  }

  public static MethodHandle empty(MethodType type) {
    Objects.requireNonNull(type);
    return MethodHandles.dropArguments(zero(type.returnType()), 0, type.parameterList());
  }

  public static MethodHandle arrayLength(Class<?> arrayClass) throws NoSuchMethodException, IllegalAccessException {
    checkArrayClass(arrayClass);
    MethodHandle length = MethodHandles.publicLookup().findStatic(
        DoppioMethodHandles.class,
        "arrayLengthTarget",
        MethodType.methodType(int.class, Object.class));
    return length.asType(MethodType.methodType(int.class, arrayClass));
  }

  public static MethodHandle arrayConstructor(Class<?> arrayClass) throws NoSuchMethodException, IllegalAccessException {
    checkArrayClass(arrayClass);
    MethodHandle constructor = MethodHandles.publicLookup().findStatic(
        DoppioMethodHandles.class,
        "arrayConstructorTarget",
        MethodType.methodType(Object.class, Class.class, int.class));
    return MethodHandles.insertArguments(constructor, 0, arrayClass)
        .asType(MethodType.methodType(arrayClass, int.class));
  }

  public static MethodHandle dropArgumentsToMatch(
      MethodHandle target, int skip, List<Class<?>> newTypes, int pos) {
    Objects.requireNonNull(target);
    Objects.requireNonNull(newTypes);
    List<Class<?>> targetTypes = target.type().parameterList();
    if (skip < 0 || skip > targetTypes.size()) {
      throw new IllegalArgumentException("illegal skip");
    }
    if (pos < 0 || pos > newTypes.size()) {
      throw new IllegalArgumentException("illegal pos");
    }

    List<Class<?>> targetTail = targetTypes.subList(skip, targetTypes.size());
    if (pos + targetTail.size() > newTypes.size() ||
        !targetTail.equals(newTypes.subList(pos, pos + targetTail.size()))) {
      throw new IllegalArgumentException("target parameter types do not match");
    }

    MethodHandle result = target;
    if (pos > 0) {
      result = MethodHandles.dropArguments(result, skip, new ArrayList<Class<?>>(newTypes.subList(0, pos)));
    }
    int tailEnd = pos + targetTail.size();
    if (tailEnd < newTypes.size()) {
      result = MethodHandles.dropArguments(
          result,
          skip + pos + targetTail.size(),
          new ArrayList<Class<?>>(newTypes.subList(tailEnd, newTypes.size())));
    }
    return result;
  }

  public static MethodHandle dropReturn(MethodHandle target) {
    Objects.requireNonNull(target);
    MethodType type = target.type();
    if (type.returnType() == void.class) {
      return target;
    }
    return target.asType(type.changeReturnType(void.class));
  }

  public static MethodHandle foldArguments(MethodHandle target, int pos, MethodHandle combiner) {
    Objects.requireNonNull(target);
    Objects.requireNonNull(combiner);
    if (pos == 0) {
      return MethodHandles.foldArguments(target, combiner);
    }

    MethodType targetType = target.type();
    MethodType combinerType = combiner.type();
    if (combinerType.returnType() == void.class) {
      throw new IllegalArgumentException("void combiner is not supported for non-zero fold position");
    }
    if (pos < 0 || pos >= targetType.parameterCount()) {
      throw new IllegalArgumentException("bad fold position");
    }
    if (targetType.parameterType(pos) != combinerType.returnType()) {
      throw new IllegalArgumentException("target and combiner return types do not match");
    }
    if (targetType.parameterCount() < pos + 1 + combinerType.parameterCount()) {
      throw new IllegalArgumentException("target and combiner types do not match");
    }
    for (int i = 0; i < combinerType.parameterCount(); i++) {
      if (targetType.parameterType(pos + 1 + i) != combinerType.parameterType(i)) {
        throw new IllegalArgumentException("target and combiner parameter types do not match");
      }
    }

    MethodHandle collected = MethodHandles.collectArguments(target, pos, combiner);
    MethodType desiredType = targetType.dropParameterTypes(pos, pos + 1);
    int[] reorder = new int[collected.type().parameterCount()];
    for (int i = 0; i < pos; i++) {
      reorder[i] = i;
    }
    for (int i = 0; i < combinerType.parameterCount(); i++) {
      reorder[pos + i] = pos + i;
    }
    int afterCount = targetType.parameterCount() - pos - 1;
    for (int i = 0; i < afterCount; i++) {
      reorder[pos + combinerType.parameterCount() + i] = pos + i;
    }
    return MethodHandles.permuteArguments(collected, desiredType, reorder);
  }

  public static int arrayLengthTarget(Object array) {
    return Array.getLength(array);
  }

  public static Object arrayConstructorTarget(Class<?> arrayClass, int length) {
    return Array.newInstance(arrayClass.getComponentType(), length);
  }

  private static void checkArrayClass(Class<?> arrayClass) {
    Objects.requireNonNull(arrayClass);
    if (!arrayClass.isArray()) {
      throw new IllegalArgumentException("not an array class");
    }
  }
}
