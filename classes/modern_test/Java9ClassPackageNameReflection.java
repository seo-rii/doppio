package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.Map;

public class Java9ClassPackageNameReflection {
  private static final class Nested {
  }

  public static void main(String[] args) throws Throwable {
    class Local {
    }

    Runnable anonymous = new Runnable() {
      public void run() {
      }
    };

    Method declared = Class.class.getDeclaredMethod("getPackageName");
    Method publicMethod = Class.class.getMethod("getPackageName");

    System.out.println("declared-public-equal=" + declared.equals(publicMethod));
    System.out.println("declared-count=" + count(Class.class.getDeclaredMethods(), "getPackageName"));
    System.out.println("public-count=" + count(Class.class.getMethods(), "getPackageName"));
    System.out.println("modifiers=" + declared.getModifiers() + ":" + Modifier.toString(declared.getModifiers()));
    System.out.println("native=" + Modifier.isNative(declared.getModifiers()));
    System.out.println("synthetic=" + declared.isSynthetic());
    System.out.println("bridge=" + declared.isBridge());
    System.out.println("varargs=" + declared.isVarArgs());
    System.out.println("default=" + declared.isDefault());
    System.out.println("return-type=" + declared.getReturnType().getTypeName());
    System.out.println("generic-return-type=" + declared.getGenericReturnType().getTypeName());
    System.out.println("parameter-types=" + typeNames(declared.getParameterTypes()));
    System.out.println("generic-parameter-types=" + Arrays.toString(declared.getGenericParameterTypes()));
    System.out.println("type-parameters=" + Arrays.toString(declared.getTypeParameters()));
    System.out.println("exception-types=" + typeNames(declared.getExceptionTypes()));
    System.out.println("generic-exception-types=" + Arrays.toString(declared.getGenericExceptionTypes()));
    System.out.println("annotations=" + Arrays.toString(declared.getAnnotations()));
    System.out.println("declared-annotations=" + Arrays.toString(declared.getDeclaredAnnotations()));
    System.out.println("annotated-return-type=" + declared.getAnnotatedReturnType().getType().getTypeName());
    System.out.println("annotated-return-annotations=" +
        Arrays.toString(declared.getAnnotatedReturnType().getAnnotations()));
    System.out.println("parameters=" + Arrays.toString(declared.getParameters()));

    print("ordinary", Java9ClassPackageNameReflection.class, declared);
    print("nested", Nested.class, declared);
    print("local", Local.class, declared);
    print("anonymous", anonymous.getClass(), declared);
    print("jdk", String.class, declared);
    print("jdk-nested", Map.Entry.class, declared);
    print("primitive", int.class, declared);
    print("void", void.class, declared);
    print("reference-array", String[][].class, declared);
    print("primitive-array", int[][].class, declared);
    print("user-array", Java9ClassPackageNameReflection[].class, declared);

    MethodHandle handle = MethodHandles.lookup().unreflect(declared);
    System.out.println("handle-type=" + handle.type());
    System.out.println("handle-type-exact=" +
        handle.type().equals(MethodType.methodType(String.class, Class.class)));
    String handledOrdinary = (String) handle.invokeExact((Class<?>) Java9ClassPackageNameReflection.class);
    String handledPrimitive = (String) handle.invokeExact((Class<?>) int.class);
    String handledArray = (String) handle.invokeExact((Class<?>) String[][].class);
    System.out.println("handle-ordinary=" + handledOrdinary);
    System.out.println("handle-primitive=" + handledPrimitive);
    System.out.println("handle-array=" + handledArray);
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

  private static String typeNames(Class<?>[] types) {
    String[] names = new String[types.length];
    for (int i = 0; i < types.length; i++) {
      names[i] = types[i].getTypeName();
    }
    return Arrays.toString(names);
  }

  private static void print(String label, Class<?> type, Method method) throws Exception {
    System.out.println(label + "-direct=" + type.getPackageName());
    System.out.println(label + "-reflect=" + method.invoke(type));
  }
}
