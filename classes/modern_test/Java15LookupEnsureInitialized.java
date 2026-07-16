package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.Parameter;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.WildcardType;
import java.util.Arrays;

public class Java15LookupEnsureInitialized {
  public static void main(String[] args) throws Throwable {
    Method ensureInitialized = MethodHandles.Lookup.class.getDeclaredMethod(
        "ensureInitialized", Class.class);
    Parameter parameter = ensureInitialized.getParameters()[0];
    ParameterizedType returnType =
        (ParameterizedType) ensureInitialized.getGenericReturnType();
    WildcardType returnArgument = (WildcardType) returnType.getActualTypeArguments()[0];
    ParameterizedType parameterType =
        (ParameterizedType) ensureInitialized.getGenericParameterTypes()[0];
    WildcardType parameterArgument =
        (WildcardType) parameterType.getActualTypeArguments()[0];
    boolean metadataExact = ensureInitialized.getModifiers() == Modifier.PUBLIC &&
        ensureInitialized.getReturnType() == Class.class &&
        ensureInitialized.getParameterTypes()[0] == Class.class &&
        ensureInitialized.getExceptionTypes().length == 1 &&
        ensureInitialized.getExceptionTypes()[0] == IllegalAccessException.class &&
        returnType.getRawType() == Class.class &&
        returnArgument.getUpperBounds().length == 1 &&
        returnArgument.getUpperBounds()[0] == Object.class &&
        returnArgument.getLowerBounds().length == 0 &&
        parameterType.getRawType() == Class.class &&
        parameterArgument.getUpperBounds().length == 1 &&
        parameterArgument.getUpperBounds()[0] == Object.class &&
        parameterArgument.getLowerBounds().length == 0 &&
        !Modifier.isAbstract(ensureInitialized.getModifiers()) &&
        !Modifier.isFinal(ensureInitialized.getModifiers()) &&
        !Modifier.isNative(ensureInitialized.getModifiers()) &&
        !Modifier.isStatic(ensureInitialized.getModifiers()) &&
        !ensureInitialized.isBridge() &&
        !ensureInitialized.isDefault() &&
        !ensureInitialized.isSynthetic() &&
        !ensureInitialized.isVarArgs() &&
        ensureInitialized.getDeclaredAnnotations().length == 0 &&
        ensureInitialized.getAnnotatedReturnType().getAnnotations().length == 0 &&
        ensureInitialized.getAnnotatedParameterTypes()[0].getAnnotations().length == 0 &&
        ensureInitialized.getAnnotatedExceptionTypes()[0].getAnnotations().length == 0 &&
        parameter.getName().equals("arg0") &&
        !parameter.isNamePresent() &&
        parameter.getModifiers() == 0;
    System.out.println("metadata:" + metadataExact);

    MethodHandles.Lookup lookup = MethodHandles.lookup();
    try {
      lookup.ensureInitialized(null);
      System.out.println("null:missing");
    } catch (Throwable t) {
      System.out.println("null:" + t.getClass().getName());
    }
    try {
      lookup.ensureInitialized(int.class);
      System.out.println("primitive:missing");
    } catch (Throwable t) {
      System.out.println("primitive:" + t.getClass().getName());
    }
    try {
      lookup.ensureInitialized(void.class);
      System.out.println("void:missing");
    } catch (Throwable t) {
      System.out.println("void:" + t.getClass().getName());
    }
    boolean arraysRejected = true;
    for (Class<?> arrayType : new Class<?>[] {int[].class, String[].class, String[][].class}) {
      try {
        lookup.ensureInitialized(arrayType);
        arraysRejected = false;
      } catch (IllegalArgumentException expected) {
        // Arrays are rejected before class access or initialization.
      } catch (Throwable unexpected) {
        arraysRejected = false;
      }
    }
    System.out.println("arrays:" + arraysRejected);

    ClassLoader loader = Java15LookupEnsureInitialized.class.getClassLoader();
    String inaccessibleName =
        "classes.modern_test.lookup_init.Java15LookupEnsureInitializedTarget$PackageTarget";
    System.clearProperty("doppio.lookup.ensure.inaccessible");
    Class<?> inaccessible = Class.forName(inaccessibleName, false, loader);
    try {
      lookup.ensureInitialized(inaccessible);
      System.out.println("inaccessible:missing");
    } catch (Throwable t) {
      System.out.println("inaccessible:" + t.getClass().getName() + ":" +
          (System.getProperty("doppio.lookup.ensure.inaccessible") == null));
    }
    Class<?> inaccessibleArray = Class.forName("[L" + inaccessibleName + ";", false, loader);
    try {
      lookup.ensureInitialized(inaccessibleArray);
      System.out.println("inaccessible-array:missing");
    } catch (Throwable t) {
      System.out.println("inaccessible-array:" + t.getClass().getName() + ":" +
          (System.getProperty("doppio.lookup.ensure.inaccessible") == null));
    }

    System.clearProperty("doppio.lookup.ensure.success");
    Class<?> success = Class.forName(
        "classes.modern_test.Java15LookupEnsureInitializedSuccess", false, loader);
    System.out.println("success-before:" +
        (System.getProperty("doppio.lookup.ensure.success") == null));
    System.out.println("success-identity:" + (lookup.ensureInitialized(success) == success) + ":" +
        System.getProperty("doppio.lookup.ensure.success"));
    System.out.println("success-repeat:" + (lookup.ensureInitialized(success) == success) + ":" +
        System.getProperty("doppio.lookup.ensure.success"));

    System.clearProperty("doppio.lookup.ensure.order");
    Class<?> child = Class.forName(
        "classes.modern_test.Java15LookupEnsureInitializedChild", false, loader);
    lookup.ensureInitialized(child);
    System.out.println("class-order:" + System.getProperty("doppio.lookup.ensure.order"));

    System.clearProperty("doppio.lookup.ensure.interface");
    Class<?> directInterface = Class.forName(
        "classes.modern_test.Java15LookupEnsureInitializedInterface", false, loader);
    lookup.ensureInitialized(directInterface);
    System.out.println("interface:" + System.getProperty("doppio.lookup.ensure.interface"));

    System.clearProperty("doppio.lookup.ensure.reflect");
    Class<?> reflectTarget = Class.forName(
        "classes.modern_test.Java15LookupEnsureInitializedReflect", false, loader);
    Class<?> reflected = (Class<?>) ensureInitialized.invoke(lookup, reflectTarget);
    System.out.println("reflect:" + (reflected == reflectTarget) + ":" +
        System.getProperty("doppio.lookup.ensure.reflect"));

    System.clearProperty("doppio.lookup.ensure.unreflect");
    Class<?> unreflectTarget = Class.forName(
        "classes.modern_test.Java15LookupEnsureInitializedUnreflect", false, loader);
    MethodHandle handle = lookup.unreflect(ensureInitialized);
    Class<?> unreflected = (Class<?>) handle.invokeExact(lookup, unreflectTarget);
    System.out.println("unreflect:" + (unreflected == unreflectTarget) + ":" +
        System.getProperty("doppio.lookup.ensure.unreflect") + ":" +
        handle.type().toMethodDescriptorString());

    System.clearProperty("doppio.lookup.ensure.failure");
    Class<?> failure = Class.forName(
        "classes.modern_test.Java15LookupEnsureInitializedFailure", false, loader);
    try {
      lookup.ensureInitialized(failure);
      System.out.println("failure-first:missing");
    } catch (Throwable t) {
      System.out.println("failure-first:" + t.getClass().getName() + ":" +
          System.getProperty("doppio.lookup.ensure.failure"));
    }
    try {
      lookup.ensureInitialized(failure);
      System.out.println("failure-second:missing");
    } catch (Throwable t) {
      System.out.println("failure-second:" + t.getClass().getName() + ":" +
          System.getProperty("doppio.lookup.ensure.failure"));
    }
    try {
      int ignored = Java15LookupEnsureInitializedFailure.VALUE;
      System.out.println("failure-bytecode:missing:" + ignored);
    } catch (Throwable t) {
      System.out.println("failure-bytecode:" + t.getClass().getName() + ":" +
          System.getProperty("doppio.lookup.ensure.failure"));
    }
    try {
      Class.forName(failure.getName(), true, loader);
      System.out.println("failure-for-name:missing");
    } catch (Throwable t) {
      System.out.println("failure-for-name:" + t.getClass().getName() + ":" +
          System.getProperty("doppio.lookup.ensure.failure"));
    }

    System.clearProperty("doppio.lookup.ensure.error");
    Class<?> errorFailure = Class.forName(
        "classes.modern_test.Java15LookupEnsureInitializedErrorFailure", false, loader);
    try {
      lookup.ensureInitialized(errorFailure);
      System.out.println("error-first:missing");
    } catch (Throwable t) {
      System.out.println("error-first:" + t.getClass().getName() + ":" +
          System.getProperty("doppio.lookup.ensure.error"));
    }
    try {
      lookup.ensureInitialized(errorFailure);
      System.out.println("error-second:missing");
    } catch (Throwable t) {
      System.out.println("error-second:" + t.getClass().getName() + ":" +
          System.getProperty("doppio.lookup.ensure.error"));
    }

    System.clearProperty("doppio.lookup.ensure.parent-failure");
    Class<?> failingParent = Class.forName(
        "classes.modern_test.Java15LookupEnsureInitializedFailingParent", false, loader);
    Class<?> failingChild = Class.forName(
        "classes.modern_test.Java15LookupEnsureInitializedFailingChild", false, loader);
    try {
      lookup.ensureInitialized(failingChild);
      System.out.println("parent-failure-first:missing");
    } catch (Throwable t) {
      System.out.println("parent-failure-first:" + t.getClass().getName() + ":" +
          System.getProperty("doppio.lookup.ensure.parent-failure"));
    }
    try {
      lookup.ensureInitialized(failingChild);
      System.out.println("parent-failure-child-second:missing");
    } catch (Throwable t) {
      System.out.println("parent-failure-child-second:" + t.getClass().getName());
    }
    try {
      lookup.ensureInitialized(failingParent);
      System.out.println("parent-failure-parent-second:missing");
    } catch (Throwable t) {
      System.out.println("parent-failure-parent-second:" + t.getClass().getName());
    }

    System.clearProperty("doppio.lookup.ensure.concurrent");
    Class<?> concurrentFailure = Class.forName(
        "classes.modern_test.Java15LookupEnsureInitializedConcurrentFailure", false, loader);
    String[] concurrentResults = new String[2];
    Thread first = new Thread(new Runnable() {
      public void run() {
        try {
          lookup.ensureInitialized(concurrentFailure);
          concurrentResults[0] = "missing";
        } catch (Throwable t) {
          concurrentResults[0] = t.getClass().getName();
        }
      }
    });
    Thread second = new Thread(new Runnable() {
      public void run() {
        try {
          lookup.ensureInitialized(concurrentFailure);
          concurrentResults[1] = "missing";
        } catch (Throwable t) {
          concurrentResults[1] = t.getClass().getName();
        }
      }
    });
    first.start();
    second.start();
    first.join();
    second.join();
    Arrays.sort(concurrentResults);
    System.out.println("concurrent:" + concurrentResults[0] + ":" + concurrentResults[1] + ":" +
        System.getProperty("doppio.lookup.ensure.concurrent"));
  }
}

