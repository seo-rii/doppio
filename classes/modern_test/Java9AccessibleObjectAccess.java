package classes.modern_test;

import java.io.ByteArrayInputStream;
import java.io.FilterInputStream;
import java.lang.annotation.Annotation;
import java.lang.reflect.AccessibleObject;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;

public class Java9AccessibleObjectAccess {
  public int publicField;
  protected int protectedField;
  int packageField;
  private int privateField;
  public static int publicStaticField;
  private static int privateStaticField;

  public Java9AccessibleObjectAccess() {
  }

  private Java9AccessibleObjectAccess(int ignored) {
  }

  public void publicMethod() {
  }

  private void privateMethod() {
  }

  static class BareAccessibleObject extends AccessibleObject {
  }

  static class ProtectedStream extends FilterInputStream {
    ProtectedStream() {
      super(new ByteArrayInputStream(new byte[0]));
    }

    boolean canAccessInput(Object receiver) throws Exception {
      return FilterInputStream.class.getDeclaredField("in").canAccess(receiver);
    }
  }

  static class OtherProtectedStream extends FilterInputStream {
    OtherProtectedStream() {
      super(new ByteArrayInputStream(new byte[0]));
    }
  }

  public static void main(String[] args) throws Exception {
    Java9AccessibleObjectAccess instance = new Java9AccessibleObjectAccess();
    Field publicField = field("publicField");
    Field protectedField = field("protectedField");
    Field packageField = field("packageField");
    Field privateField = field("privateField");
    Field publicStaticField = field("publicStaticField");
    Field privateStaticField = field("privateStaticField");
    Method publicMethod = method("publicMethod");
    Method privateMethod = method("privateMethod");
    Constructor<Java9AccessibleObjectAccess> publicConstructor =
        Java9AccessibleObjectAccess.class.getDeclaredConstructor();
    Constructor<Java9AccessibleObjectAccess> privateConstructor =
        Java9AccessibleObjectAccess.class.getDeclaredConstructor(int.class);
    Method canAccessMethod = AccessibleObject.class.getDeclaredMethod(
        "canAccess", Object.class);

    printMetadata("can-access", canAccessMethod);
    printMetadata("try-set-accessible", AccessibleObject.class.getDeclaredMethod(
        "trySetAccessible"));
    System.out.println("inherited-declaring="
        + Method.class.getMethod("canAccess", Object.class).getDeclaringClass().getName());

    System.out.println("public-field-helper="
        + AccessibleObjectAccessCaller.canAccess(publicField, instance));
    System.out.println("protected-field-helper="
        + AccessibleObjectAccessCaller.canAccess(protectedField, instance));
    System.out.println("package-field-helper="
        + AccessibleObjectAccessCaller.canAccess(packageField, instance));
    System.out.println("private-field-self=" + privateField.canAccess(instance));
    System.out.println("private-field-helper="
        + AccessibleObjectAccessCaller.canAccess(privateField, instance));
    System.out.println("public-method-helper="
        + AccessibleObjectAccessCaller.canAccess(publicMethod, instance));
    System.out.println("private-method-self=" + privateMethod.canAccess(instance));
    System.out.println("private-method-helper="
        + AccessibleObjectAccessCaller.canAccess(privateMethod, instance));
    System.out.println("private-field-reflective-self="
        + canAccessMethod.invoke(privateField, instance));
    System.out.println("private-field-reflective-helper="
        + AccessibleObjectAccessCaller.invokeCanAccess(
            canAccessMethod, privateField, instance));
    System.out.println("public-static-helper="
        + AccessibleObjectAccessCaller.canAccess(publicStaticField, null));
    System.out.println("private-static-self=" + privateStaticField.canAccess(null));
    System.out.println("private-static-helper="
        + AccessibleObjectAccessCaller.canAccess(privateStaticField, null));
    System.out.println("public-constructor-helper="
        + AccessibleObjectAccessCaller.canAccess(publicConstructor, null));
    System.out.println("private-constructor-self=" + privateConstructor.canAccess(null));
    System.out.println("private-constructor-helper="
        + AccessibleObjectAccessCaller.canAccess(privateConstructor, null));

    ProtectedStream protectedStream = new ProtectedStream();
    System.out.println("cross-protected-self="
        + protectedStream.canAccessInput(protectedStream));
    System.out.println("cross-protected-peer="
        + protectedStream.canAccessInput(new ProtectedStream()));
    System.out.println("cross-protected-other="
        + protectedStream.canAccessInput(new OtherProtectedStream()));

    printFailure("instance-null", new Probe() {
      public void run() {
        publicField.canAccess(null);
      }
    });
    printFailure("instance-wrong-type", new Probe() {
      public void run() {
        publicField.canAccess(new Object());
      }
    });
    printFailure("static-non-null", new Probe() {
      public void run() {
        publicStaticField.canAccess(instance);
      }
    });
    printFailure("constructor-non-null", new Probe() {
      public void run() {
        publicConstructor.canAccess(instance);
      }
    });

    System.out.println("private-try-before=" + privateField.isAccessible());
    System.out.println("private-try-result="
        + AccessibleObjectAccessCaller.trySetAccessible(privateField));
    System.out.println("private-try-after=" + privateField.isAccessible());
    System.out.println("private-after-helper="
        + AccessibleObjectAccessCaller.canAccess(privateField, instance));
    System.out.println("private-try-again="
        + AccessibleObjectAccessCaller.trySetAccessible(privateField));
    privateField.setAccessible(false);
    System.out.println("private-reset-helper="
        + AccessibleObjectAccessCaller.canAccess(privateField, instance));

    privateField.setAccessible(true);
    printFailure("override-instance-null", new Probe() {
      public void run() {
        privateField.canAccess(null);
      }
    });
    publicStaticField.setAccessible(true);
    printFailure("override-static-non-null", new Probe() {
      public void run() {
        publicStaticField.canAccess(instance);
      }
    });

    BareAccessibleObject bare = new BareAccessibleObject();
    System.out.println("bare-before-null=" + bare.canAccess(null));
    System.out.println("bare-before-object=" + bare.canAccess(new Object()));
    System.out.println("bare-try=" + bare.trySetAccessible());
    System.out.println("bare-after-null=" + bare.canAccess(null));
    System.out.println("bare-after-object=" + bare.canAccess(new Object()));

    Constructor<?> classConstructor = Class.class.getDeclaredConstructors()[0];
    System.out.println("class-constructor-before=" + classConstructor.isAccessible());
    System.out.println("class-constructor-try=" + classConstructor.trySetAccessible());
    System.out.println("class-constructor-after=" + classConstructor.isAccessible());
  }

