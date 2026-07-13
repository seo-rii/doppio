package classes.modern_test;

import java.lang.annotation.Annotation;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.ref.Reference;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Arrays;

public class Java9NoopReflection {
  private static boolean check(Class<?> owner, String name, Class<?>[] parameterTypes,
      String annotationName, Object[] arguments) throws Throwable {
    Method declared = owner.getDeclaredMethod(name, parameterTypes);
    Method inherited = owner.getMethod(name, parameterTypes);
    if (!declared.equals(inherited) || declared.getDeclaringClass() != owner ||
        declared.getModifiers() != (Modifier.PUBLIC | Modifier.STATIC) ||
        declared.getReturnType() != Void.TYPE ||
        !Arrays.equals(declared.getParameterTypes(), parameterTypes) ||
        declared.getExceptionTypes().length != 0 || declared.getDefaultValue() != null ||
        declared.isBridge() || declared.isSynthetic() || declared.isVarArgs()) {
      return false;
    }

    Annotation[] declaredAnnotations = declared.getDeclaredAnnotations();
    Annotation[] annotations = declared.getAnnotations();
    if (declaredAnnotations.length != 1 || annotations.length != 1 ||
        !annotationName.equals(declaredAnnotations[0].annotationType().getName()) ||
        !annotationName.equals(annotations[0].annotationType().getName())) {
      return false;
    }
    Annotation[][] parameterAnnotations = declared.getParameterAnnotations();
    if (parameterAnnotations.length != parameterTypes.length) {
      return false;
    }
    for (Annotation[] parameter : parameterAnnotations) {
      if (parameter.length != 0) {
        return false;
      }
    }

    int enumerated = 0;
    for (Method method : owner.getDeclaredMethods()) {
      if (method.equals(declared)) {
        enumerated++;
      }
    }
    if (enumerated != 1 || declared.invoke(null, arguments) != null) {
      return false;
    }

    MethodHandle handle = MethodHandles.lookup().unreflect(declared);
    return handle.type().equals(MethodType.methodType(Void.TYPE, parameterTypes)) &&
        handle.invokeWithArguments(arguments) == null;
  }

  public static void main(String[] args) throws Throwable {
    Object holder = new Object();
    Thread.onSpinWait();
    Reference.reachabilityFence(holder);
    Reference.reachabilityFence(null);

    System.out.println("spin=" + check(Thread.class, "onSpinWait", new Class<?>[0],
        "jdk.internal.vm.annotation.IntrinsicCandidate", new Object[0]));
    System.out.println("fence=" + check(Reference.class, "reachabilityFence",
        new Class<?>[] {Object.class}, "jdk.internal.vm.annotation.ForceInline",
        new Object[] {holder}));
  }
}
