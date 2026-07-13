package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.invoke.TypeDescriptor;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

public class Java12ClassComponentTypeReflection {
  private interface Marker {
  }

  private enum Choice {
    VALUE
  }

  private @interface Tag {
  }

  public static void main(String[] args) throws Throwable {
    List<Method> declared = namedMethods(Class.class.getDeclaredMethods(), "componentType");
    List<Method> publicMethods = namedMethods(Class.class.getMethods(), "componentType");
    Method primary = methodReturning(declared, Class.class);
    Method bridge = methodReturning(declared, TypeDescriptor.OfField.class);
    Method declaredLookup = Class.class.getDeclaredMethod("componentType");
    Method publicLookup = Class.class.getMethod("componentType");

    System.out.println("declared-count=" + declared.size());
    System.out.println("public-count=" + publicMethods.size());
    System.out.println("declared-returns=" + returnTypes(declared));
    System.out.println("public-returns=" + returnTypes(publicMethods));
    System.out.println("declared-lookup-primary=" + declaredLookup.equals(primary));
    System.out.println("public-lookup-primary=" + publicLookup.equals(primary));
    System.out.println("of-field-assignable=" +
        TypeDescriptor.OfField.class.isAssignableFrom(Class.class));
    System.out.println("class-is-of-field=" + TypeDescriptor.OfField.class.isInstance(String.class));
    System.out.println("raw-of-field-interface=" + containsInterface(
        Class.class.getInterfaces(), TypeDescriptor.OfField.class));
    System.out.println("generic-of-field-arguments=" + genericInterfaceArguments(
        Class.class.getGenericInterfaces(), TypeDescriptor.OfField.class));

    printMetadata("primary", primary);
    printMetadata("bridge", bridge);

    Class<?>[] types = {
      Object.class,
      String.class,
      Marker.class,
      Choice.class,
      Tag.class,
      int.class,
      void.class,
      Object[].class,
      String[].class,
      int[].class,
      boolean[].class,
      String[][].class,
      int[][].class,
      Java12ClassComponentTypeReflection[].class
    };
    String[] labels = {
      "object",
      "string",
      "interface",
      "enum",
      "annotation",
      "primitive",
      "void",
      "object-array",
      "string-array",
      "int-array",
      "boolean-array",
      "string-matrix",
      "int-matrix",
      "user-array"
    };
    for (int i = 0; i < types.length; i++) {
      Class<?> direct = types[i].componentType();
      Class<?> primaryResult = (Class<?>) primary.invoke(types[i]);
      Class<?> bridgeResult = (Class<?>) bridge.invoke(types[i]);
      System.out.println(labels[i] + "=" + descriptor(direct) + ":" +
          descriptor(primaryResult) + ":" + descriptor(bridgeResult) + ":" +
          (direct == types[i].getComponentType()));
    }

    TypeDescriptor.OfField<?> arrayField = String[][].class;
    TypeDescriptor.OfField<?> plainField = String.class;
    System.out.println("interface-array=" + descriptor((Class<?>) arrayField.componentType()));
    System.out.println("interface-plain=" + (plainField.componentType() == null));

    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandle primaryHandle = lookup.unreflect(primary);
    MethodHandle bridgeHandle = lookup.unreflect(bridge);
    MethodHandle primaryVirtual = lookup.findVirtual(
        Class.class, "componentType", MethodType.methodType(Class.class));
    MethodHandle bridgeVirtual = lookup.findVirtual(
        Class.class, "componentType", MethodType.methodType(TypeDescriptor.OfField.class));
    System.out.println("primary-handle-type=" + primaryHandle.type());
    System.out.println("bridge-handle-type=" + bridgeHandle.type());
    System.out.println("primary-virtual-type=" + primaryVirtual.type());
    System.out.println("bridge-virtual-type=" + bridgeVirtual.type());
    System.out.println("primary-handle-exact=" + primaryHandle.type().equals(
        MethodType.methodType(Class.class, Class.class)));
    System.out.println("bridge-handle-exact=" + bridgeHandle.type().equals(
        MethodType.methodType(TypeDescriptor.OfField.class, Class.class)));

    Class<?> primaryArray = (Class<?>) primaryHandle.invokeExact((Class<?>) String[][].class);
    Class<?> primaryPlain = (Class<?>) primaryVirtual.invokeExact((Class<?>) String.class);
    TypeDescriptor.OfField<?> bridgeArray =
        (TypeDescriptor.OfField<?>) bridgeHandle.invokeExact((Class<?>) int[][].class);
    TypeDescriptor.OfField<?> bridgePlain =
        (TypeDescriptor.OfField<?>) bridgeVirtual.invokeExact((Class<?>) int.class);
    System.out.println("primary-handle-array=" + descriptor(primaryArray));
    System.out.println("primary-virtual-plain=" + (primaryPlain == null));
    System.out.println("bridge-handle-array=" + descriptor((Class<?>) bridgeArray));
    System.out.println("bridge-virtual-plain=" + (bridgePlain == null));
  }

