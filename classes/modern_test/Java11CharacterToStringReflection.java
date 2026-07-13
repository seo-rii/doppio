package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Arrays;

public class Java11CharacterToStringReflection {
  private static boolean metadata(Method method) {
    if (method.getDeclaringClass() != Character.class ||
        !method.getName().equals("toString") ||
        method.getModifiers() != (Modifier.PUBLIC | Modifier.STATIC) ||
        method.getReturnType() != String.class ||
        !Arrays.equals(method.getParameterTypes(), new Class<?>[] {Integer.TYPE}) ||
        method.getExceptionTypes().length != 0 || method.getDefaultValue() != null ||
        method.getDeclaredAnnotations().length != 0 || method.getAnnotations().length != 0 ||
        method.isBridge() || method.isSynthetic() || method.isVarArgs()) {
      return false;
    }
    return method.getParameterAnnotations().length == 1 &&
        method.getParameterAnnotations()[0].length == 0;
  }

  private static boolean enumeratedOnce(Method expected) {
    int count = 0;
    for (Method method : Character.class.getDeclaredMethods()) {
      if (method.equals(expected)) {
        count++;
      }
    }
    return count == 1;
  }

  private static String invokeFailure(Method method, int codePoint) {
    try {
      method.invoke(null, codePoint);
      return "none";
    } catch (InvocationTargetException e) {
      Throwable cause = e.getCause();
      return cause.getClass().getName() + ":" + cause.getMessage();
    } catch (Throwable t) {
      return t.getClass().getName() + ":" + t.getMessage();
    }
  }

  public static void main(String[] args) throws Throwable {
    Method declared = Character.class.getDeclaredMethod("toString", Integer.TYPE);
    Method inherited = Character.class.getMethod("toString", Integer.TYPE);
    MethodHandle handle = MethodHandles.lookup().unreflect(declared);

    System.out.println("metadata=" + (declared.equals(inherited) && metadata(declared) &&
        enumeratedOnce(declared)));
    System.out.println("type=" + handle.type().equals(
        MethodType.methodType(String.class, Integer.TYPE)));
    System.out.println("ascii=" + declared.invoke(null, 65));
    String smile = (String) declared.invoke(null, 0x1f600);
    System.out.println("smile=" + smile.length() + ":" + smile.codePointAt(0));
    String max = (String) handle.invokeExact(0x10ffff);
    System.out.println("max=" + max.length() + ":" + max.codePointAt(0));
    System.out.println("negative=" + invokeFailure(declared, -1));
    System.out.println("too-high=" + invokeFailure(declared, 0x110000));
  }
}
