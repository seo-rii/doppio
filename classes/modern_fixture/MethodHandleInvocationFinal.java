package classes.modern_test;

import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.invoke.WrongMethodTypeException;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

/** C1: actual javac signature-polymorphic descriptors, not erased stand-ins. */
public class MethodHandleInvocationFinal {
  private static int effects;
  private static long seenLong;
  private static double seenDouble;
  private static int seenInt;
  private static Throwable original;

  private static Object mixed(long wide, double number, Object token, int tail) {
    effects++;
    seenLong = wide;
    seenDouble = number;
    seenInt = tail;
    return token;
  }

  private static int echoInt(int value) { effects++; return value; }
  private static long echoLong(long value) { effects++; return value; }
  private static Object echoObject(Object value) { effects++; return value; }

  private static Object throwing(long wide, Object token) throws Throwable {
    effects++;
    try {
      seenLong = wide;
      throw original;
    } finally {
      effects += 10;
    }
  }

  private static MethodHandle intHandle() throws ReflectiveOperationException {
    return MethodHandles.lookup().findStatic(MethodHandleInvocationFinal.class,
        "echoInt", MethodType.methodType(int.class, int.class));
  }

  private static MethodHandle longHandle() throws ReflectiveOperationException {
    return MethodHandles.lookup().findStatic(MethodHandleInvocationFinal.class,
        "echoLong", MethodType.methodType(long.class, long.class));
  }

  private static void emit(String id, Object value) {
    System.out.println(new StringBuilder().append(id).append('=').append(value).toString());
  }

  private static String failure(Throwable failure) {
    return new StringBuilder().append(failure.getClass().getName()).append(",effects=")
        .append(effects).toString();
  }

  private static void caseMixedWide() throws Throwable {
    effects = 0;
    MethodHandle target = MethodHandles.lookup().findStatic(MethodHandleInvocationFinal.class,
        "mixed", MethodType.methodType(Object.class, long.class, double.class, Object.class, int.class));
    Object token = new Object();
    Object returned = (Object) target.invokeExact(0x100000001L, -0.0, token, -7);
    boolean wide = seenLong == 0x100000001L && seenInt == -7
        && Double.doubleToRawLongBits(seenDouble) == 0x8000000000000000L;
    emit("exact-mixed-wide-identity", new StringBuilder().append("identity=").append(returned == token)
        .append(",wide=").append(wide).append(",effects=").append(effects).toString());
  }

  private static void caseExactArgumentMismatch() throws Throwable {
    effects = 0;
    MethodHandle target = intHandle();
    try {
      int unexpected = (int) target.invokeExact((short) 7);
      emit("exact-argument-mismatch-before-target", "unexpected-short-success");
    } catch (WrongMethodTypeException expected) {
      emit("exact-argument-mismatch-before-target", new StringBuilder().append("short:").append(failure(expected)).toString());
    }
    try {
      int unexpected = (int) target.invokeExact(7L);
      emit("exact-argument-mismatch-before-target", "unexpected-long-success");
    } catch (WrongMethodTypeException expected) {
      emit("exact-argument-mismatch-before-target", new StringBuilder().append("long:").append(failure(expected)).toString());
    }
  }

  private static void caseExactReturnMismatch() throws Throwable {
    effects = 0;
    MethodHandle target = intHandle();
    try {
      Object unexpected = (Object) target.invokeExact(7);
      emit("exact-return-mismatch-before-target", "unexpected-object-success");
    } catch (WrongMethodTypeException expected) {
      emit("exact-return-mismatch-before-target", new StringBuilder().append("object:").append(failure(expected)).toString());
    }
    try {
      target.invokeExact(7);
      emit("exact-return-mismatch-before-target", "unexpected-void-success");
    } catch (WrongMethodTypeException expected) {
      emit("exact-return-mismatch-before-target", new StringBuilder().append("void:").append(failure(expected)).toString());
    }
  }

  private static void caseUncastNull() throws Throwable {
    effects = 0;
    MethodHandle target = MethodHandles.lookup().findStatic(MethodHandleInvocationFinal.class,
        "echoObject", MethodType.methodType(Object.class, Object.class));
    try {
      Object unexpected = (Object) target.invokeExact(null);
      emit("exact-uncast-null-descriptor", "unexpected-success");
    } catch (WrongMethodTypeException expected) {
      emit("exact-uncast-null-descriptor", failure(expected));
    }
    Object returned = (Object) target.invokeExact((Object) null);
    emit("exact-uncast-null-descriptor", new StringBuilder().append("typedNull=").append(returned == null)
        .append(",effects=").append(effects).toString());
  }

  private static void caseInvokeEquivalence() throws Throwable {
    effects = 0;
    MethodHandle target = longHandle();
    long inexact = (long) target.invoke((byte) -7);
    MethodHandle adapted = target.asType(MethodType.methodType(long.class, byte.class));
    long exact = (long) adapted.invokeExact((byte) -7);
    emit("invoke-as-type-equivalence", new StringBuilder().append("inexact=").append(inexact)
        .append(",adapted=").append(exact).append(",effects=").append(effects).toString());
  }

