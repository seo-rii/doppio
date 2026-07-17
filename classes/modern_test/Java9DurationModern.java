package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.time.Duration;
import java.util.Arrays;

public class Java9DurationModern {
  private static String parts(Duration duration) {
    return duration.toDaysPart() + ":" +
        duration.toHoursPart() + ":" +
        duration.toMinutesPart() + ":" +
        duration.toSecondsPart() + ":" +
        duration.toMillisPart() + ":" +
        duration.toNanosPart() + ":" +
        duration.toSeconds();
  }

  private static boolean exactMethod(
      Method method, Class<?> returnType, Class<?>... parameterTypes) {
    return method.getModifiers() == Modifier.PUBLIC &&
        method.getReturnType() == returnType &&
        Arrays.equals(method.getParameterTypes(), parameterTypes) &&
        method.getExceptionTypes().length == 0 &&
        method.getTypeParameters().length == 0 &&
        method.getDeclaredAnnotations().length == 0 &&
        !method.isBridge() && !method.isDefault() && !method.isSynthetic() &&
        !method.isVarArgs();
  }

  private static int declaredCount(String name) {
    int count = 0;
    for (Method method : Duration.class.getDeclaredMethods()) {
      if (method.getName().equals(name)) {
        count++;
      }
    }
    return count;
  }

  public static void main(String[] args) throws Throwable {
    Duration positive = Duration.ofSeconds(183845, 678901234);
    Duration negative = Duration.ofSeconds(-183846, 321098766);
    Duration negativeFraction = Duration.ofSeconds(-1, 500000000);

    System.out.println("zero:" + parts(Duration.ZERO));
    System.out.println("positive:" + parts(positive));
    System.out.println("negative:" + parts(negative));
    System.out.println("negative-fraction:" + parts(negativeFraction));
    System.out.println("max:" + parts(Duration.ofSeconds(Long.MAX_VALUE, 999999999)));
    System.out.println("min:" + parts(Duration.ofSeconds(Long.MIN_VALUE)));

    Duration legacyArithmetic = Duration.ofSeconds(1, 250000000);
    System.out.println("legacy-multiply:" + legacyArithmetic.multipliedBy(2));
    System.out.println("legacy-divide:" + legacyArithmetic.dividedBy(2));
    System.out.println("divide-zero-value:" +
        Duration.ZERO.dividedBy(Duration.ofNanos(1)));
    System.out.println("divide-positive:" +
        Duration.ofSeconds(10).dividedBy(Duration.ofMillis(250)));
    System.out.println("divide-negative:" +
        Duration.ofSeconds(-5).dividedBy(Duration.ofSeconds(2)));
    System.out.println("divide-negative-divisor:" +
        Duration.ofSeconds(5).dividedBy(Duration.ofSeconds(-2)));
    System.out.println("divide-fraction:" +
        Duration.ofNanos(1).dividedBy(Duration.ofNanos(2)));
    System.out.println("divide-max:" +
        Duration.ofSeconds(Long.MAX_VALUE).dividedBy(Duration.ofSeconds(1)));
    System.out.println("divide-min:" +
        Duration.ofSeconds(Long.MIN_VALUE).dividedBy(Duration.ofSeconds(1)));

    try {
      Duration.ofSeconds(1).dividedBy(Duration.ZERO);
      System.out.println("divide-zero:none");
    } catch (RuntimeException e) {
      System.out.println("divide-zero:" + e.getClass().getSimpleName());
    }
    try {
      Duration.ofSeconds(Long.MAX_VALUE, 999999999).dividedBy(Duration.ofNanos(1));
      System.out.println("divide-overflow:none");
    } catch (RuntimeException e) {
      System.out.println("divide-overflow:" + e.getClass().getSimpleName());
    }
    try {
      Duration.ofSeconds(Long.MIN_VALUE).dividedBy(Duration.ofNanos(1));
      System.out.println("divide-negative-overflow:none");
    } catch (RuntimeException e) {
      System.out.println("divide-negative-overflow:" + e.getClass().getSimpleName());
    }
    try {
      Duration.ZERO.dividedBy(null);
      System.out.println("divide-null:none");
    } catch (RuntimeException e) {
      System.out.println("divide-null:" + e.getClass().getSimpleName() + ":" + e.getMessage());
    }

    Method dividedBy = Duration.class.getDeclaredMethod("dividedBy", Duration.class);
    Method toSeconds = Duration.class.getDeclaredMethod("toSeconds");
    Method toDaysPart = Duration.class.getDeclaredMethod("toDaysPart");
    Method toHoursPart = Duration.class.getDeclaredMethod("toHoursPart");
    Method toMinutesPart = Duration.class.getDeclaredMethod("toMinutesPart");
    Method toSecondsPart = Duration.class.getDeclaredMethod("toSecondsPart");
    Method toMillisPart = Duration.class.getDeclaredMethod("toMillisPart");
    Method toNanosPart = Duration.class.getDeclaredMethod("toNanosPart");

    System.out.println("metadata:" +
        exactMethod(dividedBy, long.class, Duration.class) + ":" +
        exactMethod(toSeconds, long.class) + ":" +
        exactMethod(toDaysPart, long.class) + ":" +
        exactMethod(toHoursPart, int.class) + ":" +
        exactMethod(toMinutesPart, int.class) + ":" +
        exactMethod(toSecondsPart, int.class) + ":" +
        exactMethod(toMillisPart, int.class) + ":" +
        exactMethod(toNanosPart, int.class));
    System.out.println("declared-counts:" +
        declaredCount("dividedBy") + ":" +
        declaredCount("toSeconds") + ":" +
        declaredCount("toDaysPart") + ":" +
        declaredCount("toHoursPart") + ":" +
        declaredCount("toMinutesPart") + ":" +
        declaredCount("toSecondsPart") + ":" +
        declaredCount("toMillisPart") + ":" +
        declaredCount("toNanosPart"));
    System.out.println("reflect:" +
        dividedBy.invoke(Duration.ofSeconds(9), Duration.ofSeconds(2)) + ":" +
        toDaysPart.invoke(positive) + ":" +
        toNanosPart.invoke(negative));
    try {
      dividedBy.invoke(Duration.ZERO, new Object[] { null });
      System.out.println("reflect-null:none");
    } catch (InvocationTargetException e) {
      System.out.println("reflect-null:" +
          e.getCause().getClass().getSimpleName() + ":" + e.getCause().getMessage());
    }

    MethodHandle divideHandle = MethodHandles.lookup().unreflect(dividedBy);
    MethodHandle secondsPartHandle = MethodHandles.lookup().unreflect(toSecondsPart);
    long divided = (long) divideHandle.invokeExact(
        Duration.ofSeconds(-9), Duration.ofSeconds(2));
    int secondsPart = (int) secondsPartHandle.invokeExact(negative);
    System.out.println("unreflect:" + divided + ":" + secondsPart);
    System.out.println("handle-types:" +
        divideHandle.type().equals(MethodType.methodType(
            long.class, Duration.class, Duration.class)) + ":" +
        secondsPartHandle.type().equals(MethodType.methodType(
            int.class, Duration.class)));
  }
}
