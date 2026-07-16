package classes.modern_test;

import classes.modern_test.lookup_access.Java9LookupClassAccessTarget;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.Parameter;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.WildcardType;

public class Java9LookupClassAccess {
  private static final String INITIALIZED_PROPERTY = "doppio.lookup.access.initialized";

  private static void printMetadata(Method findClass, Method accessClass) {
    Parameter findParameter = findClass.getParameters()[0];
    Parameter accessParameter = accessClass.getParameters()[0];
    ParameterizedType findReturn = (ParameterizedType) findClass.getGenericReturnType();
    WildcardType findReturnArgument = (WildcardType) findReturn.getActualTypeArguments()[0];
    ParameterizedType accessReturn = (ParameterizedType) accessClass.getGenericReturnType();
    WildcardType accessReturnArgument = (WildcardType) accessReturn.getActualTypeArguments()[0];
    ParameterizedType accessParameterType = (ParameterizedType) accessClass.getGenericParameterTypes()[0];
    WildcardType accessParameterArgument =
        (WildcardType) accessParameterType.getActualTypeArguments()[0];
    boolean findExact = findClass.getModifiers() == Modifier.PUBLIC &&
        findClass.getReturnType() == Class.class &&
        findClass.getParameterTypes()[0] == String.class &&
        findClass.getExceptionTypes().length == 2 &&
        findClass.getExceptionTypes()[0] == ClassNotFoundException.class &&
        findClass.getExceptionTypes()[1] == IllegalAccessException.class &&
        findReturn.getRawType() == Class.class &&
        findReturnArgument.getUpperBounds().length == 1 &&
        findReturnArgument.getUpperBounds()[0] == Object.class &&
        findReturnArgument.getLowerBounds().length == 0 &&
        findClass.getGenericParameterTypes()[0] == String.class &&
        !Modifier.isAbstract(findClass.getModifiers()) &&
        !Modifier.isFinal(findClass.getModifiers()) &&
        !Modifier.isNative(findClass.getModifiers()) &&
        !Modifier.isStatic(findClass.getModifiers()) &&
        !findClass.isBridge() &&
        !findClass.isDefault() &&
        !findClass.isSynthetic() &&
        !findClass.isVarArgs() &&
        findClass.getDeclaredAnnotations().length == 0 &&
        findClass.getAnnotatedReturnType().getAnnotations().length == 0 &&
        findClass.getAnnotatedParameterTypes()[0].getAnnotations().length == 0 &&
        findClass.getAnnotatedExceptionTypes()[0].getAnnotations().length == 0 &&
        findClass.getAnnotatedExceptionTypes()[1].getAnnotations().length == 0 &&
        findParameter.getName().equals("arg0") &&
        !findParameter.isNamePresent() &&
        findParameter.getModifiers() == 0;
    boolean accessExact = accessClass.getModifiers() == Modifier.PUBLIC &&
        accessClass.getReturnType() == Class.class &&
        accessClass.getParameterTypes()[0] == Class.class &&
        accessClass.getExceptionTypes().length == 1 &&
        accessClass.getExceptionTypes()[0] == IllegalAccessException.class &&
        accessReturn.getRawType() == Class.class &&
        accessReturnArgument.getUpperBounds().length == 1 &&
        accessReturnArgument.getUpperBounds()[0] == Object.class &&
        accessReturnArgument.getLowerBounds().length == 0 &&
        accessParameterType.getRawType() == Class.class &&
        accessParameterArgument.getUpperBounds().length == 1 &&
        accessParameterArgument.getUpperBounds()[0] == Object.class &&
        accessParameterArgument.getLowerBounds().length == 0 &&
        !Modifier.isAbstract(accessClass.getModifiers()) &&
        !Modifier.isFinal(accessClass.getModifiers()) &&
        !Modifier.isNative(accessClass.getModifiers()) &&
        !Modifier.isStatic(accessClass.getModifiers()) &&
        !accessClass.isBridge() &&
        !accessClass.isDefault() &&
        !accessClass.isSynthetic() &&
        !accessClass.isVarArgs() &&
        accessClass.getDeclaredAnnotations().length == 0 &&
        accessClass.getAnnotatedReturnType().getAnnotations().length == 0 &&
        accessClass.getAnnotatedParameterTypes()[0].getAnnotations().length == 0 &&
        accessClass.getAnnotatedExceptionTypes()[0].getAnnotations().length == 0 &&
        accessParameter.getName().equals("arg0") &&
        !accessParameter.isNamePresent() &&
        accessParameter.getModifiers() == 0;
    System.out.println("metadata:" + findExact + ":" + accessExact);
  }

