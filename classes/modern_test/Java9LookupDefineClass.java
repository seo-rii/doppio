package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.Parameter;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.WildcardType;
import java.util.Arrays;

public class Java9LookupDefineClass {
  private static final String OUTPUT_ROOT = "classes/modern_lookup_define/out/";
  private static final String INITIALIZED_PROPERTY = "doppio.lookup.define.initialized";

  private static byte[] readFile(String path) throws Exception {
    FileInputStream in = new FileInputStream(path);
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    byte[] buffer = new byte[256];
    int read;
    while ((read = in.read(buffer)) != -1) {
      out.write(buffer, 0, read);
    }
    in.close();
    return out.toByteArray();
  }

  private static byte[] payload(String simpleName) throws Exception {
    return readFile(OUTPUT_ROOT + "classes/modern_test/" + simpleName + ".class");
  }

  private static void printMetadata(Method method) {
    Parameter parameter = method.getParameters()[0];
    ParameterizedType genericReturn = (ParameterizedType) method.getGenericReturnType();
    WildcardType wildcard = (WildcardType) genericReturn.getActualTypeArguments()[0];
    boolean exact = method.getModifiers() == Modifier.PUBLIC &&
        method.getReturnType() == Class.class &&
        method.getParameterTypes()[0] == byte[].class &&
        method.getExceptionTypes().length == 1 &&
        method.getExceptionTypes()[0] == IllegalAccessException.class &&
        genericReturn.getRawType() == Class.class &&
        wildcard.getUpperBounds().length == 1 &&
        wildcard.getUpperBounds()[0] == Object.class &&
        wildcard.getLowerBounds().length == 0 &&
        !method.isBridge() &&
        !method.isDefault() &&
        !method.isSynthetic() &&
        !method.isVarArgs() &&
        !Modifier.isAbstract(method.getModifiers()) &&
        !Modifier.isFinal(method.getModifiers()) &&
        !Modifier.isNative(method.getModifiers()) &&
        !Modifier.isStatic(method.getModifiers()) &&
        method.getDeclaredAnnotations().length == 0 &&
        method.getAnnotatedReturnType().getAnnotations().length == 0 &&
        method.getAnnotatedParameterTypes()[0].getAnnotations().length == 0 &&
        method.getAnnotatedExceptionTypes()[0].getAnnotations().length == 0 &&
        parameter.getName().equals("arg0") &&
        !parameter.isNamePresent() &&
        parameter.getModifiers() == 0;
    System.out.println("metadata:" + exact);
  }

  private static void printFailure(String label, Throwable failure) {
    System.out.println(label + ":" + failure.getClass().getName());
  }

