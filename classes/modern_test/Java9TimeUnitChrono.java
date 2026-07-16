package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.TimeUnit;

public class Java9TimeUnitChrono {
  private static String mappings() {
    StringBuilder result = new StringBuilder();
    for (TimeUnit unit : TimeUnit.values()) {
      if (result.length() != 0) {
        result.append(',');
      }
      result.append(unit.name()).append('=').append(unit.toChronoUnit().name());
    }
    return result.toString();
  }

  private static boolean inverseMappings() {
    for (TimeUnit unit : TimeUnit.values()) {
      if (TimeUnit.of(unit.toChronoUnit()) != unit) {
        return false;
      }
    }
    return true;
  }

  private static String unsupported(ChronoUnit unit) {
    try {
      TimeUnit.of(unit);
      return "none";
    } catch (RuntimeException e) {
      return e.getClass().getSimpleName() + ":" + e.getMessage();
    }
  }

  private static boolean exactMethod(
      Method method, int modifiers, Class<?> returnType, Class<?>... parameterTypes) {
    return method.getModifiers() == modifiers &&
        method.getReturnType() == returnType &&
        java.util.Arrays.equals(method.getParameterTypes(), parameterTypes) &&
        method.getExceptionTypes().length == 0 &&
        method.getTypeParameters().length == 0 &&
        method.getDeclaredAnnotations().length == 0 &&
        !method.isBridge() && !method.isDefault() && !method.isSynthetic() &&
        !method.isVarArgs();
  }

  public static void main(String[] args) throws Throwable {
    System.out.println("mappings:" + mappings());
    System.out.println("inverse:" + inverseMappings());
    System.out.println("unsupported-half:" + unsupported(ChronoUnit.HALF_DAYS));
    System.out.println("unsupported-forever:" + unsupported(ChronoUnit.FOREVER));
    System.out.println("null:" + unsupported(null));

    Method toChrono = TimeUnit.class.getDeclaredMethod("toChronoUnit");
    Method of = TimeUnit.class.getDeclaredMethod("of", ChronoUnit.class);
    System.out.println("metadata:" +
        exactMethod(toChrono, Modifier.PUBLIC, ChronoUnit.class) + ":" +
        exactMethod(of, Modifier.PUBLIC | Modifier.STATIC, TimeUnit.class, ChronoUnit.class));
    System.out.println("reflect:" +
        (toChrono.invoke(TimeUnit.HOURS) == ChronoUnit.HOURS) + ":" +
        (of.invoke(null, ChronoUnit.DAYS) == TimeUnit.DAYS));
    try {
      of.invoke(null, ChronoUnit.WEEKS);
      System.out.println("reflect-failure:none");
    } catch (InvocationTargetException e) {
      System.out.println("reflect-failure:" + e.getCause().getClass().getSimpleName() +
          ":" + e.getCause().getMessage());
    }

    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandle toHandle = lookup.unreflect(toChrono);
    MethodHandle ofHandle = lookup.unreflect(of);
    ChronoUnit handledChrono = (ChronoUnit) toHandle.invokeExact(TimeUnit.MINUTES);
    TimeUnit handledUnit = (TimeUnit) ofHandle.invokeExact(ChronoUnit.SECONDS);
    System.out.println("unreflect:" +
        (handledChrono == ChronoUnit.MINUTES) + ":" +
        (handledUnit == TimeUnit.SECONDS));
    System.out.println("handle-types:" +
        toHandle.type().equals(MethodType.methodType(ChronoUnit.class, TimeUnit.class)) + ":" +
        ofHandle.type().equals(MethodType.methodType(TimeUnit.class, ChronoUnit.class)));
  }
}