  private static void printFailure(String label, Throwable failure) {
    System.out.println(label + ":" + failure.getClass().getName());
  }

  public static void main(String[] args) throws Throwable {
    Method findClass = MethodHandles.Lookup.class.getDeclaredMethod("findClass", String.class);
    Method accessClass = MethodHandles.Lookup.class.getDeclaredMethod("accessClass", Class.class);
    printMetadata(findClass, accessClass);

    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandles.Lookup packageLookup = lookup.dropLookupMode(MethodHandles.Lookup.PRIVATE);
    MethodHandles.Lookup noPackageLookup = lookup.dropLookupMode(MethodHandles.Lookup.PACKAGE);
    String samePackageName = "classes.modern_test.Java9LookupClassAccessPackageTarget";
    String crossPublicName = Java9LookupClassAccessTarget.PublicNested.class.getName();
    String crossPackageName = Java9LookupClassAccessTarget.class.getName() + "$PackageNested";

    System.clearProperty(INITIALIZED_PROPERTY);
    Class<?> samePackage = packageLookup.findClass(samePackageName);
    System.out.println("same-package:" + samePackage.getName() + ":" +
        (samePackage.getClassLoader() == Java9LookupClassAccess.class.getClassLoader()) + ":" +
        (samePackage.getModule() == Java9LookupClassAccess.class.getModule()) + ":" +
        (samePackage.getProtectionDomain() == Java9LookupClassAccess.class.getProtectionDomain()));
    System.out.println("find-uninitialized:" + (System.getProperty(INITIALIZED_PROPERTY) == null));
    System.out.println("access-identity:" + (packageLookup.accessClass(samePackage) == samePackage));
    System.out.println("access-uninitialized:" + (System.getProperty(INITIALIZED_PROPERTY) == null));
    MethodHandle message = packageLookup.findStatic(
        samePackage, "message", MethodType.methodType(String.class));
    System.out.println("lookup-uninitialized:" + (System.getProperty(INITIALIZED_PROPERTY) == null));
    System.out.println("message:" + (String) message.invokeExact());
    System.out.println("initialized:" + System.getProperty(INITIALIZED_PROPERTY));

    Class<?> crossPublic = lookup.findClass(crossPublicName);
    System.out.println("cross-public:" + crossPublic.getName() + ":" +
        (lookup.accessClass(crossPublic) == crossPublic));
    Class<?> crossPackage = Class.forName(
        crossPackageName, false, Java9LookupClassAccess.class.getClassLoader());
    Class<?> samePackageArray = Class.forName("[L" + samePackageName + ";");
    Class<?> crossPackageArray = Class.forName("[[L" + crossPackageName + ";");
    System.out.println("same-package-array-access:" +
        (lookup.accessClass(samePackageArray) == samePackageArray));
    try {
      lookup.findClass(crossPackageName);
      System.out.println("cross-package-find:missing");
    } catch (Throwable t) {
      printFailure("cross-package-find", t);
    }
    try {
      lookup.accessClass(crossPackage);
      System.out.println("cross-package-access:missing");
    } catch (Throwable t) {
      printFailure("cross-package-access", t);
    }
    try {
      lookup.accessClass(crossPackageArray);
      System.out.println("cross-package-array-access:missing");
    } catch (Throwable t) {
      printFailure("cross-package-array-access", t);
    }
    try {
      noPackageLookup.findClass(samePackageName);
      System.out.println("no-package-find:missing");
    } catch (Throwable t) {
      printFailure("no-package-find", t);
    }
    try {
      noPackageLookup.accessClass(samePackage);
      System.out.println("no-package-access:missing");
    } catch (Throwable t) {
      printFailure("no-package-access", t);
    }
    try {
      noPackageLookup.findClass("classes.modern_test.DoesNotExist");
      System.out.println("no-package-missing:missing");
    } catch (Throwable t) {
      printFailure("no-package-missing", t);
    }

    System.out.println("public-find:" +
        (MethodHandles.publicLookup().findClass("java.lang.String") == String.class));
    System.out.println("array-find:" +
        (lookup.findClass("[I") == int[].class) + ":" +
        (lookup.findClass("[Ljava.lang.String;") == String[].class));
    System.out.println("primitive-access:" + (lookup.accessClass(int.class) == int.class));
    System.out.println("void-access:" + (lookup.accessClass(void.class) == void.class));
    System.out.println("array-access:" +
        (lookup.accessClass(int[].class) == int[].class) + ":" +
        (lookup.accessClass(String[].class) == String[].class));
    try {
      lookup.findClass("int");
      System.out.println("primitive-find:missing");
    } catch (Throwable t) {
      printFailure("primitive-find", t);
    }
    String[] primitiveNames = {
        "boolean", "byte", "char", "double", "float", "int", "long", "short", "void"
    };
    boolean allPrimitiveNamesRejected = true;
    for (String primitiveName : primitiveNames) {
      try {
        lookup.findClass(primitiveName);
        allPrimitiveNamesRejected = false;
      } catch (ClassNotFoundException expected) {
        // Expected for every primitive and void binary name.
      } catch (Throwable unexpected) {
        allPrimitiveNamesRejected = false;
      }
    }
    System.out.println("primitive-find-all:" + allPrimitiveNamesRejected);
    try {
      Class.forName("int");
      System.out.println("class-for-name-primitive:missing");
    } catch (Throwable t) {
      printFailure("class-for-name-primitive", t);
    }
    try {
      lookup.findClass("classes.modern_test.DoesNotExist");
      System.out.println("missing-find:missing");
    } catch (Throwable t) {
      printFailure("missing-find", t);
    }
    try {
      lookup.findClass(null);
      System.out.println("null-find:missing");
    } catch (Throwable t) {
      printFailure("null-find", t);
    }
    try {
      lookup.accessClass(null);
      System.out.println("null-access:missing");
    } catch (Throwable t) {
      printFailure("null-access", t);
    }

    Class<?> reflectedFind = (Class<?>) findClass.invoke(lookup, "java.lang.Integer");
    Class<?> reflectedAccess = (Class<?>) accessClass.invoke(lookup, Long.class);
    System.out.println("reflect:" + reflectedFind.getName() + ":" + reflectedAccess.getName());
    MethodHandle findHandle = lookup.unreflect(findClass);
    MethodHandle accessHandle = lookup.unreflect(accessClass);
    Class<?> handledFind = (Class<?>) findHandle.invokeExact(lookup, "java.lang.Double");
    Class<?> handledAccess = (Class<?>) accessHandle.invokeExact(lookup, Float.class);
    System.out.println("unreflect:" + handledFind.getName() + ":" + handledAccess.getName());
    System.out.println("handle-types:" +
        findHandle.type().toMethodDescriptorString() + ":" +
        accessHandle.type().toMethodDescriptorString());
  }
}

class Java9LookupClassAccessPackageTarget {
  static {
    System.setProperty("doppio.lookup.access.initialized", "yes");
  }

  public static String message() {
    return "lookup-access";
  }
}
