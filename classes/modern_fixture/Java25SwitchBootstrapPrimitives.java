package classes.modern_test;

import java.io.Serializable;
import java.lang.invoke.CallSite;
import java.lang.invoke.ConstantCallSite;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.runtime.SwitchBootstraps;

/**
 * Final Java 25 public switch-bootstrap calls with identity primitive Class labels.
 * No primitive source patterns, preview constant labels, or cross-primitive conversions.
 */
public class Java25SwitchBootstrapPrimitives {
  @FunctionalInterface
  private interface Action { void run() throws Throwable; }

  private static final MethodHandles.Lookup LOOKUP = MethodHandles.lookup();
  private static final MethodType OBJECT_SWITCH = MethodType.methodType(int.class, Object.class, int.class);
  private static final int[] INVALID_RESTARTS = { -1, 5, Integer.MIN_VALUE, Integer.MAX_VALUE };
  private static int checks;

  private static void require(boolean condition, String label) {
    if (!condition) throw new AssertionError(label);
    checks++;
  }

  private static void fails(Class<? extends Throwable> expected, Action action, String label) throws Throwable {
    try {
      action.run();
    } catch (Throwable actual) {
      require(actual.getClass() == expected, label + ": " + actual.getClass().getName());
      return;
    }
    throw new AssertionError(label + " accepted");
  }

  private static CallSite identitySite(Class<?> selector, Class<?> primitive, Class<?> wrapper) {
    MethodType type = MethodType.methodType(int.class, selector, int.class);
    Object[] labels = { String.class, primitive, wrapper, primitive };
    CallSite site = SwitchBootstraps.typeSwitch(LOOKUP, "identity", type, labels);
    MethodHandle target = site.getTarget();
    require(site instanceof ConstantCallSite, "constant call site");
    require(site.type().equals(type), "call-site method type");
    require(target.type().equals(type), "target method type");
    require(site.dynamicInvoker().type().equals(type), "dynamic invoker method type");
    require(site.getTarget() == target, "stable target identity");
    require(site.dynamicInvoker() == target, "constant invoker identity");
    require(!target.isVarargsCollector(), "fixed arity");
    // The call site must retain the original labels rather than this caller-owned array.
    labels[1] = null;
    labels[2] = String.class;
    labels[3] = Object.class;
    return site;
  }

  private static void objectSelector(Class<?> primitive, Class<?> wrapper, Object value) throws Throwable {
    CallSite site = identitySite(Object.class, primitive, wrapper);
    MethodHandle target = site.getTarget();
    require((int) target.invokeExact(value, 0) == 1, "Object selector primitive Class label");
    require((int) target.invokeExact(value, 2) == 2, "Object selector wrapper Class label");
    require((int) target.invokeExact(value, 3) == 3, "Object selector duplicate primitive Class label");
    require((int) target.invokeExact(value, 4) == 4, "Object selector exhausted restart");
    require((int) site.dynamicInvoker().invokeExact(value, 0) == 1, "Object selector dynamic invoker");
    require((int) target.invokeExact((Object) new Object(), 0) == 4, "Object selector no match");
    for (Object other : new Object[] { Boolean.TRUE, Byte.valueOf((byte) 1), Character.valueOf('A'),
        Short.valueOf((short) 1), Integer.valueOf(1), Long.valueOf(1L), Float.valueOf(1.0f),
        Double.valueOf(1.0) }) {
      if (other.getClass() != wrapper) {
        require((int) target.invokeExact(other, 0) == 4, "Object selector rejects other boxed types");
      }
    }
    require((int) target.invokeExact((Object) null, 0) == -1, "Object selector null");
    require((int) target.invokeExact((Object) null, 4) == -1, "Object selector null at exhausted restart");
    for (int restart : INVALID_RESTARTS) {
      fails(IndexOutOfBoundsException.class,
          () -> { int ignored = (int) target.invokeExact(value, restart); }, "Object selector restart bounds");
      fails(IndexOutOfBoundsException.class,
          () -> { int ignored = (int) target.invokeExact((Object) null, restart); }, "bounds before null");
    }
    MethodHandle empty = SwitchBootstraps.typeSwitch(LOOKUP, "emptyObject", OBJECT_SWITCH).getTarget();
    require((int) empty.invokeExact(value, 0) == 0, "Object selector empty labels");
    require((int) empty.invokeExact((Object) null, 0) == -1, "Object selector empty null");
    fails(IndexOutOfBoundsException.class,
        () -> { int ignored = (int) empty.invokeExact((Object) null, 1); }, "empty bounds before null");
  }

