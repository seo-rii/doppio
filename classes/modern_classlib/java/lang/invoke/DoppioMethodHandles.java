package java.lang.invoke;

import java.lang.reflect.Array;
import java.util.ArrayList;
import java.util.Iterator;
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

  public static MethodHandle loop(MethodHandle[]... clauses)
      throws NoSuchMethodException, IllegalAccessException {
    if (clauses == null) {
      throw new IllegalArgumentException("null clauses");
    }
    if (clauses.length != 1) {
      throw new IllegalArgumentException("only one loop clause is supported");
    }
    MethodHandle[] clause = Objects.requireNonNull(clauses[0]);
    if (clause.length != 3 && clause.length != 4) {
      throw new IllegalArgumentException("loop clause must contain init, step, pred, and optional fini handles");
    }

    MethodHandle init = clause[0];
    MethodHandle step = Objects.requireNonNull(clause[1]);
    MethodHandle pred = Objects.requireNonNull(clause[2]);
    MethodHandle fini = clause.length == 4 ? clause[3] : null;
    MethodType stepType = step.type();
    Class<?> stateType;
    List<Class<?>> externalTypes;
    if (init == null) {
      stateType = stepType.returnType();
      if (stateType == void.class ||
          stepType.parameterCount() == 0 ||
          stepType.parameterType(0) != stateType) {
        throw new IllegalArgumentException("step must accept and return the loop state type");
      }
      externalTypes = stepType.parameterList().subList(1, stepType.parameterCount());
    } else {
      MethodType initType = init.type();
      stateType = initType.returnType();
      if (stateType == void.class) {
        throw new IllegalArgumentException("init must return the loop state type");
      }
      externalTypes = initType.parameterList();
      checkLoopClauseHandle(stepType, stateType, externalTypes, stateType, "step");
    }
    checkLoopClauseHandle(pred.type(), stateType, externalTypes, boolean.class, "pred");
    Class<?> returnType = void.class;
    if (fini != null) {
      checkLoopClauseHandle(fini.type(), stateType, externalTypes, fini.type().returnType(), "fini");
      returnType = fini.type().returnType();
    }

    MethodHandle adapter = MethodHandles.publicLookup().findStatic(
        DoppioMethodHandles.class,
        "loopTarget",
        MethodType.methodType(
            Object.class,
            MethodHandle.class,
            MethodHandle.class,
            MethodHandle.class,
            MethodHandle.class,
            Class.class,
            Object[].class));
    return MethodHandles.insertArguments(adapter, 0, init, step, pred, fini, stateType)
        .asCollector(Object[].class, externalTypes.size())
        .asType(MethodType.methodType(returnType, externalTypes));
  }

  public static MethodHandle whileLoop(MethodHandle init, MethodHandle pred, MethodHandle body)
      throws NoSuchMethodException, IllegalAccessException {
    return stateLoop(init, pred, body, false);
  }

  public static MethodHandle doWhileLoop(MethodHandle init, MethodHandle body, MethodHandle pred)
      throws NoSuchMethodException, IllegalAccessException {
    return stateLoop(init, pred, body, true);
  }

  public static MethodHandle countedLoop(
      MethodHandle iterations, MethodHandle init, MethodHandle body)
      throws NoSuchMethodException, IllegalAccessException {
    Objects.requireNonNull(iterations);
    return countedLoop(null, iterations, init, body, false);
  }

  public static MethodHandle countedLoop(
      MethodHandle start, MethodHandle end, MethodHandle init, MethodHandle body)
      throws NoSuchMethodException, IllegalAccessException {
    Objects.requireNonNull(start);
    Objects.requireNonNull(end);
    Objects.requireNonNull(init);
    return countedLoop(start, end, init, body, true);
  }

  public static MethodHandle iteratedLoop(MethodHandle iterator, MethodHandle init, MethodHandle body)
      throws NoSuchMethodException, IllegalAccessException {
    Objects.requireNonNull(body);

    MethodType bodyType = body.type();
    Class<?> returnType = bodyType.returnType();
    boolean voidState = returnType == void.class;
    int bodyExternalArgumentCount;
    List<Class<?>> externalTypes;
    if (voidState) {
      if (bodyType.parameterCount() < 1) {
        throw new IllegalArgumentException("void body must accept element parameter");
      }
      bodyExternalArgumentCount = bodyType.parameterCount() - 1;
      externalTypes = new ArrayList<Class<?>>(
          bodyType.parameterList().subList(1, bodyType.parameterCount()));
    } else {
      if (bodyType.parameterCount() < 2 || bodyType.parameterType(0) != returnType) {
        throw new IllegalArgumentException("body must accept state and element parameters");
      }
      bodyExternalArgumentCount = bodyType.parameterCount() - 2;
      externalTypes = new ArrayList<Class<?>>(
          bodyType.parameterList().subList(2, bodyType.parameterCount()));
    }

    boolean defaultIterator = iterator == null;
    int iteratorArgumentCount = 0;
    if (defaultIterator) {
      if (externalTypes.isEmpty()) {
        externalTypes.add(Iterable.class);
      } else if (!Iterable.class.isAssignableFrom(externalTypes.get(0))) {
        throw new IllegalArgumentException("first loop parameter must be Iterable when iterator is null");
      }
    } else {
      MethodType iteratorType = iterator.type();
      if (!Iterator.class.isAssignableFrom(iteratorType.returnType())) {
        throw new IllegalArgumentException("iterator must return Iterator");
      }
      if (externalTypes.isEmpty() && iteratorType.parameterCount() > 0) {
        externalTypes.addAll(iteratorType.parameterList());
      }
      iteratorArgumentCount = checkedPrefixArgumentCount(iteratorType, externalTypes, "iterator");
    }

    int initArgumentCount = 0;
    if (init != null) {
      MethodType initType = init.type();
      if (initType.returnType() != returnType) {
        throw new IllegalArgumentException("init return type does not match body return type");
      }
      initArgumentCount = checkedPrefixArgumentCount(initType, externalTypes, "init");
    }

    MethodHandle adapter = MethodHandles.publicLookup().findStatic(
        DoppioMethodHandles.class,
        "iteratedLoopTarget",
        MethodType.methodType(
            Object.class,
            MethodHandle.class,
            MethodHandle.class,
            MethodHandle.class,
            Class.class,
            int.class,
            int.class,
            int.class,
            boolean.class,
            boolean.class,
            Object[].class));
    return MethodHandles.insertArguments(
            adapter,
            0,
            iterator,
            init,
            body,
            returnType,
            Integer.valueOf(iteratorArgumentCount),
            Integer.valueOf(initArgumentCount),
            Integer.valueOf(bodyExternalArgumentCount),
            Boolean.valueOf(defaultIterator),
            Boolean.valueOf(voidState))
        .asCollector(Object[].class, externalTypes.size())
        .asType(MethodType.methodType(returnType, externalTypes));
  }

  private static MethodHandle countedLoop(
      MethodHandle start,
      MethodHandle end,
      MethodHandle init,
      MethodHandle body,
      boolean explicitStart)
      throws NoSuchMethodException, IllegalAccessException {
    Objects.requireNonNull(body);

    MethodType bodyType = body.type();
    Class<?> returnType = bodyType.returnType();
    boolean voidState = returnType == void.class;
    List<Class<?>> externalTypes;
    if (voidState) {
      if (bodyType.parameterCount() < 1 || bodyType.parameterType(0) != int.class) {
        throw new IllegalArgumentException("void body must accept int counter parameter");
      }
      externalTypes = bodyType.parameterList().subList(1, bodyType.parameterCount());
    } else {
      if (bodyType.parameterCount() < 2 ||
          bodyType.parameterType(0) != returnType ||
          bodyType.parameterType(1) != int.class) {
        throw new IllegalArgumentException("body must accept state and int counter parameters");
      }
      externalTypes = bodyType.parameterList().subList(2, bodyType.parameterCount());
    }

    int startArgumentCount = 0;
    if (explicitStart) {
      MethodType startType = start.type();
      if (startType.returnType() != int.class) {
        throw new IllegalArgumentException("start must return int");
      }
      startArgumentCount = checkedPrefixArgumentCount(startType, externalTypes, "start");
    }

    MethodType endType = end.type();
    if (endType.returnType() != int.class) {
      throw new IllegalArgumentException("end must return int");
    }
    int endArgumentCount = checkedPrefixArgumentCount(endType, externalTypes, "end");

    int initArgumentCount = 0;
    if (init != null) {
      MethodType initType = init.type();
      if (initType.returnType() != returnType) {
        throw new IllegalArgumentException("init return type does not match body return type");
      }
      initArgumentCount = checkedPrefixArgumentCount(initType, externalTypes, "init");
    }

    MethodHandle adapter = MethodHandles.publicLookup().findStatic(
        DoppioMethodHandles.class,
        "countedLoopTarget",
        MethodType.methodType(
            Object.class,
            MethodHandle.class,
            MethodHandle.class,
            MethodHandle.class,
            MethodHandle.class,
            Class.class,
            int.class,
            int.class,
            int.class,
            boolean.class,
            Object[].class));
    return MethodHandles.insertArguments(
            adapter,
            0,
            start,
            end,
            init,
            body,
            returnType,
            Integer.valueOf(startArgumentCount),
            Integer.valueOf(endArgumentCount),
            Integer.valueOf(initArgumentCount),
            Boolean.valueOf(voidState))
        .asCollector(Object[].class, externalTypes.size())
        .asType(MethodType.methodType(returnType, externalTypes));
  }

  private static MethodHandle stateLoop(
      MethodHandle init, MethodHandle pred, MethodHandle body, boolean bodyFirst)
      throws NoSuchMethodException, IllegalAccessException {
    Objects.requireNonNull(pred);
    Objects.requireNonNull(body);

    MethodType bodyType = body.type();
    Class<?> returnType = bodyType.returnType();
    boolean voidState = returnType == void.class;
    List<Class<?>> externalTypes;
    if (voidState) {
      externalTypes = bodyType.parameterList();
    } else {
      if (bodyType.parameterCount() == 0 || bodyType.parameterType(0) != returnType) {
        throw new IllegalArgumentException("body must accept and return the loop state type");
      }
      externalTypes = bodyType.parameterList().subList(1, bodyType.parameterCount());
    }

    int initArgumentCount = 0;
    if (init != null) {
      MethodType initType = init.type();
      if (initType.returnType() != returnType) {
        throw new IllegalArgumentException("init return type does not match body return type");
      }
      initArgumentCount = checkedPrefixArgumentCount(initType, externalTypes, "init");
    }

    MethodType predType = pred.type();
    if (predType.returnType() != boolean.class) {
      throw new IllegalArgumentException("predicate must return boolean");
    }
    if (predType.parameterCount() > (voidState ? externalTypes.size() : bodyType.parameterCount())) {
      throw new IllegalArgumentException("predicate has too many parameters");
    }
    for (int i = 0; i < predType.parameterCount(); i++) {
      Class<?> expectedType = voidState ? externalTypes.get(i) : bodyType.parameterType(i);
      if (predType.parameterType(i) != expectedType) {
        throw new IllegalArgumentException("predicate parameter types do not match loop state");
      }
    }

    String targetName = bodyFirst ? "doWhileLoopTarget" : "whileLoopTarget";
    MethodHandle adapter = MethodHandles.publicLookup().findStatic(
        DoppioMethodHandles.class,
        targetName,
        MethodType.methodType(
            Object.class,
            MethodHandle.class,
            MethodHandle.class,
            MethodHandle.class,
            Class.class,
            int.class,
            int.class,
            boolean.class,
            Object[].class));
    return MethodHandles.insertArguments(
            adapter,
            0,
            init,
            pred,
            body,
            returnType,
            Integer.valueOf(initArgumentCount),
            Integer.valueOf(predType.parameterCount()),
            Boolean.valueOf(voidState))
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

  public static MethodHandle tableSwitch(MethodHandle fallback, MethodHandle... targets)
      throws NoSuchMethodException, IllegalAccessException {
    Objects.requireNonNull(fallback);
    Objects.requireNonNull(targets);
    if (targets.length == 0) {
      throw new IllegalArgumentException("no target handles");
    }

    MethodType switchType = fallback.type();
    if (switchType.parameterCount() == 0 || switchType.parameterType(0) != int.class) {
      throw new IllegalArgumentException("leading selector parameter must be int");
    }
    for (int i = 0; i < targets.length; i++) {
      Objects.requireNonNull(targets[i]);
      if (!switchType.equals(targets[i].type())) {
        throw new IllegalArgumentException("target types must match fallback type");
      }
    }

    MethodHandle adapter = MethodHandles.publicLookup().findStatic(
        DoppioMethodHandles.class,
        "tableSwitchTarget",
        MethodType.methodType(
            Object.class,
            MethodHandle.class,
            MethodHandle[].class,
            Object[].class));
    return MethodHandles.insertArguments(adapter, 0, new Object[] { fallback, targets })
        .asCollector(Object[].class, switchType.parameterCount())
        .asType(switchType);
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

  public static Object tableSwitchTarget(
      MethodHandle fallback, MethodHandle[] targets, Object[] args) throws Throwable {
    int selector = ((Integer) args[0]).intValue();
    MethodHandle target = selector >= 0 && selector < targets.length ? targets[selector] : fallback;
    return target.invokeWithArguments(args);
  }

  public static Object loopTarget(
      MethodHandle init,
      MethodHandle step,
      MethodHandle pred,
      MethodHandle fini,
      Class<?> stateType,
      Object[] args) throws Throwable {
    Object state = init == null ? defaultValue(stateType) : init.invokeWithArguments(args);
    Object[] loopArgs = new Object[1 + args.length];
    System.arraycopy(args, 0, loopArgs, 1, args.length);
    do {
      loopArgs[0] = state;
      state = step.invokeWithArguments(loopArgs);
      loopArgs[0] = state;
    } while (((Boolean) pred.invokeWithArguments(loopArgs)).booleanValue());
    return fini == null ? null : fini.invokeWithArguments(loopArgs);
  }

  public static Object iteratedLoopTarget(
      MethodHandle iterator,
      MethodHandle init,
      MethodHandle body,
      Class<?> returnType,
      int iteratorArgumentCount,
      int initArgumentCount,
      int bodyExternalArgumentCount,
      boolean defaultIterator,
      boolean voidState,
      Object[] args) throws Throwable {
    Iterator<?> values;
    if (defaultIterator) {
      values = ((Iterable<?>) args[0]).iterator();
    } else {
      Object[] iteratorArgs = new Object[iteratorArgumentCount];
      System.arraycopy(args, 0, iteratorArgs, 0, iteratorArgumentCount);
      values = (Iterator<?>) iterator.invokeWithArguments(iteratorArgs);
    }

    Object state = null;
    if (voidState) {
      if (init != null) {
        Object[] initArgs = new Object[initArgumentCount];
        System.arraycopy(args, 0, initArgs, 0, initArgumentCount);
        init.invokeWithArguments(initArgs);
      }
    } else {
      if (init == null) {
        state = defaultValue(returnType);
      } else {
        Object[] initArgs = new Object[initArgumentCount];
        System.arraycopy(args, 0, initArgs, 0, initArgumentCount);
        state = init.invokeWithArguments(initArgs);
      }
    }

    int leadingBodyArguments = voidState ? 1 : 2;
    Object[] bodyArgs = new Object[leadingBodyArguments + bodyExternalArgumentCount];
    System.arraycopy(args, 0, bodyArgs, leadingBodyArguments, bodyExternalArgumentCount);
    while (values.hasNext()) {
      if (voidState) {
        bodyArgs[0] = values.next();
        body.invokeWithArguments(bodyArgs);
      } else {
        bodyArgs[0] = state;
        bodyArgs[1] = values.next();
        state = body.invokeWithArguments(bodyArgs);
      }
    }
    return state;
  }

  public static Object whileLoopTarget(
      MethodHandle init,
      MethodHandle pred,
      MethodHandle body,
      Class<?> returnType,
      int initArgumentCount,
      int predArgumentCount,
      boolean voidState,
      Object[] args) throws Throwable {
    Object state = null;
    if (voidState) {
      if (init != null) {
        Object[] initArgs = new Object[initArgumentCount];
        System.arraycopy(args, 0, initArgs, 0, initArgumentCount);
        init.invokeWithArguments(initArgs);
      }
    } else {
      if (init == null) {
        state = defaultValue(returnType);
      } else {
        Object[] initArgs = new Object[initArgumentCount];
        System.arraycopy(args, 0, initArgs, 0, initArgumentCount);
        state = init.invokeWithArguments(initArgs);
      }
    }

    while (true) {
      if (!invokeLoopPredicate(pred, predArgumentCount, state, args, voidState)) {
        return state;
      }
      state = invokeLoopBody(body, state, args, voidState);
    }
  }

  public static Object doWhileLoopTarget(
      MethodHandle init,
      MethodHandle pred,
      MethodHandle body,
      Class<?> returnType,
      int initArgumentCount,
      int predArgumentCount,
      boolean voidState,
      Object[] args) throws Throwable {
    Object state = null;
    if (voidState) {
      if (init != null) {
        Object[] initArgs = new Object[initArgumentCount];
        System.arraycopy(args, 0, initArgs, 0, initArgumentCount);
        init.invokeWithArguments(initArgs);
      }
    } else {
      if (init == null) {
        state = defaultValue(returnType);
      } else {
        Object[] initArgs = new Object[initArgumentCount];
        System.arraycopy(args, 0, initArgs, 0, initArgumentCount);
        state = init.invokeWithArguments(initArgs);
      }
    }

    while (true) {
      state = invokeLoopBody(body, state, args, voidState);
      if (!invokeLoopPredicate(pred, predArgumentCount, state, args, voidState)) {
        return state;
      }
    }
  }

  public static Object countedLoopTarget(
      MethodHandle start,
      MethodHandle end,
      MethodHandle init,
      MethodHandle body,
      Class<?> returnType,
      int startArgumentCount,
      int endArgumentCount,
      int initArgumentCount,
      boolean voidState,
      Object[] args) throws Throwable {
    int startValue = 0;
    if (start != null) {
      Object[] startArgs = new Object[startArgumentCount];
      System.arraycopy(args, 0, startArgs, 0, startArgumentCount);
      startValue = ((Integer) start.invokeWithArguments(startArgs)).intValue();
    }

    Object[] endArgs = new Object[endArgumentCount];
    System.arraycopy(args, 0, endArgs, 0, endArgumentCount);
    int endValue = ((Integer) end.invokeWithArguments(endArgs)).intValue();

    Object state = null;
    if (voidState) {
      if (init != null) {
        Object[] initArgs = new Object[initArgumentCount];
        System.arraycopy(args, 0, initArgs, 0, initArgumentCount);
        init.invokeWithArguments(initArgs);
      }
    } else {
      if (init == null) {
        state = defaultValue(returnType);
      } else {
        Object[] initArgs = new Object[initArgumentCount];
        System.arraycopy(args, 0, initArgs, 0, initArgumentCount);
        state = init.invokeWithArguments(initArgs);
      }
    }

    int leadingBodyArguments = voidState ? 1 : 2;
    Object[] bodyArgs = new Object[leadingBodyArguments + args.length];
    System.arraycopy(args, 0, bodyArgs, leadingBodyArguments, args.length);
    for (int index = startValue; index < endValue; index++) {
      if (voidState) {
        bodyArgs[0] = Integer.valueOf(index);
        body.invokeWithArguments(bodyArgs);
      } else {
        bodyArgs[0] = state;
        bodyArgs[1] = Integer.valueOf(index);
        state = body.invokeWithArguments(bodyArgs);
      }
    }
    return state;
  }

  private static boolean invokeLoopPredicate(
      MethodHandle pred,
      int predArgumentCount,
      Object state,
      Object[] args,
      boolean voidState) throws Throwable {
    Object[] predArgs = new Object[predArgumentCount];
    for (int i = 0; i < predArgumentCount; i++) {
      predArgs[i] = voidState ? args[i] : (i == 0 ? state : args[i - 1]);
    }
    return ((Boolean) pred.invokeWithArguments(predArgs)).booleanValue();
  }

  private static Object invokeLoopBody(
      MethodHandle body, Object state, Object[] args, boolean voidState) throws Throwable {
    if (voidState) {
      body.invokeWithArguments(args);
      return null;
    }
    Object[] bodyArgs = new Object[1 + args.length];
    System.arraycopy(args, 0, bodyArgs, 1, args.length);
    bodyArgs[0] = state;
    return body.invokeWithArguments(bodyArgs);
  }

  private static void checkArrayClass(Class<?> arrayClass) {
    Objects.requireNonNull(arrayClass);
    if (!arrayClass.isArray()) {
      throw new IllegalArgumentException("not an array class");
    }
  }

  private static int checkedPrefixArgumentCount(
      MethodType type, List<Class<?>> externalTypes, String role) {
    if (type.parameterCount() > externalTypes.size()) {
      throw new IllegalArgumentException(role + " has too many parameters");
    }
    for (int i = 0; i < type.parameterCount(); i++) {
      if (type.parameterType(i) != externalTypes.get(i)) {
        throw new IllegalArgumentException(role + " parameter types do not match loop parameters");
      }
    }
    return type.parameterCount();
  }

  private static void checkLoopClauseHandle(
      MethodType type,
      Class<?> stateType,
      List<Class<?>> externalTypes,
      Class<?> returnType,
      String role) {
    if (type.returnType() != returnType) {
      throw new IllegalArgumentException(role + " return type does not match");
    }
    if (type.parameterCount() != externalTypes.size() + 1) {
      throw new IllegalArgumentException(role + " parameter count does not match");
    }
    if (type.parameterType(0) != stateType) {
      throw new IllegalArgumentException(role + " state parameter type does not match");
    }
    for (int i = 0; i < externalTypes.size(); i++) {
      if (type.parameterType(i + 1) != externalTypes.get(i)) {
        throw new IllegalArgumentException(role + " external parameter types do not match");
      }
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
