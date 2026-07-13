package classes.modern_test;

import java.lang.annotation.Annotation;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;

public class Java9PlatformClassLoaderReflection {
  private static boolean metadata(Method method) {
    if (method.getDeclaringClass() != ClassLoader.class ||
        !method.getName().equals("getPlatformClassLoader") ||
        method.getModifiers() != (Modifier.PUBLIC | Modifier.STATIC) ||
        method.getReturnType() != ClassLoader.class ||
        method.getParameterTypes().length != 0 ||
        method.getExceptionTypes().length != 0 || method.getDefaultValue() != null ||
        method.getParameterAnnotations().length != 0 ||
        method.isBridge() || method.isSynthetic() || method.isVarArgs()) {
      return false;
    }

    Annotation[] declared = method.getDeclaredAnnotations();
    Annotation[] inherited = method.getAnnotations();
    return declared.length == 1 && inherited.length == 1 &&
        declared[0].annotationType().getName().equals(
            "jdk.internal.reflect.CallerSensitive") &&
        inherited[0].annotationType().getName().equals(
            "jdk.internal.reflect.CallerSensitive");
  }

  private static boolean enumeratedOnce(Method expected) {
    int count = 0;
    for (Method method : ClassLoader.class.getDeclaredMethods()) {
      if (method.equals(expected)) {
        count++;
      }
    }
    return count == 1;
  }

  public static void main(String[] args) throws Throwable {
    ClassLoader system = ClassLoader.getSystemClassLoader();
    ClassLoader direct = ClassLoader.getPlatformClassLoader();
    Method declared = ClassLoader.class.getDeclaredMethod("getPlatformClassLoader");
    Method inherited = ClassLoader.class.getMethod("getPlatformClassLoader");
    ClassLoader reflected = (ClassLoader) declared.invoke(null);
    MethodHandle handle = MethodHandles.lookup().unreflect(declared);
    ClassLoader handled = (ClassLoader) handle.invokeExact();

    System.out.println("metadata=" + (declared.equals(inherited) && metadata(declared) &&
        enumeratedOnce(declared)));
    System.out.println("type=" + handle.type().equals(
        MethodType.methodType(ClassLoader.class)));
    System.out.println("identity=" + (direct == reflected && direct == handled &&
        direct == ClassLoader.getPlatformClassLoader()));
    System.out.println("hierarchy=" + (direct != null && direct.getParent() == null &&
        system != null && system.getParent() == direct));
  }
}
