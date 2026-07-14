package classes.modern_test;

import java.lang.constant.ClassDesc;
import java.lang.constant.Constable;
import java.lang.constant.ConstantDesc;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.invoke.TypeDescriptor;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.Arrays;
import java.util.Optional;

public class Java12ClassConstableReflection {
  private static final class Nested {
  }

  private interface Marker {
  }

  private enum Choice {
    VALUE
  }

  private @interface Tag {
  }

  public static void main(String[] args) throws Throwable {
    class Local {
    }

    Runnable anonymous = new Runnable() {
      public void run() {
      }
    };

    Method declared = Class.class.getDeclaredMethod("describeConstable");
    Method publicMethod = Class.class.getMethod("describeConstable");

    System.out.println("declared-public-equal=" + declared.equals(publicMethod));
    System.out.println("declared-count=" + count(
        Class.class.getDeclaredMethods(), "describeConstable"));
    System.out.println("public-count=" + count(Class.class.getMethods(), "describeConstable"));
    System.out.println("descriptor=" + MethodType.methodType(
        declared.getReturnType(), declared.getParameterTypes()).toMethodDescriptorString());
    System.out.println("declaring-class=" + declared.getDeclaringClass().getName());
    System.out.println("modifiers=" + declared.getModifiers() + ":" +
        Modifier.toString(declared.getModifiers()));
    System.out.println("native=" + Modifier.isNative(declared.getModifiers()));
    System.out.println("synthetic=" + declared.isSynthetic());
    System.out.println("bridge=" + declared.isBridge());
    System.out.println("varargs=" + declared.isVarArgs());
    System.out.println("default=" + declared.isDefault());
    System.out.println("return-type=" + declared.getReturnType().getTypeName());
    System.out.println("generic-return-type=" +
        declared.getGenericReturnType().getTypeName());
    System.out.println("parameter-types=" + Arrays.toString(declared.getParameterTypes()));
    System.out.println("generic-parameter-types=" +
        Arrays.toString(declared.getGenericParameterTypes()));
    System.out.println("type-parameters=" + Arrays.toString(declared.getTypeParameters()));
    System.out.println("exception-types=" + Arrays.toString(declared.getExceptionTypes()));
    System.out.println("generic-exception-types=" +
        Arrays.toString(declared.getGenericExceptionTypes()));
    System.out.println("annotations=" + Arrays.toString(declared.getAnnotations()));
    System.out.println("declared-annotations=" +
        Arrays.toString(declared.getDeclaredAnnotations()));
    System.out.println("annotated-return-type=" +
        declared.getAnnotatedReturnType().getType().getTypeName());
    System.out.println("annotated-return-annotations=" +
        Arrays.toString(declared.getAnnotatedReturnType().getAnnotations()));
    System.out.println("parameters=" + Arrays.toString(declared.getParameters()));

    System.out.println("raw-interfaces=" + interfaceNames(Class.class.getInterfaces()));
    System.out.println("generic-interface-count=" +
        Class.class.getGenericInterfaces().length);
    Type fieldDescriptorInterface = null;
    for (Type type : Class.class.getGenericInterfaces()) {
      if (type instanceof ParameterizedType
          && ((ParameterizedType) type).getRawType() == TypeDescriptor.OfField.class) {
        fieldDescriptorInterface = type;
      }
    }
    System.out.println("field-descriptor-type-name=" +
        fieldDescriptorInterface.getTypeName());
    System.out.println("field-descriptor-to-string=" +
        fieldDescriptorInterface.toString());
    System.out.println("constable-assignable=" +
        Constable.class.isAssignableFrom(Class.class));
    System.out.println("class-is-constable=" + Constable.class.isInstance(String.class));
    System.out.println("raw-constable-interface=" + containsInterface(
        Class.class.getInterfaces(), Constable.class));
    System.out.println("generic-constable-interface=" + containsGenericInterface(
        Class.class.getGenericInterfaces(), Constable.class));

    Class<?>[] types = {
      Java12ClassConstableReflection.class,
      Nested.class,
      Local.class,
      anonymous.getClass(),
      Marker.class,
      Choice.class,
      Tag.class,
      String.class,
      java.util.Map.Entry.class,
      int.class,
      void.class,
      String[][].class,
      int[][].class,
      Java12ClassConstableReflection[].class
    };
    String[] labels = {
      "ordinary",
      "nested",
      "local",
      "anonymous",
      "interface",
      "enum",
      "annotation",
      "jdk",
      "jdk-nested",
      "primitive",
      "void",
      "reference-array",
      "primitive-array",
      "user-array"
    };
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    for (int i = 0; i < types.length; i++) {
      print(labels[i], types[i], declared, lookup);
    }

    Constable interfaceReceiver = (Constable) String[].class;
    Optional<? extends ConstantDesc> interfaceResult =
        interfaceReceiver.describeConstable();
    System.out.println("interface-dispatch=" +
        ((ClassDesc) interfaceResult.get()).descriptorString());

    MethodHandle unreflect = lookup.unreflect(declared);
    MethodHandle findClass = lookup.findVirtual(
        Class.class, "describeConstable", MethodType.methodType(Optional.class));
    MethodHandle findInterface = lookup.findVirtual(
        Constable.class, "describeConstable", MethodType.methodType(Optional.class));
    MethodType classHandleType = MethodType.methodType(Optional.class, Class.class);
    MethodType interfaceHandleType = MethodType.methodType(Optional.class, Constable.class);
    System.out.println("unreflect-type=" + unreflect.type());
    System.out.println("unreflect-type-exact=" + unreflect.type().equals(classHandleType));
    System.out.println("find-class-type=" + findClass.type());
    System.out.println("find-class-type-exact=" + findClass.type().equals(classHandleType));
    System.out.println("find-interface-type=" + findInterface.type());
    System.out.println("find-interface-type-exact=" +
        findInterface.type().equals(interfaceHandleType));

    Optional<?> unreflected =
        (Optional<?>) unreflect.invokeExact((Class<?>) String.class);
    Optional<?> foundClass =
        (Optional<?>) findClass.invokeExact((Class<?>) int.class);
    Constable handleReceiver = (Constable) int[][].class;
    Optional<?> foundInterface =
        (Optional<?>) findInterface.invokeExact(handleReceiver);
    System.out.println("unreflect-result=" + descriptor(unreflected));
    System.out.println("find-class-result=" + descriptor(foundClass));
    System.out.println("find-interface-result=" + descriptor(foundInterface));
  }

