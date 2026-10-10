package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.time.Duration;

public class Java21DurationIsPositive {
  private static int checks;

  private static void check(boolean condition, String label) {
    checks++;
    if (!condition) {
      throw new AssertionError(label);
    }
  }

  private static void sign(Duration value, boolean expected) {
    check(value.isPositive() == expected, "direct " + value);
    check(value.isPositive() == (!value.isZero() && !value.isNegative()),
        "sign consistency " + value);
  }

  public static void main(String[] args) throws Throwable {
    sign(Duration.ZERO, false);
    sign(Duration.ofNanos(1), true);
    sign(Duration.ofNanos(-1), false);
    sign(Duration.ofSeconds(1), true);
    sign(Duration.ofSeconds(-1), false);
    sign(Duration.ofSeconds(0, 999999999), true);
    sign(Duration.ofSeconds(-1, 1), false);
    sign(Duration.ofSeconds(Long.MAX_VALUE, 999999999), true);
    sign(Duration.ofSeconds(Long.MIN_VALUE), false);

    Method method = Duration.class.getDeclaredMethod("isPositive");
    check(method.getReturnType() == boolean.class, "return type");
    check(method.getParameterTypes().length == 0, "parameters");
    check(Modifier.isPublic(method.getModifiers()) &&
        !Modifier.isStatic(method.getModifiers()), "modifiers");
    check(Boolean.TRUE.equals(method.invoke(Duration.ofNanos(1))), "reflect positive");
    check(Boolean.FALSE.equals(method.invoke(Duration.ZERO)), "reflect zero");

    MethodHandle handle = MethodHandles.lookup().unreflect(method);
    check(handle.type().equals(MethodType.methodType(boolean.class, Duration.class)),
        "handle type");
    check((boolean) handle.invokeExact(Duration.ofNanos(1)), "handle positive");
    check(!(boolean) handle.invokeExact(Duration.ofNanos(-1)), "handle negative");
    System.out.println("duration-is-positive:" + checks + ":ok");
  }
}