  private static void primitiveBoolean() throws Throwable {
    CallSite site = identitySite(boolean.class, boolean.class, Boolean.class);
    MethodHandle target = site.getTarget();
    MethodHandle invoker = site.dynamicInvoker();
    boolean[] values = new boolean[] { false, true };
    for (boolean value : values) {
      require((int) target.invokeExact(value, 0) == 1, "boolean primitive Class label");
      require((int) target.invokeExact(value, 2) == 2, "boolean wrapper Class label");
      require((int) target.invokeExact(value, 3) == 3, "boolean duplicate and restart");
      require((int) target.invokeExact(value, 4) == 4, "boolean exhausted restart");
      require((int) invoker.invokeExact(value, 0) == 1, "boolean typed dynamic invoker");
    }
    Boolean boxed = Boolean.valueOf(true);
    MethodHandle adapted = target.asType(OBJECT_SWITCH);
    require((int) adapted.invokeExact((Object) boxed, 0) == 1, "boolean Object adaptation");
    require((int) target.invoke(boxed, 0) == 1, "boolean boxed inexact invocation");
    boolean value = values[0];
    for (int restart : INVALID_RESTARTS) {
      fails(IndexOutOfBoundsException.class,
          () -> { int ignored = (int) target.invokeExact(value, restart); }, "boolean restart bounds");
    }
    MethodType type = MethodType.methodType(int.class, boolean.class, int.class);
    MethodHandle missing = SwitchBootstraps.typeSwitch(LOOKUP, "noMatch", type, String.class).getTarget();
    require((int) missing.invokeExact(value, 0) == 1, "boolean no matching Class label");
    MethodHandle empty = SwitchBootstraps.typeSwitch(LOOKUP, "empty", type).getTarget();
    require((int) empty.invokeExact(value, 0) == 0, "boolean empty labels");
    fails(IndexOutOfBoundsException.class,
        () -> { int ignored = (int) empty.invokeExact(value, 1); }, "boolean empty bounds");
    objectSelector(boolean.class, Boolean.class, boxed);
    System.out.println("primitive-boolean");
  }

  private static void primitiveByte() throws Throwable {
    CallSite site = identitySite(byte.class, byte.class, Byte.class);
    MethodHandle target = site.getTarget();
    MethodHandle invoker = site.dynamicInvoker();
    byte[] values = new byte[] { Byte.MIN_VALUE, -1, 0, 1, Byte.MAX_VALUE };
    for (byte value : values) {
      require((int) target.invokeExact(value, 0) == 1, "byte primitive Class label");
      require((int) target.invokeExact(value, 2) == 2, "byte wrapper Class label");
      require((int) target.invokeExact(value, 3) == 3, "byte duplicate and restart");
      require((int) target.invokeExact(value, 4) == 4, "byte exhausted restart");
      require((int) invoker.invokeExact(value, 0) == 1, "byte typed dynamic invoker");
    }
    Byte boxed = Byte.valueOf((byte) -7);
    MethodHandle adapted = target.asType(OBJECT_SWITCH);
    require((int) adapted.invokeExact((Object) boxed, 0) == 1, "byte Object adaptation");
    require((int) target.invoke(boxed, 0) == 1, "byte boxed inexact invocation");
    byte value = values[0];
    for (int restart : INVALID_RESTARTS) {
      fails(IndexOutOfBoundsException.class,
          () -> { int ignored = (int) target.invokeExact(value, restart); }, "byte restart bounds");
    }
    MethodType type = MethodType.methodType(int.class, byte.class, int.class);
    MethodHandle missing = SwitchBootstraps.typeSwitch(LOOKUP, "noMatch", type, String.class).getTarget();
    require((int) missing.invokeExact(value, 0) == 1, "byte no matching Class label");
    MethodHandle booleanLabels = SwitchBootstraps.typeSwitch(LOOKUP, "notBoolean", type,
        boolean.class, Boolean.class).getTarget();
    require((int) booleanLabels.invokeExact(value, 0) == 2, "byte rejects boolean Class labels");
    MethodHandle empty = SwitchBootstraps.typeSwitch(LOOKUP, "empty", type).getTarget();
    require((int) empty.invokeExact(value, 0) == 0, "byte empty labels");
    fails(IndexOutOfBoundsException.class,
        () -> { int ignored = (int) empty.invokeExact(value, 1); }, "byte empty bounds");
    objectSelector(byte.class, Byte.class, boxed);
    System.out.println("primitive-byte");
  }