class Java15LookupEnsureInitializedSuccess {
  static {
    String value = System.getProperty("doppio.lookup.ensure.success");
    System.setProperty("doppio.lookup.ensure.success", value == null ? "1" : "duplicate");
  }
}

class Java15LookupEnsureInitializedParent {
  static {
    System.setProperty("doppio.lookup.ensure.order", "parent");
  }
}

class Java15LookupEnsureInitializedChild extends Java15LookupEnsureInitializedParent {
  static {
    System.setProperty(
        "doppio.lookup.ensure.order",
        System.getProperty("doppio.lookup.ensure.order") + ":child");
  }
}

interface Java15LookupEnsureInitializedInterface {
  String MARK = Java15LookupEnsureInitializedInterfaceMarker.initialize();
}

class Java15LookupEnsureInitializedInterfaceMarker {
  static String initialize() {
    System.setProperty("doppio.lookup.ensure.interface", "initialized");
    return "initialized";
  }
}

class Java15LookupEnsureInitializedReflect {
  static {
    System.setProperty("doppio.lookup.ensure.reflect", "initialized");
  }
}

class Java15LookupEnsureInitializedUnreflect {
  static {
    System.setProperty("doppio.lookup.ensure.unreflect", "initialized");
  }
}

class Java15LookupEnsureInitializedFailure {
  static int VALUE = fail();

