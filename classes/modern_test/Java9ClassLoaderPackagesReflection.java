package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.Set;
import java.util.TreeSet;

public class Java9ClassLoaderPackagesReflection {
  private static final String OWN_PACKAGE = "classes.modern_test";
  private static final String MISSING_PACKAGE = "doppio.missing.package";
  private static final String BOOTSTRAP_PACKAGE = "java.lang";

  private static final class EmptyLoader extends ClassLoader {
    EmptyLoader() {
      super(null);
    }
  }

  private static boolean metadata(Method method, String name, Class<?> returnType,
      Class<?>... parameterTypes) {
    int modifiers = method.getModifiers();
    if (method.getDeclaringClass() != ClassLoader.class ||
        !method.getName().equals(name) ||
        modifiers != (Modifier.PUBLIC | Modifier.FINAL) ||
        !Modifier.isPublic(modifiers) || !Modifier.isFinal(modifiers) ||
        Modifier.isNative(modifiers) || method.isSynthetic() ||
        method.getReturnType() != returnType ||
        !Arrays.equals(method.getParameterTypes(), parameterTypes) ||
        method.getExceptionTypes().length != 0 || method.getDefaultValue() != null ||
        method.getDeclaredAnnotations().length != 0 ||
        method.getAnnotations().length != 0 ||
        method.isBridge() || method.isVarArgs()) {
      return false;
    }

    if (method.getParameterAnnotations().length != parameterTypes.length) {
      return false;
    }
    for (java.lang.annotation.Annotation[] annotations : method.getParameterAnnotations()) {
      if (annotations.length != 0) {
        return false;
      }
    }
    return true;
  }

  private static int count(Method[] methods, Method expected) {
    int count = 0;
    for (Method method : methods) {
      if (method.equals(expected)) {
        count++;
      }
    }
    return count;
  }

  private static boolean named(Package pkg, String name) {
    return pkg != null && pkg.getName().equals(name);
  }

  private static int indexOf(Package[] packages, String name) {
    for (int i = 0; i < packages.length; i++) {
      if (named(packages[i], name)) {
        return i;
      }
    }
    return -1;
  }

  private static Set<String> selectedNames(Package[] packages) {
    Set<String> names = new TreeSet<String>();
    for (Package pkg : packages) {
      if (pkg != null && (pkg.getName().equals(OWN_PACKAGE) ||
          pkg.getName().equals(MISSING_PACKAGE) ||
          pkg.getName().equals(BOOTSTRAP_PACKAGE))) {
        names.add(pkg.getName());
      }
    }
    return names;
  }

  private static boolean reflectedNullHasExactCause(Method method, ClassLoader loader)
      throws IllegalAccessException {
    try {
      method.invoke(loader, new Object[] {null});
      return false;
    } catch (InvocationTargetException exception) {
      Throwable cause = exception.getCause();
      return cause != null && cause.getClass() == NullPointerException.class &&
          cause == exception.getTargetException() && cause.getCause() == null;
    }
  }