  private static void primitiveCharacter() throws Throwable {
    CallSite site = identitySite(char.class, char.class, Character.class);
    MethodHandle target = site.getTarget();
    MethodHandle invoker = site.dynamicInvoker();
    char[] values = new char[] { Character.MIN_VALUE, 1, 'A', 32768, Character.MAX_VALUE };
    for (char value : values) {
      require((int) target.invokeExact(value, 0) == 1, "char primitive Class label");
      require((int) target.invokeExact(value, 2) == 2, "char wrapper Class label");
      require((int) target.invokeExact(value, 3) == 3, "char duplicate and restart");
      require((int) target.invokeExact(value, 4) == 4, "char exhausted restart");
      require((int) invoker.invokeExact(value, 0) == 1, "char typed dynamic invoker");
    }
    Character boxed = Character.valueOf('A');
    MethodHandle adapted = target.asType(OBJECT_SWITCH);
    require((int) adapted.invokeExact((Object) boxed, 0) == 1, "char Object adaptation");
    require((int) target.invoke(boxed, 0) == 1, "char boxed inexact invocation");
    char value = values[0];
    for (int restart : INVALID_RESTARTS) {
      fails(IndexOutOfBoundsException.class,
          () -> { int ignored = (int) target.invokeExact(value, restart); }, "char restart bounds");
    }
    MethodType type = MethodType.methodType(int.class, char.class, int.class);
    MethodHandle missing = SwitchBootstraps.typeSwitch(LOOKUP, "noMatch", type, String.class).getTarget();
    require((int) missing.invokeExact(value, 0) == 1, "char no matching Class label");
    MethodHandle booleanLabels = SwitchBootstraps.typeSwitch(LOOKUP, "notBoolean", type,
        boolean.class, Boolean.class).getTarget();
    require((int) booleanLabels.invokeExact(value, 0) == 2, "char rejects boolean Class labels");
    MethodHandle empty = SwitchBootstraps.typeSwitch(LOOKUP, "empty", type).getTarget();
    require((int) empty.invokeExact(value, 0) == 0, "char empty labels");
    fails(IndexOutOfBoundsException.class,
        () -> { int ignored = (int) empty.invokeExact(value, 1); }, "char empty bounds");
    objectSelector(char.class, Character.class, boxed);
    System.out.println("primitive-char");
  }