  private static List<Method> namedMethods(Method[] methods, String name) {
    List<Method> selected = new ArrayList<>();
    for (Method method : methods) {
      if (method.getName().equals(name)) {
        selected.add(method);
      }
    }
    selected.sort(Comparator.comparing(method -> method.getReturnType().getName()));
    return selected;
  }

  private static Method methodReturning(List<Method> methods, Class<?> returnType) {
    for (Method method : methods) {
      if (method.getReturnType() == returnType) {
        return method;
      }
    }
    throw new AssertionError("missing return type " + returnType.getName());
  }

  private static String returnTypes(List<Method> methods) {
    List<String> names = new ArrayList<>();
    for (Method method : methods) {
      names.add(method.getReturnType().getName());
    }
    return names.toString();
  }

  private static void printMetadata(String label, Method method) {
    MethodType descriptor = MethodType.methodType(
        method.getReturnType(), method.getParameterTypes());
    System.out.println(label + "-descriptor=" + descriptor.toMethodDescriptorString());
    System.out.println(label + "-modifiers=" + method.getModifiers());
    System.out.println(label + "-public=" + Modifier.isPublic(method.getModifiers()));
    System.out.println(label + "-native=" + Modifier.isNative(method.getModifiers()));
    System.out.println(label + "-synthetic=" + method.isSynthetic());
    System.out.println(label + "-bridge=" + method.isBridge());
    System.out.println(label + "-varargs=" + method.isVarArgs());
    System.out.println(label + "-default=" + method.isDefault());
    System.out.println(label + "-return=" + method.getReturnType().getTypeName());
    System.out.println(label + "-generic-return=" + method.getGenericReturnType().getTypeName());
    System.out.println(label + "-parameters=" + Arrays.toString(method.getParameterTypes()));
    System.out.println(label + "-generic-parameters=" +
        Arrays.toString(method.getGenericParameterTypes()));
    System.out.println(label + "-type-parameters=" + Arrays.toString(method.getTypeParameters()));
    System.out.println(label + "-exceptions=" + Arrays.toString(method.getExceptionTypes()));
    System.out.println(label + "-generic-exceptions=" +
        Arrays.toString(method.getGenericExceptionTypes()));
    System.out.println(label + "-annotations=" + Arrays.toString(method.getAnnotations()));
    System.out.println(label + "-declared-annotations=" +
        Arrays.toString(method.getDeclaredAnnotations()));
    System.out.println(label + "-parameter-annotations=" +
        method.getParameterAnnotations().length);
    System.out.println(label + "-annotated-return=" +
        method.getAnnotatedReturnType().getType().getTypeName());
  }

  private static String descriptor(Class<?> type) {
    return type == null ? "null" : type.descriptorString();
  }

  private static boolean containsInterface(Class<?>[] interfaces, Class<?> expected) {
    for (Class<?> type : interfaces) {
      if (type == expected) {
        return true;
      }
    }
    return false;
  }

  private static String genericInterfaceArguments(Type[] interfaces, Class<?> expected) {
    for (Type type : interfaces) {
      if (type instanceof ParameterizedType) {
        ParameterizedType parameterized = (ParameterizedType) type;
        if (parameterized.getRawType() == expected) {
          return Arrays.toString(parameterized.getActualTypeArguments());
        }
      }
    }
    return "missing";
  }
}
