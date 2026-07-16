package sun.invoke.util;

import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.reflect.Modifier;
import java.util.Objects;

public class VerifyAccess {
  private static final int UNCONDITIONAL_ALLOWED = 0x0020;
  private static final int ORIGINAL_ALLOWED = 0x0040;
  private static final int MODULE_ALLOWED = 0x0010;
  private static final int PACKAGE_ONLY = 0;
  private static final int PACKAGE_ALLOWED = 0x0008;
  private static final int PROTECTED_OR_PACKAGE_ALLOWED = Modifier.PROTECTED | PACKAGE_ALLOWED;
  private static final int ALL_ACCESS_MODES = Modifier.PUBLIC | Modifier.PRIVATE | Modifier.PROTECTED | PACKAGE_ALLOWED;
  private static final boolean ALLOW_NESTMATE_ACCESS = true;

  private VerifyAccess() {}

  public static boolean isMemberAccessible(
      Class<?> refc, Class<?> defc, int mods, Class<?> lookupClass, int allowedModes) {
    return isMemberAccessible(refc, defc, mods, lookupClass, null, allowedModes);
  }

  public static boolean isMemberAccessible(
      Class<?> refc, Class<?> defc, int mods, Class<?> lookupClass,
      Class<?> previousLookupClass, int allowedModes) {
    if (allowedModes == 0 || !isClassAccessible(refc, lookupClass, previousLookupClass, allowedModes)) {
      return false;
    }

    if (defc == lookupClass && (allowedModes & Modifier.PRIVATE) != 0) {
      return true;
    }

    switch (mods & (Modifier.PUBLIC | Modifier.PRIVATE | Modifier.PROTECTED)) {
      case Modifier.PUBLIC:
        return true;
      case Modifier.PRIVATE:
        return (allowedModes & Modifier.PRIVATE) != 0 && isSameNest(defc, lookupClass);
      case Modifier.PROTECTED:
        if ((allowedModes & PROTECTED_OR_PACKAGE_ALLOWED) != 0 &&
            isSamePackage(defc, lookupClass)) {
          return true;
        }
        if ((allowedModes & Modifier.PROTECTED) == 0) {
          return false;
        }
        if (Modifier.isStatic(mods) && !isRelatedClass(refc, lookupClass)) {
          return false;
        }
        return isSubClass(lookupClass, defc);
      case PACKAGE_ONLY:
        return (allowedModes & PACKAGE_ALLOWED) != 0 && isSamePackage(defc, lookupClass);
      default:
        throw new IllegalArgumentException(new StringBuilder()
            .append("bad modifiers: ")
            .append(Modifier.toString(mods))
            .toString());
    }
  }

  static boolean isRelatedClass(Class<?> refc, Class<?> lookupClass) {
    return refc == lookupClass || isSubClass(refc, lookupClass) || isSubClass(lookupClass, refc);
  }

  static boolean isSubClass(Class<?> lookupClass, Class<?> defc) {
    return defc.isAssignableFrom(lookupClass) && !lookupClass.isInterface();
  }

  static int getClassModifiers(Class<?> c) {
    return c.getModifiers();
  }

  public static boolean isClassAccessible(Class<?> refc, Class<?> lookupClass, int allowedModes) {
    return isClassAccessible(refc, lookupClass, null, allowedModes);
  }

  public static Class<?> accessClass(MethodHandles.Lookup lookup, Class<?> targetClass)
      throws IllegalAccessException {
    Objects.requireNonNull(targetClass);
    if (!isClassAccessible(targetClass, lookup.lookupClass(), lookup.lookupModes())) {
      throw new IllegalAccessException("access violation: " + targetClass);
    }
    return targetClass;
  }

  public static boolean isClassAccessible(
      Class<?> refc, Class<?> lookupClass, Class<?> previousLookupClass, int allowedModes) {
    if (allowedModes == 0) {
      return false;
    }

    while (refc.isArray()) {
      refc = refc.getComponentType();
    }

    int mods = getClassModifiers(refc);
    if (Modifier.isPublic(mods)) {
      Module lookupModule = lookupClass == null ? null : lookupClass.getModule();
      Module previousLookupModule = previousLookupClass == null ? null : previousLookupClass.getModule();
      return isModuleAccessible(refc, lookupModule, previousLookupModule);
    }
    return (allowedModes & PACKAGE_ALLOWED) != 0 && isSamePackage(lookupClass, refc);
  }

