package classes.modern_test;

import java.lang.invoke.MethodHandles;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;

public class Java17MethodHandlesLookupModes {
  private static final class Nested {}

  private static void printMetadata() throws Exception {
    String[] fieldNames = {"MODULE", "UNCONDITIONAL", "ORIGINAL"};
    int[] fieldValues = {16, 32, 64};
    boolean fieldsExact = true;
    for (int i = 0; i < fieldNames.length; i++) {
      Field field = MethodHandles.Lookup.class.getDeclaredField(fieldNames[i]);
      fieldsExact &= field.getModifiers() ==
          (Modifier.PUBLIC | Modifier.STATIC | Modifier.FINAL) &&
          field.getType() == int.class &&
          field.getGenericType() == int.class &&
          field.getInt(null) == fieldValues[i] &&
          !field.isEnumConstant() &&
          !field.isSynthetic() &&
          field.getDeclaredAnnotations().length == 0 &&
          field.getAnnotatedType().getAnnotations().length == 0;
    }

    Method method = MethodHandles.Lookup.class.getDeclaredMethod("lookupModes");
    boolean methodExact = method.getModifiers() == Modifier.PUBLIC &&
        method.getReturnType() == int.class &&
        method.getGenericReturnType() == int.class &&
        method.getParameterTypes().length == 0 &&
        method.getGenericParameterTypes().length == 0 &&
        method.getExceptionTypes().length == 0 &&
        method.getGenericExceptionTypes().length == 0 &&
        !Modifier.isAbstract(method.getModifiers()) &&
        !Modifier.isFinal(method.getModifiers()) &&
        !Modifier.isNative(method.getModifiers()) &&
        !Modifier.isStatic(method.getModifiers()) &&
        !method.isBridge() &&
        !method.isDefault() &&
        !method.isSynthetic() &&
        !method.isVarArgs() &&
        method.getDeclaredAnnotations().length == 0 &&
        method.getAnnotatedReturnType().getAnnotations().length == 0 &&
        method.getAnnotatedParameterTypes().length == 0 &&
        method.getAnnotatedExceptionTypes().length == 0;
    System.out.println("metadata:" + fieldsExact + ":" + methodExact + ":" +
        MethodHandles.Lookup.MODULE + ":" +
        MethodHandles.Lookup.UNCONDITIONAL + ":" +
        MethodHandles.Lookup.ORIGINAL);
  }

  public static void main(String[] args) throws Throwable {
    printMetadata();
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandles.Lookup privateLookup =
        MethodHandles.privateLookupIn(Java17MethodHandlesLookupModes.class, lookup);
    MethodHandles.Lookup publicLookup = MethodHandles.publicLookup();

    print("lookup", lookup);
    print("private", privateLookup);
    print("same-in", lookup.in(Java17MethodHandlesLookupModes.class));
    print("nested-in", lookup.in(Nested.class));
    print("public", publicLookup);
    print("drop-private", lookup.dropLookupMode(MethodHandles.Lookup.PRIVATE));
    print("drop-protected", lookup.dropLookupMode(MethodHandles.Lookup.PROTECTED));
    print("drop-package", lookup.dropLookupMode(MethodHandles.Lookup.PACKAGE));
    print("drop-public", lookup.dropLookupMode(MethodHandles.Lookup.PUBLIC));
    print("drop-module-int", lookup.dropLookupMode(16));
    print("drop-unconditional-int", lookup.dropLookupMode(32));
    print("drop-original-int", lookup.dropLookupMode(64));
    System.out.println("public-string:" + publicLookup.toString());
    System.out.println("lookup-string:" + lookup.toString());
    System.out.println("package-string:" +
        lookup.dropLookupMode(MethodHandles.Lookup.PRIVATE).toString());
    System.out.println("private-string:" +
        lookup.dropLookupMode(MethodHandles.Lookup.PROTECTED).toString());
    System.out.println("public-mode-string:" + lookup.dropLookupMode(16).toString());
    System.out.println("noaccess-string:" +
        lookup.dropLookupMode(MethodHandles.Lookup.PUBLIC).toString());
    System.out.println(publicLookup.dropLookupMode(MethodHandles.Lookup.PRIVATE) == publicLookup);
    System.out.println(publicLookup.dropLookupMode(MethodHandles.Lookup.PUBLIC) == publicLookup);

    printFailure("drop-zero", new Runnable() {
      public void run() {
        lookup.dropLookupMode(0);
      }
    });
    printFailure("drop-combo", new Runnable() {
      public void run() {
        lookup.dropLookupMode(MethodHandles.Lookup.PRIVATE | MethodHandles.Lookup.PACKAGE);
      }
    });
    printFailure("drop-invalid", new Runnable() {
      public void run() {
        lookup.dropLookupMode(128);
      }
    });
  }

  private static void print(String label, MethodHandles.Lookup lookup) {
    int modes = lookup.lookupModes();
    System.out.println(label + ":" +
        lookup.lookupClass().getName() + ":" +
        (lookup.previousLookupClass() == null) + ":" +
        modes + ":" +
        lookup.hasFullPrivilegeAccess() + ":" +
        hasMode(modes, MethodHandles.Lookup.PUBLIC) + ":" +
        hasMode(modes, MethodHandles.Lookup.PRIVATE) + ":" +
        hasMode(modes, MethodHandles.Lookup.PROTECTED) + ":" +
        hasMode(modes, MethodHandles.Lookup.PACKAGE));
  }

  private static boolean hasMode(int modes, int mode) {
    return (modes & mode) != 0;
  }

  private static void printFailure(String label, Runnable runnable) {
    try {
      runnable.run();
      System.out.println(label + ":none");
    } catch (Throwable t) {
      System.out.println(label + ":" + t.getClass().getSimpleName());
    }
  }
}
