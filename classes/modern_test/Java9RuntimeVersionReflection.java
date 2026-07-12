package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;

public class Java9RuntimeVersionReflection {
  public static void main(String[] args) throws Throwable {
    Method versionMethod = Runtime.class.getMethod("version");
    int declaredCount = 0;
    for (Method method : Runtime.class.getDeclaredMethods()) {
      if (method.getName().equals("version")) {
        declaredCount++;
      }
    }

    int modifiers = versionMethod.getModifiers();
    System.out.println(declaredCount);
    System.out.println(Modifier.isPublic(modifiers));
    System.out.println(Modifier.isStatic(modifiers));
    System.out.println(Modifier.isNative(modifiers));
    System.out.println(versionMethod.isSynthetic());
    System.out.println(versionMethod.getParameterCount());
    System.out.println(versionMethod.getReturnType().getName());
    System.out.println(versionMethod.getExceptionTypes().length);
    System.out.println(versionMethod.getDeclaredAnnotations().length);

    Object reflectedVersion = versionMethod.invoke(null);
    Object reflectedAgain = versionMethod.invoke(null);
    Runtime.Version directVersion = Runtime.version();
    System.out.println(reflectedVersion == reflectedAgain);
    System.out.println(reflectedVersion == directVersion);

    Class<?> versionClass = reflectedVersion.getClass();
    Method major = versionClass.getMethod("major");
    Method minor = versionClass.getMethod("minor");
    Method security = versionClass.getMethod("security");
    Method build = versionClass.getMethod("build");
    Method pre = versionClass.getMethod("pre");
    System.out.println(major.invoke(reflectedVersion).equals(directVersion.major()));
    System.out.println(minor.invoke(reflectedVersion).equals(directVersion.minor()));
    System.out.println(security.invoke(reflectedVersion).equals(directVersion.security()));
    System.out.println(build.invoke(reflectedVersion).equals(directVersion.build()));
    System.out.println(pre.invoke(reflectedVersion).equals(directVersion.pre()));

    MethodHandle versionHandle = MethodHandles.publicLookup().unreflect(versionMethod);
    System.out.println(versionHandle.type().toMethodDescriptorString());
    System.out.println(versionHandle.invokeWithArguments() == directVersion);
  }
}