  static int fail() {
    String value = System.getProperty("doppio.lookup.ensure.failure");
    System.setProperty("doppio.lookup.ensure.failure", value == null ? "1" : "duplicate");
    throw new RuntimeException("expected");
  }
}

class Java15LookupEnsureInitializedErrorFailure {
  static int VALUE = fail();

  static int fail() {
    String value = System.getProperty("doppio.lookup.ensure.error");
    System.setProperty("doppio.lookup.ensure.error", value == null ? "1" : "duplicate");
    throw new AssertionError("expected");
  }
}

class Java15LookupEnsureInitializedFailingParent {
  static int VALUE = fail();

  static int fail() {
    String value = System.getProperty("doppio.lookup.ensure.parent-failure");
    System.setProperty(
        "doppio.lookup.ensure.parent-failure", value == null ? "1" : "duplicate");
    throw new RuntimeException("expected");
  }
}

class Java15LookupEnsureInitializedFailingChild
    extends Java15LookupEnsureInitializedFailingParent {}

class Java15LookupEnsureInitializedConcurrentFailure {
  static int VALUE = fail();

  static int fail() {
    String value = System.getProperty("doppio.lookup.ensure.concurrent");
    System.setProperty("doppio.lookup.ensure.concurrent", value == null ? "1" : "duplicate");
    try {
      Thread.sleep(100);
    } catch (InterruptedException e) {
      throw new RuntimeException(e);
    }
    throw new RuntimeException("expected");
  }
}
