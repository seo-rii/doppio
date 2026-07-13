package classes.modern_test;

import java.lang.annotation.Annotation;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.ListResourceBundle;
import java.util.ResourceBundle;

public class Java9SystemGetLoggerReflection {
  private static final String CALLER_SENSITIVE =
      "jdk.internal.reflect.CallerSensitive";

  private static final class TestBundle extends ListResourceBundle {
    protected Object[][] getContents() {
      return new Object[][] {{"key", "value"}};
    }
  }

  private static boolean metadata(Method method, Class<?>... parameterTypes) {
    if (method.getDeclaringClass() != System.class ||
        !method.getName().equals("getLogger") ||
        method.getModifiers() != (Modifier.PUBLIC | Modifier.STATIC) ||
        method.getReturnType() != System.Logger.class ||
        !Arrays.equals(method.getParameterTypes(), parameterTypes) ||
        method.getExceptionTypes().length != 0 || method.getDefaultValue() != null ||
        method.isBridge() || method.isSynthetic() || method.isVarArgs()) {
      return false;
    }

    Annotation[] declared = method.getDeclaredAnnotations();
    Annotation[] inherited = method.getAnnotations();
    if (declared.length != 1 || inherited.length != 1 ||
        !declared[0].annotationType().getName().equals(CALLER_SENSITIVE) ||
        !inherited[0].annotationType().getName().equals(CALLER_SENSITIVE)) {
      return false;
    }

    Annotation[][] parameterAnnotations = method.getParameterAnnotations();
    if (parameterAnnotations.length != parameterTypes.length) {
      return false;
    }
    for (Annotation[] annotations : parameterAnnotations) {
      if (annotations.length != 0) {
        return false;
      }
    }
    return true;
  }

  private static boolean enumeratedOnce(Method expected) {
    int count = 0;
    for (Method method : System.class.getDeclaredMethods()) {
      if (method.equals(expected)) {
        count++;
      }
    }
    return count == 1;
  }

  private static boolean invocationRejectsNull(Method method, Object... arguments)
      throws IllegalAccessException {
    try {
      method.invoke(null, arguments);
      return false;
    } catch (InvocationTargetException exception) {
      Throwable cause = exception.getCause();
      return cause != null && cause.getClass() == NullPointerException.class &&
          cause == exception.getTargetException() && cause.getCause() == null;
    }
  }

  private static boolean directRejectsNull(ResourceBundle bundle) {
    boolean singleName = false;
    boolean bundledName = false;
    boolean bundledResource = false;
    try {
      System.getLogger(null);
    } catch (NullPointerException exception) {
      singleName = exception.getClass() == NullPointerException.class &&
          exception.getCause() == null;
    }
    try {
      System.getLogger(null, bundle);
    } catch (NullPointerException exception) {
      bundledName = exception.getClass() == NullPointerException.class &&
          exception.getCause() == null;
    }
    try {
      System.getLogger("doppio.reflect.null-bundle", null);
    } catch (NullPointerException exception) {
      bundledResource = exception.getClass() == NullPointerException.class &&
          exception.getCause() == null;
    }
    return singleName && bundledName && bundledResource;
  }

  public static void main(String[] args) throws Throwable {
    ResourceBundle bundle = new TestBundle();
    Method singleDeclared = System.class.getDeclaredMethod("getLogger", String.class);
    Method singlePublic = System.class.getMethod("getLogger", String.class);
    Method bundledDeclared = System.class.getDeclaredMethod(
        "getLogger", String.class, ResourceBundle.class);
    Method bundledPublic = System.class.getMethod(
        "getLogger", String.class, ResourceBundle.class);

    boolean metadata = singleDeclared.equals(singlePublic) &&
        bundledDeclared.equals(bundledPublic) &&
        metadata(singleDeclared, String.class) &&
        metadata(bundledDeclared, String.class, ResourceBundle.class) &&
        enumeratedOnce(singleDeclared) && enumeratedOnce(bundledDeclared);

    System.Logger directSingle = System.getLogger("doppio.reflect.direct");
    System.Logger directBundled = System.getLogger("doppio.reflect.direct-bundle", bundle);
    boolean direct = directSingle != null && directBundled != null &&
        directSingle.getName().equals("doppio.reflect.direct") &&
        directBundled.getName().equals("doppio.reflect.direct-bundle");

    System.Logger reflectedSingle = (System.Logger) singleDeclared.invoke(
        null, "doppio.reflect.reflected");
    System.Logger reflectedBundled = (System.Logger) bundledDeclared.invoke(
        null, "doppio.reflect.reflected-bundle", bundle);
    boolean reflection = reflectedSingle != null && reflectedBundled != null &&
        reflectedSingle.getName().equals("doppio.reflect.reflected") &&
        reflectedBundled.getName().equals("doppio.reflect.reflected-bundle");

    boolean nulls = directRejectsNull(bundle) &&
        invocationRejectsNull(singleDeclared, new Object[] {null}) &&
        invocationRejectsNull(bundledDeclared, new Object[] {null, bundle}) &&
        invocationRejectsNull(bundledDeclared,
            new Object[] {"doppio.reflect.null-bundle", null});

    MethodHandle singleHandle = MethodHandles.lookup().unreflect(singleDeclared);
    MethodHandle bundledHandle = MethodHandles.lookup().unreflect(bundledDeclared);
    System.Logger handledSingle = (System.Logger) singleHandle.invokeExact(
        "doppio.reflect.handled");
    System.Logger handledBundled = (System.Logger) bundledHandle.invokeExact(
        "doppio.reflect.handled-bundle", bundle);
    boolean handles = singleHandle.type().equals(
        MethodType.methodType(System.Logger.class, String.class)) &&
        bundledHandle.type().equals(MethodType.methodType(
            System.Logger.class, String.class, ResourceBundle.class)) &&
        handledSingle != null && handledBundled != null &&
        handledSingle.getName().equals("doppio.reflect.handled") &&
        handledBundled.getName().equals("doppio.reflect.handled-bundle");

    System.out.println("metadata=" + metadata);
    System.out.println("direct=" + direct);
    System.out.println("reflection=" + reflection);
    System.out.println("nulls=" + nulls);
    System.out.println("handles=" + handles);
  }
}