  private static void primitiveShort() throws Throwable {
    CallSite site = identitySite(short.class, short.class, Short.class);
    MethodHandle target = site.getTarget();
    MethodHandle invoker = site.dynamicInvoker();
    short[] values = new short[] { Short.MIN_VALUE, -1, 0, 1, Short.MAX_VALUE };
    for (short value : values) {
      require((int) target.invokeExact(value, 0) == 1, "short primitive Class label");
      require((int) target.invokeExact(value, 2) == 2, "short wrapper Class label");
      require((int) target.invokeExact(value, 3) == 3, "short duplicate and restart");
      require((int) target.invokeExact(value, 4) == 4, "short exhausted restart");
      require((int) invoker.invokeExact(value, 0) == 1, "short typed dynamic invoker");
    }
    Short boxed = Short.valueOf((short) -17);
    MethodHandle adapted = target.asType(OBJECT_SWITCH);
    require((int) adapted.invokeExact((Object) boxed, 0) == 1, "short Object adaptation");
    require((int) target.invoke(boxed, 0) == 1, "short boxed inexact invocation");
    short value = values[0];
    for (int restart : INVALID_RESTARTS) {
      fails(IndexOutOfBoundsException.class,
          () -> { int ignored = (int) target.invokeExact(value, restart); }, "short restart bounds");
    }
    MethodType type = MethodType.methodType(int.class, short.class, int.class);
    MethodHandle missing = SwitchBootstraps.typeSwitch(LOOKUP, "noMatch", type, String.class).getTarget();
    require((int) missing.invokeExact(value, 0) == 1, "short no matching Class label");
    MethodHandle booleanLabels = SwitchBootstraps.typeSwitch(LOOKUP, "notBoolean", type,
        boolean.class, Boolean.class).getTarget();
    require((int) booleanLabels.invokeExact(value, 0) == 2, "short rejects boolean Class labels");
    MethodHandle empty = SwitchBootstraps.typeSwitch(LOOKUP, "empty", type).getTarget();
    require((int) empty.invokeExact(value, 0) == 0, "short empty labels");
    fails(IndexOutOfBoundsException.class,
        () -> { int ignored = (int) empty.invokeExact(value, 1); }, "short empty bounds");
    objectSelector(short.class, Short.class, boxed);
    System.out.println("primitive-short");
  }

  private static void primitiveInteger() throws Throwable {
    CallSite site = identitySite(int.class, int.class, Integer.class);
    MethodHandle target = site.getTarget();
    MethodHandle invoker = site.dynamicInvoker();
    int[] values = new int[] { Integer.MIN_VALUE, -65536, -1, 0, 1, 65536, Integer.MAX_VALUE };
    for (int value : values) {
      require((int) target.invokeExact(value, 0) == 1, "int primitive Class label");
      require((int) target.invokeExact(value, 2) == 2, "int wrapper Class label");
      require((int) target.invokeExact(value, 3) == 3, "int duplicate and restart");
      require((int) target.invokeExact(value, 4) == 4, "int exhausted restart");
      require((int) invoker.invokeExact(value, 0) == 1, "int typed dynamic invoker");
    }
    Integer boxed = Integer.valueOf(-65536);
    MethodHandle adapted = target.asType(OBJECT_SWITCH);
    require((int) adapted.invokeExact((Object) boxed, 0) == 1, "int Object adaptation");
    require((int) target.invoke(boxed, 0) == 1, "int boxed inexact invocation");
    int value = values[0];
    for (int restart : INVALID_RESTARTS) {
      fails(IndexOutOfBoundsException.class,
          () -> { int ignored = (int) target.invokeExact(value, restart); }, "int restart bounds");
    }
    MethodType type = MethodType.methodType(int.class, int.class, int.class);
    MethodHandle missing = SwitchBootstraps.typeSwitch(LOOKUP, "noMatch", type, String.class).getTarget();
    require((int) missing.invokeExact(value, 0) == 1, "int no matching Class label");
    MethodHandle booleanLabels = SwitchBootstraps.typeSwitch(LOOKUP, "notBoolean", type,
        boolean.class, Boolean.class).getTarget();
    require((int) booleanLabels.invokeExact(value, 0) == 2, "int rejects boolean Class labels");
    MethodHandle empty = SwitchBootstraps.typeSwitch(LOOKUP, "empty", type).getTarget();
    require((int) empty.invokeExact(value, 0) == 0, "int empty labels");
    fails(IndexOutOfBoundsException.class,
        () -> { int ignored = (int) empty.invokeExact(value, 1); }, "int empty bounds");
    objectSelector(int.class, Integer.class, boxed);
    System.out.println("primitive-int");
  }

