package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.time.Duration;
import java.util.Arrays;
import java.util.concurrent.TimeUnit;

public class Java11TimeUnitDuration {
  private static String conversions(Duration duration) {
    StringBuilder result = new StringBuilder();
    for (TimeUnit unit : TimeUnit.values()) {
      if (result.length() != 0) {
        result.append(',');
      }
      result.append(unit.convert(duration));
    }
    return result.toString();
  }

  private static boolean exactMethod(Method method) {
    return method.getModifiers() == Modifier.PUBLIC &&
        method.getReturnType() == long.class &&
        Arrays.equals(method.getParameterTypes(), new Class<?>[] { Duration.class }) &&
        method.getExceptionTypes().length == 0 &&
        method.getTypeParameters().length == 0 &&
        method.getDeclaredAnnotations().length == 0 &&
        !method.isBridge() && !method.isDefault() && !method.isSynthetic() &&
        !method.isVarArgs();
  }

  public static void main(String[] args) throws Throwable {
    Duration positive = Duration.ofSeconds(2, 345678901);
    Duration negative = Duration.ofSeconds(-3, 654321099);
    Duration max = Duration.ofSeconds(Long.MAX_VALUE, 999999999);
    Duration min = Duration.ofSeconds(Long.MIN_VALUE);
    Duration minFraction = Duration.ofSeconds(Long.MIN_VALUE, 1);

    System.out.println("zero:" + conversions(Duration.ZERO));
    System.out.println("sub-micro:" + conversions(Duration.ofNanos(999)));
    System.out.println("positive:" + conversions(positive));
    System.out.println("negative:" + conversions(negative));
    System.out.println("max:" + conversions(max));
    System.out.println("min:" + conversions(min));
    System.out.println("min-fraction:" + conversions(minFraction));

    try {
      TimeUnit.SECONDS.convert((Duration) null);
      System.out.println("null:none");
    } catch (RuntimeException e) {
      System.out.println("null:" + e.getClass().getSimpleName());
    }

    Method convert = TimeUnit.class.getDeclaredMethod("convert", Duration.class);
    System.out.println("metadata:" + exactMethod(convert));
    System.out.println("reflect:" + convert.invoke(TimeUnit.MILLISECONDS, positive));
    try {
      convert.invoke(TimeUnit.SECONDS, new Object[] { null });
      System.out.println("reflect-null:none");
    } catch (InvocationTargetException e) {
      System.out.println("reflect-null:" + e.getCause().getClass().getSimpleName());
    }

    MethodHandle handle = MethodHandles.lookup().unreflect(convert);
    long handled = (long) handle.invokeExact(TimeUnit.MICROSECONDS, negative);
    System.out.println("unreflect:" + handled);
    System.out.println("handle-type:" +
        handle.type().equals(MethodType.methodType(long.class, TimeUnit.class, Duration.class)));
  }
}
