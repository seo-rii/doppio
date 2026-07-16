package classes.modern_test;

import java.lang.Deprecated;
import java.lang.annotation.Annotation;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;

public class Java9LookupHasPrivateAccess {
  private static final class PrivateTarget {}

  private static void printDeprecatedTypeMetadata() throws Exception {
    Method since = Deprecated.class.getDeclaredMethod("since");
    Method forRemoval = Deprecated.class.getDeclaredMethod("forRemoval");
    boolean exact = Deprecated.class.isAnnotation() &&
        Deprecated.class.getDeclaredMethods().length == 2 &&
        since.getModifiers() == (Modifier.PUBLIC | Modifier.ABSTRACT) &&
        since.getReturnType() == String.class &&
        since.getParameterTypes().length == 0 &&
        since.getExceptionTypes().length == 0 &&
        since.getDefaultValue().equals("") &&
        since.getDeclaredAnnotations().length == 0 &&
        forRemoval.getModifiers() == (Modifier.PUBLIC | Modifier.ABSTRACT) &&
        forRemoval.getReturnType() == boolean.class &&
        forRemoval.getParameterTypes().length == 0 &&
        forRemoval.getExceptionTypes().length == 0 &&
        forRemoval.getDefaultValue().equals(Boolean.FALSE) &&
        forRemoval.getDeclaredAnnotations().length == 0;
    System.out.println("deprecated-type:" + exact);
  }

  private static void printMetadata(Method method) {
    Annotation[] annotations = method.getDeclaredAnnotations();
    Deprecated deprecated = method.getDeclaredAnnotation(Deprecated.class);
    boolean exact = method.getModifiers() == Modifier.PUBLIC &&
        method.getReturnType() == boolean.class &&
        method.getGenericReturnType() == boolean.class &&
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
        method.getParameters().length == 0 &&
        method.getAnnotatedReturnType().getAnnotations().length == 0 &&
        method.getAnnotatedParameterTypes().length == 0 &&
        method.getAnnotatedExceptionTypes().length == 0;
    boolean deprecatedExact = annotations.length == 1 &&
        annotations[0].annotationType() == Deprecated.class &&
        deprecated != null &&
        deprecated.since().equals("14") &&
        !deprecated.forRemoval();
    System.out.println("metadata:" + exact + ":" + deprecatedExact);
  }

  public static void main(String[] args) throws Throwable {
    Method method = MethodHandles.Lookup.class.getDeclaredMethod("hasPrivateAccess");
    printMetadata(method);
    printDeprecatedTypeMetadata();

    MethodHandles.Lookup lookup = MethodHandles.lookup();
    MethodHandles.Lookup sameClass = lookup.in(Java9LookupHasPrivateAccess.class);
    MethodHandles.Lookup noPrivate = lookup.dropLookupMode(MethodHandles.Lookup.PRIVATE);
    MethodHandles.Lookup privateTarget = MethodHandles.privateLookupIn(PrivateTarget.class, lookup);

    System.out.println("direct:" + lookup.hasPrivateAccess());
    System.out.println("same-class:" + sameClass.hasPrivateAccess());
    System.out.println("drop-private:" + noPrivate.hasPrivateAccess());
    System.out.println("public:" + MethodHandles.publicLookup().hasPrivateAccess());
    System.out.println("private-lookup-in:" + privateTarget.hasPrivateAccess());
    System.out.println("modes:" +
        ((lookup.lookupModes() & MethodHandles.Lookup.PRIVATE) != 0) + ":" +
        ((noPrivate.lookupModes() & MethodHandles.Lookup.PRIVATE) != 0));

    System.out.println("reflect:" + method.invoke(lookup) + ":" + method.invoke(noPrivate));
    MethodHandle handle = lookup.unreflect(method);
    boolean handledLookup = (boolean) handle.invokeExact(lookup);
    boolean handledPublic = (boolean) handle.invokeExact(MethodHandles.publicLookup());
    System.out.println("unreflect:" + handledLookup + ":" + handledPublic);
    System.out.println("handle-type:" +
        (handle.type().equals(MethodType.methodType(boolean.class, MethodHandles.Lookup.class))) +
        ":" + handle.type().toMethodDescriptorString());
  }
}