  private static void primitiveLong() throws Throwable {
    CallSite site = identitySite(long.class, long.class, Long.class);
    MethodHandle target = site.getTarget();
    MethodHandle invoker = site.dynamicInvoker();
    long[] values = new long[] { Long.MIN_VALUE, -4294967297L, -1L, 0L, 1L, 4294967297L, Long.MAX_VALUE };
    for (long value : values) {
      require((int) target.invokeExact(value, 0) == 1, "long primitive Class label");
      require((int) target.invokeExact(value, 2) == 2, "long wrapper Class label");
      require((int) target.invokeExact(value, 3) == 3, "long duplicate and restart");
      require((int) target.invokeExact(value, 4) == 4, "long exhausted restart");
      require((int) invoker.invokeExact(value, 0) == 1, "long typed dynamic invoker");
    }
    Long boxed = Long.valueOf(-4294967297L);
    MethodHandle adapted = target.asType(OBJECT_SWITCH);
    require((int) adapted.invokeExact((Object) boxed, 0) == 1, "long Object adaptation");
    require((int) target.invoke(boxed, 0) == 1, "long boxed inexact invocation");
    long value = values[0];
    for (int restart : INVALID_RESTARTS) {
      fails(IndexOutOfBoundsException.class,
          () -> { int ignored = (int) target.invokeExact(value, restart); }, "long restart bounds");
    }
    MethodType type = MethodType.methodType(int.class, long.class, int.class);
    MethodHandle missing = SwitchBootstraps.typeSwitch(LOOKUP, "noMatch", type, String.class).getTarget();
    require((int) missing.invokeExact(value, 0) == 1, "long no matching Class label");
    MethodHandle booleanLabels = SwitchBootstraps.typeSwitch(LOOKUP, "notBoolean", type,
        boolean.class, Boolean.class).getTarget();
    require((int) booleanLabels.invokeExact(value, 0) == 2, "long rejects boolean Class labels");
    MethodHandle empty = SwitchBootstraps.typeSwitch(LOOKUP, "empty", type).getTarget();
    require((int) empty.invokeExact(value, 0) == 0, "long empty labels");
    fails(IndexOutOfBoundsException.class,
        () -> { int ignored = (int) empty.invokeExact(value, 1); }, "long empty bounds");
    objectSelector(long.class, Long.class, boxed);
    System.out.println("primitive-long");
  }

  private static void primitiveFloat() throws Throwable {
    CallSite site = identitySite(float.class, float.class, Float.class);
    MethodHandle target = site.getTarget();
    MethodHandle invoker = site.dynamicInvoker();
    float[] values = new float[] { -Float.MAX_VALUE, -1.5f, -0.0f, 0.0f, Float.MIN_VALUE, Float.MAX_VALUE, Float.NaN, Float.NEGATIVE_INFINITY, Float.POSITIVE_INFINITY };
    for (float value : values) {
      require((int) target.invokeExact(value, 0) == 1, "float primitive Class label");
      require((int) target.invokeExact(value, 2) == 2, "float wrapper Class label");
      require((int) target.invokeExact(value, 3) == 3, "float duplicate and restart");
      require((int) target.invokeExact(value, 4) == 4, "float exhausted restart");
      require((int) invoker.invokeExact(value, 0) == 1, "float typed dynamic invoker");
    }
    Float boxed = Float.valueOf(-1.5f);
    MethodHandle adapted = target.asType(OBJECT_SWITCH);
    require((int) adapted.invokeExact((Object) boxed, 0) == 1, "float Object adaptation");
    require((int) target.invoke(boxed, 0) == 1, "float boxed inexact invocation");
    float value = values[0];
    for (int restart : INVALID_RESTARTS) {
      fails(IndexOutOfBoundsException.class,
          () -> { int ignored = (int) target.invokeExact(value, restart); }, "float restart bounds");
    }
    MethodType type = MethodType.methodType(int.class, float.class, int.class);
    MethodHandle missing = SwitchBootstraps.typeSwitch(LOOKUP, "noMatch", type, String.class).getTarget();
    require((int) missing.invokeExact(value, 0) == 1, "float no matching Class label");
    MethodHandle booleanLabels = SwitchBootstraps.typeSwitch(LOOKUP, "notBoolean", type,
        boolean.class, Boolean.class).getTarget();
    require((int) booleanLabels.invokeExact(value, 0) == 2, "float rejects boolean Class labels");
    MethodHandle empty = SwitchBootstraps.typeSwitch(LOOKUP, "empty", type).getTarget();
    require((int) empty.invokeExact(value, 0) == 0, "float empty labels");
    fails(IndexOutOfBoundsException.class,
        () -> { int ignored = (int) empty.invokeExact(value, 1); }, "float empty bounds");
    objectSelector(float.class, Float.class, boxed);
    System.out.println("primitive-float");
  }