  private static Field field(String name) throws Exception {
    return Java9AccessibleObjectAccess.class.getDeclaredField(name);
  }

  private static Method method(String name) throws Exception {
    return Java9AccessibleObjectAccess.class.getDeclaredMethod(name);
  }

  private static void printMetadata(String label, Method method) {
    int modifiers = method.getModifiers();
    System.out.println(label + "-metadata="
        + method.getDeclaringClass().getName() + ":"
        + modifiers + ":"
        + Modifier.isPublic(modifiers) + ":"
        + Modifier.isFinal(modifiers) + ":"
        + Modifier.isNative(modifiers) + ":"
        + method.isSynthetic() + ":"
        + method.getReturnType().getName() + ":"
        + method.getParameterTypes().length + ":"
        + annotationNames(method.getDeclaredAnnotations()));
  }

  private static String annotationNames(Annotation[] annotations) {
    StringBuilder names = new StringBuilder("[");
    for (int i = 0; i < annotations.length; i++) {
      if (i != 0) {
        names.append(',');
      }
      names.append(annotations[i].annotationType().getSimpleName());
    }
    return names.append(']').toString();
  }

  private static void printFailure(String label, Probe probe) {
    try {
      probe.run();
      System.out.println(label + "=none");
    } catch (Throwable throwable) {
      System.out.println(label + "=" + throwable.getClass().getSimpleName());
    }
  }

  private interface Probe {
    void run();
  }
}

class AccessibleObjectAccessCaller {
  static boolean canAccess(AccessibleObject object, Object receiver) {
    return object.canAccess(receiver);
  }

  static boolean trySetAccessible(AccessibleObject object) {
    return object.trySetAccessible();
  }

  static boolean invokeCanAccess(
      Method canAccessMethod, AccessibleObject object, Object receiver)
      throws IllegalAccessException, InvocationTargetException {
    return ((Boolean) canAccessMethod.invoke(object, receiver)).booleanValue();
  }
}