  public static boolean isModuleAccessible(
      Class<?> refc, Module lookupModule, Module previousLookupModule) {
    Module refModule = refc.getModule();
    if (lookupModule == refModule) {
      return true;
    }
    String packageName = getPackageName(refc);
    if (lookupModule == null ||
        !lookupModule.canRead(refModule) ||
        !refModule.isExported(packageName, lookupModule)) {
      return false;
    }
    return previousLookupModule == null ||
        (previousLookupModule.canRead(refModule) &&
         refModule.isExported(packageName, previousLookupModule));
  }

  public static boolean isTypeVisible(Class<?> type, Class<?> lookupClass) {
    if (type == lookupClass) {
      return true;
    }
    while (type.isArray()) {
      type = type.getComponentType();
    }
    if (type.isPrimitive() || type == Object.class) {
      return true;
    }

    ClassLoader typeLoader = type.getClassLoader();
    if (typeLoader == null) {
      return true;
    }
    ClassLoader lookupLoader = lookupClass.getClassLoader();
    if (lookupLoader == null) {
      return false;
    }
    if (typeLoader == lookupLoader || loadersAreRelated(typeLoader, lookupLoader, true)) {
      return true;
    }

    try {
      return type == lookupLoader.loadClass(type.getName());
    } catch (ClassNotFoundException e) {
      return false;
    }
  }

  public static boolean isTypeVisible(MethodType type, Class<?> lookupClass) {
    if (!isTypeVisible(type.returnType(), lookupClass)) {
      return false;
    }
    for (int i = 0; i < type.parameterCount(); i++) {
      if (!isTypeVisible(type.parameterType(i), lookupClass)) {
        return false;
      }
    }
    return true;
  }

  public static boolean isSamePackage(Class<?> first, Class<?> second) {
    if (first == second) {
      return true;
    }
    if (first.getClassLoader() != second.getClassLoader()) {
      return false;
    }
    return getPackageName(first).equals(getPackageName(second));
  }

  public static boolean isSameModule(Class<?> first, Class<?> second) {
    return first.getModule() == second.getModule();
  }

  public static String getPackageName(Class<?> c) {
    String name = c.getName();
    int dot = name.lastIndexOf('.');
    return dot < 0 ? "" : name.substring(0, dot);
  }

  public static boolean isSamePackageMember(Class<?> first, Class<?> second) {
    if (first == second || isSameNest(first, second)) {
      return true;
    }
    return isSamePackage(first, second) &&
      getOutermostEnclosingClass(first) == getOutermostEnclosingClass(second);
  }

  private static Class<?> getOutermostEnclosingClass(Class<?> c) {
    Class<?> outer = c;
    Class<?> next = c;
    while ((next = next.getEnclosingClass()) != null) {
      outer = next;
    }
    return outer;
  }

  private static boolean loadersAreRelated(ClassLoader loader1, ClassLoader loader2, boolean loader1MustBeParent) {
    if (loader1 == loader2 || loader1 == null || (loader2 == null && !loader1MustBeParent)) {
      return true;
    }

    ClassLoader scan = loader2;
    while (scan != null) {
      if (scan == loader1) {
        return true;
      }
      scan = scan.getParent();
    }
    if (loader1MustBeParent) {
      return false;
    }

    scan = loader1;
    while (scan != null) {
      if (scan == loader2) {
        return true;
      }
      scan = scan.getParent();
    }
    return false;
  }

  public static boolean classLoaderIsAncestor(Class<?> parent, Class<?> child) {
    return loadersAreRelated(parent.getClassLoader(), child.getClassLoader(), true);
  }

  private static boolean isSameNest(Class<?> first, Class<?> second) {
    return ALLOW_NESTMATE_ACCESS && first != null && second != null && first.isNestmateOf(second);
  }
}