  private static void primitiveDouble() throws Throwable {
    CallSite site = identitySite(double.class, double.class, Double.class);
    MethodHandle target = site.getTarget();
    MethodHandle invoker = site.dynamicInvoker();
    double[] values = new double[] { -Double.MAX_VALUE, -1.5, -0.0, 0.0, Double.MIN_VALUE, Double.MAX_VALUE, Double.NaN, Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY };
    for (double value : values) {
      require((int) target.invokeExact(value, 0) == 1, "double primitive Class label");
      require((int) target.invokeExact(value, 2) == 2, "double wrapper Class label");
      require((int) target.invokeExact(value, 3) == 3, "double duplicate and restart");
      require((int) target.invokeExact(value, 4) == 4, "double exhausted restart");
      require((int) invoker.invokeExact(value, 0) == 1, "double typed dynamic invoker");
    }
    Double boxed = Double.valueOf(-1.5);
    MethodHandle adapted = target.asType(OBJECT_SWITCH);
    require((int) adapted.invokeExact((Object) boxed, 0) == 1, "double Object adaptation");
    require((int) target.invoke(boxed, 0) == 1, "double boxed inexact invocation");
    double value = values[0];
    for (int restart : INVALID_RESTARTS) {
      fails(IndexOutOfBoundsException.class,
          () -> { int ignored = (int) target.invokeExact(value, restart); }, "double restart bounds");
    }
    MethodType type = MethodType.methodType(int.class, double.class, int.class);
    MethodHandle missing = SwitchBootstraps.typeSwitch(LOOKUP, "noMatch", type, String.class).getTarget();
    require((int) missing.invokeExact(value, 0) == 1, "double no matching Class label");
    MethodHandle booleanLabels = SwitchBootstraps.typeSwitch(LOOKUP, "notBoolean", type,
        boolean.class, Boolean.class).getTarget();
    require((int) booleanLabels.invokeExact(value, 0) == 2, "double rejects boolean Class labels");
    MethodHandle empty = SwitchBootstraps.typeSwitch(LOOKUP, "empty", type).getTarget();
    require((int) empty.invokeExact(value, 0) == 0, "double empty labels");
    fails(IndexOutOfBoundsException.class,
        () -> { int ignored = (int) empty.invokeExact(value, 1); }, "double empty bounds");
    objectSelector(double.class, Double.class, boxed);
    System.out.println("primitive-double");
  }

  private static void booleanRestrictions() throws Throwable {
    MethodType type = MethodType.methodType(int.class, boolean.class, int.class);
    MethodHandle target = SwitchBootstraps.typeSwitch(LOOKUP, "booleanClasses", type,
        Object.class, Number.class, Serializable.class, Comparable.class,
        boolean.class, Boolean.class).getTarget();
    for (boolean value : new boolean[] { false, true }) {
      require((int) target.invokeExact(value, 0) == 4, "boolean skips non-Boolean reference labels");
      require((int) target.invokeExact(value, 5) == 5, "boolean wrapper label after restart");
      require((int) target.invokeExact(value, 6) == 6, "boolean restricted labels exhausted");
    }
    System.out.println("boolean-label-restrictions");
  }

  public static void main(String[] args) throws Throwable {
    require(args.length == 0, "no fixture arguments");
    primitiveBoolean();
    primitiveByte();
    primitiveCharacter();
    primitiveShort();
    primitiveInteger();
    primitiveLong();
    primitiveFloat();
    primitiveDouble();
    booleanRestrictions();
    System.out.println("checks=" + checks);
  }
}