  public static void main(String[] args) throws Throwable {
    Method method = MethodHandles.Lookup.class.getDeclaredMethod("defineClass", byte[].class);
    printMetadata(method);

    ClassLoader loader = Java9LookupDefineClass.class.getClassLoader();
    String payloadResource = "classes/modern_test/Java9LookupDefineClassPayload.class";
    System.out.println("payload-hidden:" + (loader.getResource(payloadResource) == null));

    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandles.Lookup packageLookup = lookup.dropLookupMode(MethodHandles.Lookup.PRIVATE);
    System.out.println("package-only:" +
        ((packageLookup.lookupModes() & MethodHandles.Lookup.PACKAGE) != 0) + ":" +
        ((packageLookup.lookupModes() & MethodHandles.Lookup.PRIVATE) == 0));

    try {
      MethodHandles.publicLookup().defineClass(null);
      System.out.println("public-null:missing");
    } catch (Throwable t) {
      printFailure("public-null", t);
    }
    try {
      lookup.dropLookupMode(MethodHandles.Lookup.PACKAGE).defineClass(
          payload("Java9LookupDefineClassPayload"));
      System.out.println("no-package-valid:missing");
    } catch (Throwable t) {
      printFailure("no-package-valid", t);
    }
    try {
      packageLookup.defineClass(null);
      System.out.println("package-null:missing");
    } catch (Throwable t) {
      printFailure("package-null", t);
    }

    System.clearProperty(INITIALIZED_PROPERTY);
    byte[] directBytes = payload("Java9LookupDefineClassPayload");
    Class<?> direct = packageLookup.defineClass(directBytes);
    System.out.println("direct-name:" + direct.getName());
    System.out.println("direct-context:" +
        (direct.getClassLoader() == loader) + ":" +
        (direct.getModule() == Java9LookupDefineClass.class.getModule()) + ":" +
        (direct.getPackage() == Java9LookupDefineClass.class.getPackage()) + ":" +
        (direct.getProtectionDomain() == Java9LookupDefineClass.class.getProtectionDomain()));
    System.out.println("direct-visible:" +
        (Class.forName(direct.getName(), false, loader) == direct));
    System.out.println("direct-uninitialized:" + (System.getProperty(INITIALIZED_PROPERTY) == null));
    MethodHandle message = packageLookup.findStatic(
        direct, "message", MethodType.methodType(String.class));
    System.out.println("lookup-uninitialized:" + (System.getProperty(INITIALIZED_PROPERTY) == null));
    System.out.println("direct-message:" + (String) message.invokeExact());
    System.out.println("direct-initialized:" + System.getProperty(INITIALIZED_PROPERTY));
    try {
      packageLookup.defineClass(directBytes);
      System.out.println("duplicate:missing");
    } catch (Throwable t) {
      printFailure("duplicate", t);
    }

    Class<?> reflected = (Class<?>) method.invoke(
        packageLookup,
        new Object[] {payload("Java9LookupDefineClassReflectPayload")});
    System.out.println("reflect:" + reflected.getMethod("message").invoke(null));

    MethodHandle defineClass = lookup.unreflect(method);
    Class<?> handled = (Class<?>) defineClass.invokeExact(
        packageLookup,
        payload("Java9LookupDefineClassHandlePayload"));
    System.out.println("unreflect:" + handled.getMethod("message").invoke(null));

    byte[] invalid = payload("Java9LookupDefineClassInvalidPayload");
    try {
      packageLookup.defineClass(new byte[0]);
      System.out.println("empty:missing");
    } catch (Throwable t) {
      printFailure("empty", t);
    }
    byte[] badMagic = invalid.clone();
    badMagic[0] = 0;
    try {
      packageLookup.defineClass(badMagic);
      System.out.println("bad-magic:missing");
    } catch (Throwable t) {
      printFailure("bad-magic", t);
    }
    try {
      packageLookup.defineClass(Arrays.copyOf(invalid, 16));
      System.out.println("truncated:missing");
    } catch (Throwable t) {
      printFailure("truncated", t);
    }
    byte[] future = invalid.clone();
    future[6] = 0;
    future[7] = 99;
    try {
      packageLookup.defineClass(future);
      System.out.println("future:missing");
    } catch (Throwable t) {
      printFailure("future", t);
    }
    try {
      packageLookup.defineClass(readFile(OUTPUT_ROOT +
          "classes/modern_lookup_wrong/Java9LookupDefineClassWrongPackage.class"));
      System.out.println("wrong-package:missing");
    } catch (Throwable t) {
      printFailure("wrong-package", t);
    }
    try {
      packageLookup.defineClass(readFile("classes/modern_module/out/module-info.class"));
      System.out.println("module-info:missing");
    } catch (Throwable t) {
      printFailure("module-info", t);
    }
    byte[] trailing = invalid.clone();
    trailing = Arrays.copyOf(trailing, trailing.length + 1);
    try {
      packageLookup.defineClass(trailing);
      System.out.println("trailing-byte:missing");
    } catch (Throwable t) {
      printFailure("trailing-byte", t);
    }
    Class<?> validAfterErrors = packageLookup.defineClass(invalid);
    System.out.println("valid-after-errors:" +
        validAfterErrors.getMethod("message").invoke(null));
  }
}