  private static void caseThrowableIdentity() throws Throwable {
    MethodHandle target = MethodHandles.lookup().findStatic(MethodHandleInvocationFinal.class,
        "throwing", MethodType.methodType(Object.class, long.class, Object.class));
    Throwable[] originals = {new Exception("checked"), new IllegalStateException("runtime"),
        new AssertionError("error")};
    String[] labels = {"checked", "runtime", "error"};
    for (int i = 0; i < originals.length; i++) {
      effects = 0;
      seenLong = 0L;
      original = originals[i];
      Throwable observed = null;
      try {
        Object unexpected = (Object) target.invokeExact(0x100000001L, new Object());
      } catch (Throwable actual) {
        observed = actual;
      } finally {
        effects += 100;
      }
      emit("target-throwable-identity", new StringBuilder().append(labels[i]).append(":identity=")
          .append(observed == original).append(",wide=").append(seenLong == 0x100000001L)
          .append(",effects=").append(effects).toString());
    }
  }

  private static void caseExactInvoker() throws Throwable {
    effects = 0;
    MethodType type = MethodType.methodType(long.class, long.class);
    MethodHandle invoker = MethodHandles.exactInvoker(type);
    MethodHandle target = longHandle();
    long returned = (long) invoker.invokeExact(target, 0x100000001L);
    boolean descriptor = invoker.type().equals(MethodType.methodType(long.class, MethodHandle.class, long.class));
    emit("exact-invoker-descriptor", new StringBuilder().append("type=").append(descriptor)
        .append(",value=").append(returned).append(",effects=").append(effects).toString());
    try {
      long unexpected = (long) invoker.invokeExact(intHandle(), 7L);
      emit("exact-invoker-descriptor", "unexpected-success");
    } catch (WrongMethodTypeException expected) {
      emit("exact-invoker-descriptor", failure(expected));
    }
  }

  private static void caseInexactInvoker() throws Throwable {
    effects = 0;
    MethodHandle invoker = MethodHandles.invoker(MethodType.methodType(Object.class, Object.class));
    MethodHandle target = longHandle();
    Object returned = (Object) invoker.invokeExact(target, (Object) Byte.valueOf((byte) -7));
    boolean descriptor = invoker.type().equals(MethodType.methodType(Object.class, MethodHandle.class, Object.class));
    emit("inexact-invoker-adaptation", new StringBuilder().append("type=").append(descriptor)
        .append(",boxedLong=").append(returned.getClass() == Long.class)
        .append(",value=").append(((Long) returned).longValue()).append(",effects=").append(effects).toString());
    try {
      Object unexpected = (Object) invoker.invokeExact(target, new Object());
      emit("inexact-invoker-adaptation", "unexpected-success");
    } catch (ClassCastException expected) {
      emit("inexact-invoker-adaptation", failure(expected));
    }
  }

  private static void caseLookupInvokers() throws Throwable {
    effects = 0;
    MethodHandles.Lookup lookup = MethodHandles.publicLookup();
    MethodHandle exact = lookup.findVirtual(MethodHandle.class, "invokeExact",
        MethodType.methodType(long.class, long.class));
    MethodHandle inexact = lookup.findVirtual(MethodHandle.class, "invoke",
        MethodType.methodType(long.class, byte.class));
    MethodHandle target = longHandle();
    long a = (long) exact.invokeExact(target, 0x100000001L);
    long b = (long) inexact.invokeExact(target, (byte) -7);
    emit("lookup-signature-polymorphic-invokers", new StringBuilder().append("exact=").append(a)
        .append(",inexact=").append(b).append(",effects=").append(effects).toString());
    try {
      long unexpected = (long) exact.invokeExact(intHandle(), 7L);
      emit("lookup-signature-polymorphic-invokers", "unexpected-success");
    } catch (WrongMethodTypeException expected) {
      emit("lookup-signature-polymorphic-invokers", failure(expected));
    }
  }

  private static void caseReflectivePlaceholders() throws Throwable {
    effects = 0;
    MethodHandle target = longHandle();
    Method exact = MethodHandle.class.getDeclaredMethod("invokeExact", Object[].class);
    Method inexact = MethodHandle.class.getDeclaredMethod("invoke", Object[].class);
    Method[] methods = {exact, inexact};
    String[] labels = {"invokeExact", "invoke"};
    for (int i = 0; i < methods.length; i++) {
      try {
        Object unexpected = methods[i].invoke(target, new Object[] {new Object[] {Long.valueOf(7L)}});
        emit("reflective-invoker-placeholders", "unexpected-success");
      } catch (InvocationTargetException expected) {
        emit("reflective-invoker-placeholders", new StringBuilder().append(labels[i]).append(':')
            .append(failure(expected.getCause())).toString());
      }
    }
    MethodHandle unreflected = MethodHandles.lookup().unreflect(exact);
    try {
      Object unexpected = (Object) unreflected.invokeExact(target, new Object[] {Long.valueOf(7L)});
      emit("reflective-invoker-placeholders", "unexpected-unreflect-success");
    } catch (UnsupportedOperationException expected) {
      emit("reflective-invoker-placeholders", new StringBuilder().append("unreflect:")
          .append(failure(expected)).toString());
    }
  }

  public static void main(String[] args) throws Throwable {
    caseMixedWide();
    caseExactArgumentMismatch();
    caseExactReturnMismatch();
    caseUncastNull();
    caseInvokeEquivalence();
    caseThrowableIdentity();
    caseExactInvoker();
    caseInexactInvoker();
    caseLookupInvokers();
    caseReflectivePlaceholders();
    System.out.println("METHODHANDLE_INVOCATION_OK");
  }
}