  private static int count(Method[] methods, String name) {
    int count = 0;
    for (Method method : methods) {
      if (method.getName().equals(name)) {
        count++;
      }
    }
    return count;
  }

  private static boolean containsInterface(Class<?>[] interfaces, Class<?> expected) {
    for (Class<?> type : interfaces) {
      if (type == expected) {
        return true;
      }
    }
    return false;
  }

  private static String interfaceNames(Class<?>[] interfaces) {
    String[] names = new String[interfaces.length];
    for (int i = 0; i < interfaces.length; i++) {
      names[i] = interfaces[i].getName();
    }
    return Arrays.toString(names);
  }

  private static boolean containsGenericInterface(Type[] interfaces, Class<?> expected) {
    for (Type type : interfaces) {
      if (type == expected) {
        return true;
      }
    }
    return false;
  }

  private static void print(
      String label, Class<?> type, Method method, MethodHandles.Lookup lookup)
      throws Exception {
    Optional<ClassDesc> direct = type.describeConstable();
    Optional<?> reflected = (Optional<?>) method.invoke(type);
    Optional<? extends ConstantDesc> dispatched =
        ((Constable) type).describeConstable();
    ClassDesc descriptor = direct.get();
    Class<?> resolved = (Class<?>) descriptor.resolveConstantDesc(lookup);
    System.out.println(label + "=" +
        descriptor.descriptorString() + ":" +
        descriptor(reflected) + ":" +
        ((ClassDesc) dispatched.get()).descriptorString() + ":" +
        direct.equals(reflected) + ":" +
        direct.equals(dispatched) + ":" +
        (resolved == type));
  }

  private static String descriptor(Optional<?> described) {
    return ((ClassDesc) described.get()).descriptorString();
  }
}
