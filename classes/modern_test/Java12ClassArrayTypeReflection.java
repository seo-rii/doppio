package classes.modern_test;

import java.lang.annotation.Annotation;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.invoke.TypeDescriptor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.Type;
import java.lang.reflect.TypeVariable;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class Java12ClassArrayTypeReflection {
  private interface Marker {
  }

  private static final class User {
  }

  public static void main(String[] args) throws Throwable {
    List<Method> declaredMethods = namedMethods(Class.class.getDeclaredMethods(), "arrayType");
    List<Method> publicMethods = namedMethods(Class.class.getMethods(), "arrayType");
    System.out.println("declared-count=" + declaredMethods.size());
    System.out.println("public-count=" + publicMethods.size());
    System.out.println("declared-descriptors=" + descriptors(declaredMethods));
    System.out.println("public-descriptors=" + descriptors(publicMethods));

    Method primary = methodReturning(declaredMethods, Class.class);
    Method bridge = methodReturning(declaredMethods, TypeDescriptor.OfField.class);
    printMetadata("primary", primary);
    printMetadata("bridge", bridge);

    Method declaredLookup = Class.class.getDeclaredMethod("arrayType");
    Method publicLookup = Class.class.getMethod("arrayType");
    System.out.println("declared-lookup-descriptor=" + descriptor(declaredLookup));
    System.out.println("public-lookup-descriptor=" + descriptor(publicLookup));
    System.out.println("lookup-selects-primary=" +
        (declaredLookup.equals(primary) && publicLookup.equals(primary)));

    System.out.println("of-field-assignable=" +
        TypeDescriptor.OfField.class.isAssignableFrom(Class.class));
    System.out.println("class-is-of-field=" +
        TypeDescriptor.OfField.class.isInstance(String.class));

    Class<?>[] types = {
      Object.class,
      String.class,
      Marker.class,
      User.class,
      Integer.TYPE,
      Boolean.TYPE,
      String[].class,
      int[].class,
      String[][].class,
      int[][].class,
      User[].class,
      User[][].class
    };
    String[] labels = {
      "object",
      "string",
      "interface",
      "user",
      "int",
      "boolean",
      "reference-array",
      "primitive-array",
      "reference-multidimensional",
      "primitive-multidimensional",
      "user-array",
      "user-multidimensional"
    };
    for (int i = 0; i < types.length; i++) {
      printBehavior(labels[i], types[i], primary, bridge);
    }

    printFailure("void-direct", new ThrowingAction() {
      public void run() {
        void.class.arrayType();
      }
    });
    printReflectiveFailure("void-primary-reflect", primary);
    printReflectiveFailure("void-bridge-reflect", bridge);

    TypeDescriptor.OfField<?> interfaceReceiver = String.class;
    TypeDescriptor.OfField<?> interfaceResult = interfaceReceiver.arrayType();
    System.out.println("interface-dispatch-result=" +
        ((Class<?>) interfaceResult).getName());
    System.out.println("interface-dispatch-exact=" +
        (interfaceResult == String[].class));

    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandle unreflectPrimary = lookup.unreflect(primary);
    MethodHandle unreflectBridge = lookup.unreflect(bridge);
    MethodType primaryType = MethodType.methodType(Class.class, Class.class);
    MethodType bridgeType = MethodType.methodType(
        TypeDescriptor.OfField.class, Class.class);
    printHandle("unreflect-primary", unreflectPrimary, primaryType);
    printHandle("unreflect-bridge", unreflectBridge, bridgeType);

    Class<?> unreflectPrimaryReceiver = String.class;
    Class<?> unreflectPrimaryResult =
        (Class<?>) unreflectPrimary.invokeExact(unreflectPrimaryReceiver);
    Class<?> unreflectBridgeReceiver = int[].class;
    TypeDescriptor.OfField<?> unreflectBridgeResult =
        (TypeDescriptor.OfField<?>) unreflectBridge.invokeExact(unreflectBridgeReceiver);
    System.out.println("unreflect-primary-result=" + unreflectPrimaryResult.getName());
    System.out.println("unreflect-bridge-result=" +
        ((Class<?>) unreflectBridgeResult).getName());

    MethodHandle findPrimary = lookup.findVirtual(
        Class.class, "arrayType", MethodType.methodType(Class.class));
    MethodHandle findBridge = lookup.findVirtual(
        Class.class, "arrayType", MethodType.methodType(TypeDescriptor.OfField.class));
    printHandle("find-primary", findPrimary, primaryType);
    printHandle("find-bridge", findBridge, bridgeType);

    Class<?> findPrimaryReceiver = User[][].class;
    Class<?> findPrimaryResult =
        (Class<?>) findPrimary.invokeExact(findPrimaryReceiver);
    Class<?> findBridgeReceiver = int.class;
    TypeDescriptor.OfField<?> findBridgeResult =
        (TypeDescriptor.OfField<?>) findBridge.invokeExact(findBridgeReceiver);
    System.out.println("find-primary-result=" + findPrimaryResult.getName());
    System.out.println("find-bridge-result=" + ((Class<?>) findBridgeResult).getName());

    MethodHandle findInterface = lookup.findVirtual(
        TypeDescriptor.OfField.class,
        "arrayType",
        MethodType.methodType(TypeDescriptor.OfField.class));
    MethodType interfaceHandleType = MethodType.methodType(
        TypeDescriptor.OfField.class, TypeDescriptor.OfField.class);
    printHandle("find-interface", findInterface, interfaceHandleType);
    TypeDescriptor.OfField<?> handleInterfaceReceiver = String[].class;
    TypeDescriptor.OfField<?> handleInterfaceResult =
        (TypeDescriptor.OfField<?>) findInterface.invokeExact(handleInterfaceReceiver);
    System.out.println("find-interface-result=" +
        ((Class<?>) handleInterfaceResult).getName());

    printFailure("void-unreflect-primary", new ThrowingAction() {
      public void run() throws Throwable {
        Class<?> receiver = void.class;
        Class<?> ignored = (Class<?>) unreflectPrimary.invokeExact(receiver);
        System.out.println(ignored);
      }
    });
    printFailure("void-find-bridge", new ThrowingAction() {
      public void run() throws Throwable {
        Class<?> receiver = void.class;
        TypeDescriptor.OfField<?> ignored =
            (TypeDescriptor.OfField<?>) findBridge.invokeExact(receiver);
        System.out.println(ignored);
      }
    });
  }

  private static List<Method> namedMethods(Method[] methods, String name) {
    List<Method> matches = new ArrayList<Method>();
    for (Method method : methods) {
      if (method.getName().equals(name)) {
        matches.add(method);
      }
    }
    Collections.sort(matches, new Comparator<Method>() {
      public int compare(Method left, Method right) {
        return descriptor(left).compareTo(descriptor(right));
      }
    });
    return matches;
  }

  private static Method methodReturning(List<Method> methods, Class<?> returnType) {
    for (Method method : methods) {
      if (method.getReturnType() == returnType) {
        return method;
      }
    }
    throw new AssertionError("missing arrayType method returning " + returnType.getName());
  }

  private static String descriptors(List<Method> methods) {
    String[] values = new String[methods.size()];
    for (int i = 0; i < methods.size(); i++) {
      values[i] = descriptor(methods.get(i));
    }
    return Arrays.toString(values);
  }

  private static String descriptor(Method method) {
    return MethodType.methodType(method.getReturnType(), method.getParameterTypes())
        .toMethodDescriptorString();
  }

  private static void printMetadata(String label, Method method) {
    Type[] genericParameterTypes = method.getGenericParameterTypes();
    String[] genericParameterNames = new String[genericParameterTypes.length];
    for (int i = 0; i < genericParameterTypes.length; i++) {
      genericParameterNames[i] = genericParameterTypes[i].getTypeName();
    }
    Type[] genericExceptionTypes = method.getGenericExceptionTypes();
    String[] genericExceptionNames = new String[genericExceptionTypes.length];
    for (int i = 0; i < genericExceptionTypes.length; i++) {
      genericExceptionNames[i] = genericExceptionTypes[i].getTypeName();
    }
    TypeVariable<Method>[] typeParameters = method.getTypeParameters();
    String[] typeParameterNames = new String[typeParameters.length];
    for (int i = 0; i < typeParameters.length; i++) {
      typeParameterNames[i] = typeParameters[i].getTypeName();
    }
    Annotation[] annotations = method.getAnnotations();
    Annotation[] declaredAnnotations = method.getDeclaredAnnotations();

    System.out.println(label + "-descriptor=" + descriptor(method));
    System.out.println(label + "-declaring-class=" + method.getDeclaringClass().getName());
    System.out.println(label + "-return-type=" + method.getReturnType().getTypeName());
    System.out.println(label + "-generic-return-type=" +
        method.getGenericReturnType().getTypeName());
    System.out.println(label + "-modifiers=" + method.getModifiers() + ":0x" +
        Integer.toHexString(method.getModifiers()));
    System.out.println(label + "-flags=public:" +
        Modifier.isPublic(method.getModifiers()) +
        ",native:" + Modifier.isNative(method.getModifiers()) +
        ",final:" + Modifier.isFinal(method.getModifiers()) +
        ",abstract:" + Modifier.isAbstract(method.getModifiers()) +
        ",bridge:" + method.isBridge() +
        ",synthetic:" + method.isSynthetic() +
        ",varargs:" + method.isVarArgs() +
        ",default:" + method.isDefault());
    System.out.println(label + "-parameter-count=" + method.getParameterCount());
    System.out.println(label + "-parameter-types=" +
        Arrays.toString(method.getParameterTypes()));
    System.out.println(label + "-generic-parameter-types=" +
        Arrays.toString(genericParameterNames));
    System.out.println(label + "-parameters=" + Arrays.toString(method.getParameters()));
    System.out.println(label + "-parameter-annotations=" +
        Arrays.deepToString(method.getParameterAnnotations()));
    System.out.println(label + "-type-parameters=" +
        Arrays.toString(typeParameterNames));
    System.out.println(label + "-exception-types=" +
        Arrays.toString(method.getExceptionTypes()));
    System.out.println(label + "-generic-exception-types=" +
        Arrays.toString(genericExceptionNames));
    System.out.println(label + "-annotations=declared:" + declaredAnnotations.length +
        ",all:" + annotations.length +
        ",return:" + method.getAnnotatedReturnType().getAnnotations().length);
    System.out.println(label + "-annotated-return-type=" +
        method.getAnnotatedReturnType().getType().getTypeName());
    System.out.println(label + "-annotation-default=" + method.getDefaultValue());
  }

  private static void printBehavior(
      String label, Class<?> type, Method primary, Method bridge) throws Exception {
    Class<?> direct = type.arrayType();
    Class<?> reflectedPrimary = (Class<?>) primary.invoke(type);
    TypeDescriptor.OfField<?> reflectedBridge =
        (TypeDescriptor.OfField<?>) bridge.invoke(type);
    Class<?> bridgeClass = (Class<?>) reflectedBridge;
    System.out.println(label + "=" + type.getName() +
        "->direct:" + direct.getName() +
        ",primary:" + reflectedPrimary.getName() +
        ",bridge:" + bridgeClass.getName() +
        ",same:" + (direct == reflectedPrimary && direct == bridgeClass));
  }

  private static void printHandle(
      String label, MethodHandle handle, MethodType expectedType) {
    System.out.println(label + "-type=" + handle.type());
    System.out.println(label + "-descriptor=" +
        handle.type().toMethodDescriptorString());
    System.out.println(label + "-type-exact=" + handle.type().equals(expectedType));
  }

  private static void printReflectiveFailure(String label, Method method) {
    try {
      method.invoke(void.class);
      System.out.println(label + "=ok");
    } catch (InvocationTargetException e) {
      printThrowable(label, e.getCause());
    } catch (Throwable t) {
      printThrowable(label, t);
    }
  }

  private static void printFailure(String label, ThrowingAction action) {
    try {
      action.run();
      System.out.println(label + "=ok");
    } catch (Throwable t) {
      printThrowable(label, t);
    }
  }

  private static void printThrowable(String label, Throwable throwable) {
    System.out.println(label + "=" + throwable.getClass().getName() + ":" +
        String.valueOf(throwable.getMessage()));
  }

  private interface ThrowingAction {
    void run() throws Throwable;
  }
}
