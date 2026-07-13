package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Arrays;

public class Java15ClassIsHiddenReflection {
  private static final String INTRINSIC_CANDIDATE =
      "jdk.internal.vm.annotation.IntrinsicCandidate";

  private static final class Nested {}

  public static void main(String[] args) throws Throwable {
    class Local {}

    Object anonymous = new Object() {};
    Class<?>[] classes = {
      Java15ClassIsHiddenReflection.class,
      Nested.class,
      Local.class,
      anonymous.getClass(),
      String.class,
      Integer.TYPE,
      Void.TYPE,
      String[].class,
      int[].class
    };
    String[] labels = {
      "ordinary",
      "nested",
      "local",
      "anonymous",
      "jdk",
      "primitive",
      "void",
      "reference-array",
      "primitive-array"
    };

    Method declared = Class.class.getDeclaredMethod("isHidden");
    Method publicMethod = Class.class.getMethod("isHidden");
    MethodType descriptor = MethodType.methodType(
        declared.getReturnType(), declared.getParameterTypes());

    int declaredCount = 0;
    for (Method method : Class.class.getDeclaredMethods()) {
      if (method.equals(declared)) {
        declaredCount++;
      }
    }
    int publicCount = 0;
    for (Method method : Class.class.getMethods()) {
      if (method.equals(publicMethod)) {
        publicCount++;
      }
    }

    System.out.println("declared-lookup=" + (declared != null));
    System.out.println("public-lookup=" + (publicMethod != null));
    System.out.println("lookup-equal=" + declared.equals(publicMethod));
    System.out.println("declaring-class=" + declared.getDeclaringClass().getName());
    System.out.println("return-type=" + declared.getReturnType().getName());
    System.out.println("parameter-types=" + Arrays.toString(declared.getParameterTypes()));
    System.out.println("descriptor=" + descriptor.toMethodDescriptorString());
    System.out.println("modifiers=" + declared.getModifiers() + ":" +
        Modifier.toString(declared.getModifiers()));
    System.out.println("final=" + Modifier.isFinal(declared.getModifiers()));
    System.out.println("synthetic=" + declared.isSynthetic());
    System.out.println("bridge=" + declared.isBridge());
    System.out.println("varargs=" + declared.isVarArgs());
    System.out.println("exceptions=" + Arrays.toString(declared.getExceptionTypes()));
    java.lang.annotation.Annotation[] declaredAnnotations =
        declared.getDeclaredAnnotations();
    java.lang.annotation.Annotation[] annotations = declared.getAnnotations();
    boolean annotationMetadata = declaredAnnotations.length == 1 &&
        annotations.length == 1 &&
        declaredAnnotations[0].annotationType().getName().equals(INTRINSIC_CANDIDATE) &&
        annotations[0].annotationType().getName().equals(INTRINSIC_CANDIDATE) &&
        declared.getParameterAnnotations().length == 0;
    System.out.println("annotation-metadata=" + annotationMetadata);
    System.out.println("annotation-default=" + declared.getDefaultValue());
    System.out.println("default-method=" + declared.isDefault());
    System.out.println("enumeration=declared:" + declaredCount + ",public:" + publicCount);

    for (int i = 0; i < classes.length; i++) {
      System.out.println(labels[i] + "=direct:" + classes[i].isHidden() +
          ",invoke:" + declared.invoke(classes[i]));
    }

    MethodHandle handle = MethodHandles.lookup().unreflect(declared);
    MethodType expectedHandleType = MethodType.methodType(Boolean.TYPE, Class.class);
    System.out.println("handle-type=" + handle.type());
    System.out.println("handle-type-exact=" + handle.type().equals(expectedHandleType));
    Class<?> ordinary = classes[0];
    boolean handled = (boolean) handle.invokeExact(ordinary);
    System.out.println("handle-invoke=" + handled);
  }
}
