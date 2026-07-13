package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Arrays;

public class Java16ClassIsRecordReflection {
  private record NonEmptyRecord(String name, int value) {}

  private record EmptyRecord() {}

  private static final class Plain {}

  private enum SampleEnum {
    VALUE
  }

  public static void main(String[] args) throws Throwable {
    record LocalRecord(long value) {}

    Class<?>[] classes = {
      NonEmptyRecord.class,
      EmptyRecord.class,
      LocalRecord.class,
      Plain.class,
      SampleEnum.class,
      String.class,
      Integer.TYPE,
      Void.TYPE,
      NonEmptyRecord[].class,
      int[].class
    };
    String[] labels = {
      "nonempty-record",
      "empty-record",
      "local-record",
      "plain",
      "enum",
      "jdk",
      "primitive",
      "void",
      "record-array",
      "primitive-array"
    };

    Method declared = Class.class.getDeclaredMethod("isRecord");
    Method publicMethod = Class.class.getMethod("isRecord");
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
    System.out.println("native=" + Modifier.isNative(declared.getModifiers()));
    System.out.println("final=" + Modifier.isFinal(declared.getModifiers()));
    System.out.println("synthetic=" + declared.isSynthetic());
    System.out.println("bridge=" + declared.isBridge());
    System.out.println("varargs=" + declared.isVarArgs());
    System.out.println("exceptions=" + Arrays.toString(declared.getExceptionTypes()));
    System.out.println("annotations=declared:" + declared.getDeclaredAnnotations().length +
        ",all:" + declared.getAnnotations().length +
        ",parameters:" + declared.getParameterAnnotations().length);
    System.out.println("annotation-default=" + declared.getDefaultValue());
    System.out.println("default-method=" + declared.isDefault());
    System.out.println("enumeration=declared:" + declaredCount + ",public:" + publicCount);

    for (int i = 0; i < classes.length; i++) {
      System.out.println(labels[i] + "=direct:" + classes[i].isRecord() +
          ",invoke:" + declared.invoke(classes[i]));
    }

    MethodHandle handle = MethodHandles.lookup().unreflect(declared);
    MethodType expectedHandleType = MethodType.methodType(Boolean.TYPE, Class.class);
    System.out.println("handle-type=" + handle.type());
    System.out.println("handle-type-exact=" + handle.type().equals(expectedHandleType));
    Class<?> recordClass = NonEmptyRecord.class;
    Class<?> plainClass = Plain.class;
    boolean recordResult = (boolean) handle.invokeExact(recordClass);
    boolean plainResult = (boolean) handle.invokeExact(plainClass);
    System.out.println("handle-invoke-record=" + recordResult);
    System.out.println("handle-invoke-plain=" + plainResult);
  }
}
