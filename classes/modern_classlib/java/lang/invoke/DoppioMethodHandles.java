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

  public static MethodHandle asCollector(MethodHandle target, int pos, Class<?> arrayType, int arrayLength) {
    Objects.requireNonNull(target);
    Objects.requireNonNull(arrayType);

    MethodType targetType = target.type();
    int parameterCount = targetType.parameterCount();
    if (pos == parameterCount - 1) {
      return target.asCollector(arrayType, arrayLength);
    }
    if (pos < 0 || pos >= parameterCount) {
      throw new IllegalArgumentException("bad collect position");
    }

    List<Class<?>> targetTypes = targetType.parameterList();
    List<Class<?>> movedTypes = new ArrayList<Class<?>>();
    movedTypes.addAll(targetTypes.subList(0, pos));
    movedTypes.addAll(targetTypes.subList(pos + 1, parameterCount));
    movedTypes.add(arrayType);
    MethodType movedType = MethodType.methodType(targetType.returnType(), movedTypes);
    int[] moveReorder = new int[parameterCount];
    for (int i = 0; i < pos; i++) {
      moveReorder[i] = i;
    }
    moveReorder[pos] = parameterCount - 1;
    int afterCount = parameterCount - pos - 1;
    for (int i = 0; i < afterCount; i++) {
      moveReorder[pos + 1 + i] = pos + i;
    }

    MethodHandle moved = MethodHandles.permuteArguments(target, movedType, moveReorder);
    MethodHandle collectedMoved = moved.asCollector(arrayType, arrayLength);
    Class<?> componentType = arrayType.getComponentType();
    List<Class<?>> desiredTypes = new ArrayList<Class<?>>();
    desiredTypes.addAll(targetTypes.subList(0, pos));
    for (int i = 0; i < arrayLength; i++) {
      desiredTypes.add(componentType);
    }
    desiredTypes.addAll(targetTypes.subList(pos + 1, parameterCount));
    MethodType desiredType = MethodType.methodType(targetType.returnType(), desiredTypes);
    int[] restoreReorder = new int[collectedMoved.type().parameterCount()];
    for (int i = 0; i < pos; i++) {
      restoreReorder[i] = i;
    }
    for (int i = 0; i < afterCount; i++) {
      restoreReorder[pos + i] = pos + arrayLength + i;
    }
    for (int i = 0; i < arrayLength; i++) {
      restoreReorder[pos + afterCount + i] = pos + i;
    }
    return MethodHandles.permuteArguments(collectedMoved, desiredType, restoreReorder);
  }

  public static MethodHandle asSpreader(MethodHandle target, int pos, Class<?> arrayType, int arrayLength) {
    Objects.requireNonNull(target);
    Objects.requireNonNull(arrayType);

    MethodType targetType = target.type();
    int parameterCount = targetType.parameterCount();
    if (pos == parameterCount - arrayLength) {
      return target.asSpreader(arrayType, arrayLength);
    }
    if (pos < 0 || arrayLength < 0 || pos + arrayLength > parameterCount) {
      throw new IllegalArgumentException("bad spread position");
    }

    List<Class<?>> targetTypes = targetType.parameterList();
    int afterCount = parameterCount - pos - arrayLength;
    List<Class<?>> movedTypes = new ArrayList<Class<?>>();
    movedTypes.addAll(targetTypes.subList(0, pos));
    movedTypes.addAll(targetTypes.subList(pos + arrayLength, parameterCount));
    movedTypes.addAll(targetTypes.subList(pos, pos + arrayLength));
    MethodType movedType = MethodType.methodType(targetType.returnType(), movedTypes);
    int[] moveReorder = new int[parameterCount];
    for (int i = 0; i < pos; i++) {
      moveReorder[i] = i;
    }
    for (int i = 0; i < arrayLength; i++) {
      moveReorder[pos + i] = pos + afterCount + i;
    }
    for (int i = 0; i < afterCount; i++) {
      moveReorder[pos + arrayLength + i] = pos + i;
    }

    MethodHandle moved = MethodHandles.permuteArguments(target, movedType, moveReorder);
    MethodHandle spreadMoved = moved.asSpreader(arrayType, arrayLength);
    List<Class<?>> desiredTypes = new ArrayList<Class<?>>();
    desiredTypes.addAll(targetTypes.subList(0, pos));
    desiredTypes.add(arrayType);
    desiredTypes.addAll(targetTypes.subList(pos + arrayLength, parameterCount));
    MethodType desiredType = MethodType.methodType(targetType.returnType(), desiredTypes);
    int[] restoreReorder = new int[spreadMoved.type().parameterCount()];
    for (int i = 0; i < pos; i++) {
      restoreReorder[i] = i;
    }
    for (int i = 0; i < afterCount; i++) {
      restoreReorder[pos + i] = pos + 1 + i;
    }
    restoreReorder[pos + afterCount] = pos;
    return MethodHandles.permuteArguments(spreadMoved, desiredType, restoreReorder);
  }

  public static MethodHandle whileLoop(MethodHandle init, MethodHandle pred, MethodHandle body)
      throws NoSuchMethodException, IllegalAccessException {
    Objects.requireNonNull(pred);
    Objects.requireNonNull(body);

    MethodType bodyType = body.type();
    Class<?> returnType = bodyType.returnType();
    if (returnType == void.class) {
      throw new IllegalArgumentException("void whileLoop body is not supported by this overlay");
    }
    if (bodyType.parameterCount() == 0 || bodyType.parameterType(0) != returnType) {
      throw new IllegalArgumentException("body must accept and return the loop state type");
    }

    List<Class<?>> externalTypes = bodyType.parameterList().subList(1, bodyType.parameterCount());
    int initArgumentCount = 0;
    if (init != null) {
      MethodType initType = init.type();
      if (initType.returnType() != returnType) {
        throw new IllegalArgumentException("init return type does not match body return type");
      }
      if (initType.parameterCount() > externalTypes.size()) {
        throw new IllegalArgumentException("init has too many parameters");
      }
      for (int i = 0; i < initType.parameterCount(); i++) {
        if (initType.parameterType(i) != externalTypes.get(i)) {
          throw new IllegalArgumentException("init parameter types do not match loop parameters");
        }
      }
      initArgumentCount = initType.parameterCount();
    }

    MethodType predType = pred.type();
    if (predType.returnType() != boolean.class) {
      throw new IllegalArgumentException("predicate must return boolean");
    }
    if (predType.parameterCount() > bodyType.parameterCount()) {
      throw new IllegalArgumentException("predicate has too many parameters");
    }
    for (int i = 0; i < predType.parameterCount(); i++) {
      if (predType.parameterType(i) != bodyType.parameterType(i)) {
        throw new IllegalArgumentException("predicate parameter types do not match loop state");
      }
    }

    MethodHandle adapter = MethodHandles.publicLookup().findStatic(
        DoppioMethodHandles.class,
        "whileLoopTarget",
        MethodType.methodType(
            Object.class,
            MethodHandle.class,
            MethodHandle.class,
            MethodHandle.class,
            Class.class,
            int.class,
            int.class,
            Object[].class));
    return MethodHandles.insertArguments(
            adapter,
            0,
            init,
            pred,
            body,
            returnType,
            Integer.valueOf(initArgumentCount),
            Integer.valueOf(predType.parameterCount()))
        .asCollector(Object[].class, externalTypes.size())
        .asType(MethodType.methodType(returnType, externalTypes));
  }

  public static MethodHandle tryFinally(MethodHandle target, MethodHandle cleanup)
      throws NoSuchMethodException, IllegalAccessException {
    Objects.requireNonNull(target);
    Objects.requireNonNull(cleanup);

    MethodType targetType = target.type();
    MethodType cleanupType = cleanup.type();
    Class<?> returnType = targetType.returnType();
    int leadingCleanupParameters = returnType == void.class ? 1 : 2;
    if (cleanupType.parameterCount() < leadingCleanupParameters ||
        cleanupType.parameterCount() > leadingCleanupParameters + targetType.parameterCount()) {
      throw new IllegalArgumentException("cleanup parameter count does not match target");
    }
    if (!Throwable.class.isAssignableFrom(cleanupType.parameterType(0))) {
      throw new IllegalArgumentException("cleanup first parameter must accept a throwable");
    }
    if (cleanupType.returnType() != returnType) {
      throw new IllegalArgumentException("target and cleanup return types do not match");
    }
    if (returnType != void.class && cleanupType.parameterType(1) != returnType) {
      throw new IllegalArgumentException("cleanup result parameter does not match target return type");
    }

    int cleanupArgumentCount = cleanupType.parameterCount() - leadingCleanupParameters;
    for (int i = 0; i < cleanupArgumentCount; i++) {
      if (cleanupType.parameterType(leadingCleanupParameters + i) != targetType.parameterType(i)) {
        throw new IllegalArgumentException("target and cleanup parameter types do not match");
      }
    }

    MethodHandle adapter = MethodHandles.publicLookup().findStatic(
        DoppioMethodHandles.class,
        "tryFinallyTarget",
        MethodType.methodType(
            Object.class,
            MethodHandle.class,
            MethodHandle.class,
            Class.class,
            int.class,
            Object[].class));
    return MethodHandles.insertArguments(
            adapter,
            0,
            target,
            cleanup,
            returnType,
            Integer.valueOf(cleanupArgumentCount))
        .asCollector(Object[].class, targetType.parameterCount())
        .asType(targetType);
  }

  public static int arrayLengthTarget(Object array) {
    return Array.getLength(array);
  }

  public static Object arrayConstructorTarget(Class<?> arrayClass, int length) {
    return Array.newInstance(arrayClass.getComponentType(), length);
  }

  public static Object tryFinallyTarget(
      MethodHandle target,
      MethodHandle cleanup,
      Class<?> returnType,
      int cleanupArgumentCount,
      Object[] args) throws Throwable {
    Object result = defaultValue(returnType);

    Throwable throwable = null;
    try {
      result = target.invokeWithArguments(args);
    } catch (Throwable t) {
      throwable = t;
      throw t;
    } finally {
      int leadingCleanupParameters = returnType == void.class ? 1 : 2;
      Object[] cleanupArgs = new Object[leadingCleanupParameters + cleanupArgumentCount];
      cleanupArgs[0] = throwable;
      if (returnType != void.class) {
        cleanupArgs[1] = result;
      }
      for (int i = 0; i < cleanupArgumentCount; i++) {
        cleanupArgs[leadingCleanupParameters + i] = args[i];
      }
      Object cleanupResult = cleanup.invokeWithArguments(cleanupArgs);
      if (throwable == null && returnType != void.class) {
        result = cleanupResult;
      }
    }
    return result;
  }

  public static Object whileLoopTarget(
      MethodHandle init,
      MethodHandle pred,
      MethodHandle body,
      Class<?> returnType,
      int initArgumentCount,
      int predArgumentCount,
      Object[] args) throws Throwable {
    Object state;
    if (init == null) {
      state = defaultValue(returnType);
    } else {
      Object[] initArgs = new Object[initArgumentCount];
      System.arraycopy(args, 0, initArgs, 0, initArgumentCount);
      state = init.invokeWithArguments(initArgs);
    }

    Object[] predArgs = new Object[predArgumentCount];
    Object[] bodyArgs = new Object[1 + args.length];
    System.arraycopy(args, 0, bodyArgs, 1, args.length);
    while (true) {
      for (int i = 0; i < predArgumentCount; i++) {
        predArgs[i] = i == 0 ? state : args[i - 1];
      }
      if (!((Boolean) pred.invokeWithArguments(predArgs)).booleanValue()) {
        return state;
      }
      bodyArgs[0] = state;
      state = body.invokeWithArguments(bodyArgs);
    }
  }

  private static void checkArrayClass(Class<?> arrayClass) {
    Objects.requireNonNull(arrayClass);
    if (!arrayClass.isArray()) {
      throw new IllegalArgumentException("not an array class");
    }
  }

  private static Object defaultValue(Class<?> type) {
    if (type == boolean.class) {
      return Boolean.FALSE;
    }
    if (type == byte.class) {
      return Byte.valueOf((byte) 0);
    }
    if (type == char.class) {
      return Character.valueOf((char) 0);
    }
    if (type == short.class) {
      return Short.valueOf((short) 0);
    }
    if (type == int.class) {
      return Integer.valueOf(0);
    }
    if (type == long.class) {
      return Long.valueOf(0L);
    }
    if (type == float.class) {
      return Float.valueOf(0f);
    }
    if (type == double.class) {
      return Double.valueOf(0d);
    }
    return null;
  }
}