  public static void main(String[] args) throws Throwable {
    Method packageDeclared = ClassLoader.class.getDeclaredMethod(
        "getDefinedPackage", String.class);
    Method packagePublic = ClassLoader.class.getMethod(
        "getDefinedPackage", String.class);
    Method packagesDeclared = ClassLoader.class.getDeclaredMethod("getDefinedPackages");
    Method packagesPublic = ClassLoader.class.getMethod("getDefinedPackages");

    System.out.println("package-metadata=" + metadata(
        packageDeclared, "getDefinedPackage", Package.class, String.class));
    System.out.println("packages-metadata=" + metadata(
        packagesDeclared, "getDefinedPackages", Package[].class));
    System.out.println("lookups=" + (packageDeclared.equals(packagePublic) &&
        packagesDeclared.equals(packagesPublic)));
    System.out.println("declared-enumeration=" +
        (count(ClassLoader.class.getDeclaredMethods(), packageDeclared) == 1 &&
        count(ClassLoader.class.getDeclaredMethods(), packagesDeclared) == 1));
    System.out.println("public-enumeration=" +
        (count(ClassLoader.class.getMethods(), packagePublic) == 1 &&
        count(ClassLoader.class.getMethods(), packagesPublic) == 1));

    ClassLoader system = Java9ClassLoaderPackagesReflection.class.getClassLoader();
    ClassLoader empty = new EmptyLoader();
    Package directOwn = system.getDefinedPackage(OWN_PACKAGE);
    Package directMissing = system.getDefinedPackage(MISSING_PACKAGE);
    Package directBootstrap = system.getDefinedPackage(BOOTSTRAP_PACKAGE);
    Package[] directFirst = system.getDefinedPackages();
    Package[] directSecond = system.getDefinedPackages();
    Set<String> directSelected = selectedNames(directFirst);
    System.out.println("direct-system=" + (named(directOwn, OWN_PACKAGE) &&
        directMissing == null && directBootstrap == null));
    System.out.println("direct-selected=" + directSelected);
    System.out.println("direct-empty=" +
        (empty.getDefinedPackage(OWN_PACKAGE) == null &&
        empty.getDefinedPackage(MISSING_PACKAGE) == null &&
        empty.getDefinedPackage(BOOTSTRAP_PACKAGE) == null &&
        empty.getDefinedPackages().length == 0));

    Package reflectedOwn = (Package) packageDeclared.invoke(system, OWN_PACKAGE);
    Package reflectedMissing = (Package) packageDeclared.invoke(system, MISSING_PACKAGE);
    Package reflectedBootstrap = (Package) packageDeclared.invoke(system, BOOTSTRAP_PACKAGE);
    Package[] reflectedPackages = (Package[]) packagesDeclared.invoke(system);
    Set<String> reflectedSelected = selectedNames(reflectedPackages);
    Package reflectedEmptyOwn = (Package) packageDeclared.invoke(empty, OWN_PACKAGE);
    Package[] reflectedEmptyPackages = (Package[]) packagesDeclared.invoke(empty);
    System.out.println("reflected-system=" + (named(reflectedOwn, OWN_PACKAGE) &&
        reflectedMissing == null && reflectedBootstrap == null));
    System.out.println("reflected-selected=" + reflectedSelected);
    System.out.println("reflected-empty=" +
        (reflectedEmptyOwn == null && reflectedEmptyPackages.length == 0));

    boolean freshArrays = directFirst != directSecond &&
        directFirst != reflectedPackages && directSecond != reflectedPackages &&
        reflectedPackages != reflectedEmptyPackages;
    int directOwnIndex = indexOf(directFirst, OWN_PACKAGE);
    int reflectedOwnIndex = indexOf(reflectedPackages, OWN_PACKAGE);
    boolean mutationIsolation = directOwnIndex >= 0 && reflectedOwnIndex >= 0;
    if (mutationIsolation) {
      directFirst[directOwnIndex] = null;
      reflectedPackages[reflectedOwnIndex] = null;
      Package[] afterDirectMutation = system.getDefinedPackages();
      Package[] afterReflectedMutation = (Package[]) packagesDeclared.invoke(system);
      mutationIsolation = indexOf(directSecond, OWN_PACKAGE) >= 0 &&
          indexOf(afterDirectMutation, OWN_PACKAGE) >= 0 &&
          indexOf(afterReflectedMutation, OWN_PACKAGE) >= 0 &&
          selectedNames(afterDirectMutation).equals(directSelected) &&
          selectedNames(afterReflectedMutation).equals(reflectedSelected);
    }
    System.out.println("fresh-arrays=" + freshArrays);
    System.out.println("mutation-isolation=" + mutationIsolation);
    System.out.println("null-cause=" +
        reflectedNullHasExactCause(packageDeclared, system));

    MethodHandle packageHandle = MethodHandles.lookup().unreflect(packageDeclared);
    MethodHandle packagesHandle = MethodHandles.lookup().unreflect(packagesDeclared);
    boolean handleTypes = packageHandle.type().equals(MethodType.methodType(
        Package.class, ClassLoader.class, String.class)) &&
        packagesHandle.type().equals(MethodType.methodType(
            Package[].class, ClassLoader.class));
    Package handledOwn = (Package) packageHandle.invokeExact(system, OWN_PACKAGE);
    Package handledMissing = (Package) packageHandle.invokeExact(system, MISSING_PACKAGE);
    Package handledBootstrap = (Package) packageHandle.invokeExact(system, BOOTSTRAP_PACKAGE);
    Package[] handledPackages = (Package[]) packagesHandle.invokeExact(system);
    Package handledEmptyOwn = (Package) packageHandle.invokeExact(empty, OWN_PACKAGE);
    Package[] handledEmptyPackages = (Package[]) packagesHandle.invokeExact(empty);
    System.out.println("handle-types=" + handleTypes);
    System.out.println("handled-system=" + (named(handledOwn, OWN_PACKAGE) &&
        handledMissing == null && handledBootstrap == null));
    System.out.println("handled-selected=" + selectedNames(handledPackages));
    System.out.println("handled-empty=" +
        (handledEmptyOwn == null && handledEmptyPackages.length == 0));
  }
}
