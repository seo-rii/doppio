package classes.modern_test;

import java.lang.Enum.EnumDesc;
import java.lang.constant.ClassDesc;
import java.lang.invoke.CallSite;
import java.lang.invoke.ConstantCallSite;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.runtime.SwitchBootstraps;

/** Direct calls to the common, final Java 21/25 public switch-bootstrap API. */
public class Java21SwitchBootstrapAPI {
  enum Shade {
    RED { @Override public String toString() { return "not-the-constant-name"; } },
    GREEN, BLUE
  }
  enum OtherShade { RED }
  enum LazyDescriptorShade {
    READY;
    static { descriptorInitializations++; }
  }
  enum LazyEnumShade {
    READY;
    static { enumInitializations++; }
  }

  private static int descriptorInitializations;
  private static int enumInitializations;
  private static int numericCalls;
  private static final IllegalStateException NUMERIC_FAILURE = new IllegalStateException("numeric failure");

  private static final class CustomNumber extends Number {
    private final int value;
    CustomNumber(int value) { this.value = value; }
    public int intValue() { numericCalls++; return value; }
    public long longValue() { return value; }
    public float floatValue() { return value; }
    public double doubleValue() { return value; }
  }

  private static final class ThrowingNumber extends Number {
    public int intValue() { throw NUMERIC_FAILURE; }
    public long longValue() { return 0; }
    public float floatValue() { return 0; }
    public double doubleValue() { return 0; }
  }

  private static final class ChangingNumber extends Number {
    private int calls;
    public int intValue() { return ++calls == 1 ? 66 : 65; }
    public long longValue() { return 66; }
    public float floatValue() { return 66; }
    public double doubleValue() { return 66; }
  }

  @FunctionalInterface
  private interface Action { void run() throws Throwable; }

  private static final MethodHandles.Lookup LOOKUP = MethodHandles.lookup();
  private static final MethodType TYPE_SWITCH = MethodType.methodType(int.class, Object.class, int.class);
  private static final MethodType ENUM_SWITCH = MethodType.methodType(int.class, Shade.class, int.class);
  private static final MethodType BOOTSTRAP = MethodType.methodType(CallSite.class,
      MethodHandles.Lookup.class, String.class, MethodType.class, Object[].class);
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

  private static void callSiteAndHandles() throws Throwable {
    CallSite site = SwitchBootstraps.typeSwitch(LOOKUP, "arbitraryName", TYPE_SWITCH,
        String.class, Number.class);
    MethodHandle target = site.getTarget();
    MethodHandle invoker = site.dynamicInvoker();
    require(site instanceof ConstantCallSite, "type bootstrap returns constant call site");
    require(site.type().equals(TYPE_SWITCH), "call-site type");
    require(target.type().equals(TYPE_SWITCH), "target type");
    require(invoker.type().equals(TYPE_SWITCH), "invoker type");
    require(site.getTarget() == target, "stable call-site target identity");
    require(invoker == target, "constant dynamic invoker identity");
    require(!target.isVarargsCollector(), "target has fixed arity");
    require((int) target.invokeExact((Object) "text", 0) == 0, "exact target invocation");
    require((int) invoker.invokeExact((Object) Integer.valueOf(7), 0) == 1,
        "exact dynamic invoker invocation");
    require((int) target.invoke("adapted", 0) == 0, "inexact reference adaptation");
    MethodHandle stringTarget = target.asType(MethodType.methodType(int.class, String.class, int.class));
    require((int) stringTarget.invokeExact("adapted", 0) == 0, "explicit reference adaptation");
    MethodHandle boxedTarget = target.asType(MethodType.methodType(Integer.class, Object.class, Integer.class));
    require(((Integer) boxedTarget.invokeExact((Object) "boxed", Integer.valueOf(0))).intValue() == 0,
        "explicit restart and return boxing adaptation");
    fails(UnsupportedOperationException.class, () -> site.setTarget(target), "constant call-site mutation");
    fails(java.lang.invoke.WrongMethodTypeException.class,
        () -> { int ignored = (int) target.invokeExact("wrong-exact-type", 0); }, "exact type mismatch");
    System.out.println("call-site-and-handles");
  }

  private static void typeLabelsAndRestart() throws Throwable {
    Object[] labels = { "needle", Integer.valueOf(65), CharSequence.class, Number.class,
        "needle", Object[].class };
    MethodHandle target = SwitchBootstraps.typeSwitch(LOOKUP, "typeSwitch", TYPE_SWITCH, labels).getTarget();
    require((int) target.invokeExact((Object) new String("needle"), 0) == 0, "string label equality");
    require((int) target.invokeExact((Object) Integer.valueOf(65), 0) == 1, "integer label equality");
    require((int) target.invokeExact((Object) new StringBuilder("needle"), 0) == 2, "interface class label");
    require((int) target.invokeExact((Object) Integer.valueOf(66), 0) == 3, "class label fallback");
    require((int) target.invokeExact((Object) new String[] { "item" }, 0) == 5, "array class label");
    require((int) target.invokeExact((Object) new Object(), 0) == 6, "unmatched target");
    require((int) target.invokeExact((Object) "needle", 1) == 2, "restart skips first label");
    require((int) target.invokeExact((Object) "needle", 3) == 4, "duplicate label after restart");
    require((int) target.invokeExact((Object) "needle", 5) == 6, "restart skips duplicates");
    require((int) target.invokeExact((Object) "needle", 6) == 6, "restart at label count");
    require((int) target.invokeExact((Object) null, 0) == -1, "null target");
    require((int) target.invokeExact((Object) null, 6) == -1, "null at last valid restart");
    for (Object selector : new Object[] { null, "needle" }) {
      for (int restart : new int[] { -1, 7, Integer.MIN_VALUE, Integer.MAX_VALUE }) {
        fails(IndexOutOfBoundsException.class, () -> {
          int ignored = (int) target.invokeExact(selector, restart);
        }, "type restart bounds");
      }
    }
    labels[0] = "changed";
    labels[1] = Integer.valueOf(99);
    labels[2] = null;
    require((int) target.invokeExact((Object) "needle", 0) == 0, "string label snapshot");
    require((int) target.invokeExact((Object) Integer.valueOf(65), 0) == 1, "integer label snapshot");
    require((int) target.invokeExact((Object) new StringBuilder(), 0) == 2, "class label snapshot");
    MethodHandle empty = SwitchBootstraps.typeSwitch(LOOKUP, "empty", TYPE_SWITCH).getTarget();
    require((int) empty.invokeExact((Object) new Object(), 0) == 0, "empty labels");
    require((int) empty.invokeExact((Object) null, 0) == -1, "empty labels null target");
    fails(IndexOutOfBoundsException.class,
        () -> { int ignored = (int) empty.invokeExact((Object) new Object(), 1); }, "empty label bounds");
    System.out.println("type-labels-and-restart");
  }

  private static void enumDescriptors() throws Throwable {
    ClassDesc shade = ClassDesc.of("classes.modern_test.Java21SwitchBootstrapAPI$Shade");
    ClassDesc otherShade = ClassDesc.of("classes.modern_test.Java21SwitchBootstrapAPI$OtherShade");
    EnumDesc<?> red = EnumDesc.of(shade, "RED");
    EnumDesc<?> otherRed = EnumDesc.of(otherShade, "RED");
    MethodHandle target = SwitchBootstraps.typeSwitch(LOOKUP, "descriptors", TYPE_SWITCH,
        red, otherRed, red, Shade.class).getTarget();
    require((int) target.invokeExact((Object) Shade.RED, 0) == 0, "enum descriptor label");
    require((int) target.invokeExact((Object) OtherShade.RED, 0) == 1, "descriptor enum type identity");
    require((int) target.invokeExact((Object) Shade.RED, 1) == 2, "duplicate descriptor and restart");
    require((int) target.invokeExact((Object) Shade.GREEN, 0) == 3, "enum descriptor class fallback");
    require((int) target.invokeExact((Object) "RED", 0) == 4, "enum descriptor is not a string label");
    require((int) target.invokeExact((Object) null, 0) == -1, "enum descriptor null target");
    MethodHandle missing = SwitchBootstraps.typeSwitch(LOOKUP, "unresolvedDescriptors", TYPE_SWITCH,
        EnumDesc.of(shade, "ABSENT"), EnumDesc.of(ClassDesc.of("java.lang.String"), "RED"),
        EnumDesc.of(ClassDesc.of("classes.modern_test.MissingSwitchEnum"), "RED"), red).getTarget();
    require((int) missing.invokeExact((Object) Shade.RED, 0) == 3, "invalid enum descriptors are nonmatching");
    require((int) missing.invokeExact((Object) Shade.GREEN, 0) == 4, "missing descriptor remains nonmatching");
    require((int) missing.invokeExact((Object) "RED", 0) == 4, "invalid descriptor non-enum selector");
    require((int) missing.invokeExact((Object) null, 0) == -1, "invalid descriptor null selector");
    System.out.println("enum-descriptors");
  }

  private static void integerLabelConversions() throws Throwable {
    MethodHandle target = SwitchBootstraps.typeSwitch(LOOKUP, "integerLabel", TYPE_SWITCH,
        Integer.valueOf(65), Number.class).getTarget();
    Object[] numbers = { Byte.valueOf((byte) 65), Short.valueOf((short) 65), Integer.valueOf(65),
        Long.valueOf(65), Float.valueOf(65.9f), Double.valueOf(65.9), Character.valueOf('A') };
    for (Object number : numbers) {
      require((int) target.invokeExact(number, 0) == 0, "integer constant numeric conversion");
    }
    require((int) target.invokeExact((Object) Character.valueOf('B'), 0) == 2, "unmatched character");
    numericCalls = 0;
    require((int) target.invokeExact((Object) new CustomNumber(65), 0) == 0 && numericCalls == 1,
        "custom Number intValue call");
    require((int) target.invokeExact((Object) new CustomNumber(66), 0) == 1 && numericCalls == 2,
        "custom Number class fallback");
    require((int) target.invokeExact((Object) new CustomNumber(65), 1) == 1 && numericCalls == 2,
        "restart skips numeric accessor");
    require((int) target.invokeExact((Object) null, 0) == -1 && numericCalls == 2,
        "null skips numeric accessor");
    try {
      int ignored = (int) target.invokeExact((Object) new ThrowingNumber(), 0);
      throw new AssertionError("numeric accessor exception not propagated");
    } catch (IllegalStateException expected) {
      require(expected == NUMERIC_FAILURE, "numeric accessor exception identity");
    }
    Integer repeated = Integer.valueOf(65);
    MethodHandle duplicates = SwitchBootstraps.typeSwitch(LOOKUP, "duplicateIntegerLabels", TYPE_SWITCH,
        repeated, repeated).getTarget();
    ChangingNumber changing = new ChangingNumber();
    require((int) duplicates.invokeExact((Object) changing, 0) == 2 && changing.calls == 1,
        "adjacent identical failed integer labels evaluate only once");
    require((int) duplicates.invokeExact((Object) changing, 1) == 1 && changing.calls == 2,
        "restart at duplicate reevaluates integer label");
    numericCalls = 0;
    require((int) duplicates.invokeExact((Object) new CustomNumber(66), 0) == 2 && numericCalls == 1,
        "stable nonmatching duplicate integer labels evaluate only once");
    System.out.println("integer-label-conversions");
  }

  private static void lazyEnumInitialization() throws Throwable {
    ClassDesc lazy = ClassDesc.of("classes.modern_test.Java21SwitchBootstrapAPI$LazyDescriptorShade");
    MethodHandle descriptor = SwitchBootstraps.typeSwitch(LOOKUP, "lazyDescriptor", TYPE_SWITCH,
        EnumDesc.of(lazy, "READY")).getTarget();
    require(descriptorInitializations == 0, "descriptor bootstrap does not initialize enum");
    require((int) descriptor.invokeExact((Object) null, 0) == -1 && descriptorInitializations == 0,
        "descriptor null target does not initialize enum");
    require((int) descriptor.invokeExact((Object) "READY", 0) == 1 && descriptorInitializations == 0,
        "descriptor non-enum target does not initialize enum");
    require((int) descriptor.invokeExact((Object) OtherShade.RED, 0) == 1 && descriptorInitializations == 0,
        "descriptor wrong enum target does not initialize label enum");
    Object ready = LazyDescriptorShade.READY;
    require(descriptorInitializations == 1, "descriptor enum initialized once by constant access");
    require((int) descriptor.invokeExact(ready, 0) == 0 && descriptorInitializations == 1,
        "descriptor matches after wrong enum target");
    require((int) descriptor.invokeExact(ready, 0) == 0 && descriptorInitializations == 1,
        "descriptor repeated match retains initialization count");
    MethodType enumType = MethodType.methodType(int.class, LazyEnumShade.class, int.class);
    MethodHandle enumTarget = SwitchBootstraps.enumSwitch(LOOKUP, "lazyEnum", enumType,
        "READY", LazyEnumShade.class).getTarget();
    require(enumInitializations == 0, "enum bootstrap does not initialize enum");
    require((int) enumTarget.invokeExact((LazyEnumShade) null, 0) == -1 && enumInitializations == 0,
        "enum null target does not initialize enum");
    require((int) enumTarget.invokeExact(LazyEnumShade.READY, 0) == 0 && enumInitializations == 1,
        "enum constant name initializes once");
    require((int) enumTarget.invokeExact(LazyEnumShade.READY, 1) == 1 && enumInitializations == 1,
        "enum class label retains initialization count");
    System.out.println("lazy-enum-initialization");
  }

  private static void enumLabelsAndRestart() throws Throwable {
    Object[] labels = { "RED", "RED", Shade.class, "GREEN", "ABSENT" };
    CallSite site = SwitchBootstraps.enumSwitch(LOOKUP, "notAnEnumConstant", ENUM_SWITCH, labels);
    MethodHandle target = site.getTarget();
    require(site instanceof ConstantCallSite, "enum bootstrap returns constant call site");
    require(site.type().equals(ENUM_SWITCH), "enum call-site type");
    require(target.type().equals(ENUM_SWITCH), "enum target type");
    require(site.dynamicInvoker() == target, "enum dynamic invoker identity");
    require((int) target.invokeExact(Shade.RED, 0) == 0, "enum string label");
    require(Shade.RED.getClass() != Shade.class, "constant-specific enum subclass");
    require(!Shade.RED.toString().equals(Shade.RED.name()), "enum toString differs from name");
    require((int) target.invokeExact(Shade.RED, 1) == 1, "duplicate enum label");
    require((int) target.invokeExact(Shade.RED, 2) == 2, "enum class label");
    require((int) target.invokeExact(Shade.GREEN, 3) == 3, "enum name after class label");
    require((int) target.invokeExact(Shade.BLUE, 0) == 2, "enum class fallback");
    require((int) target.invokeExact(Shade.BLUE, 3) == 5, "missing enum name is a nonmatching label");
    require((int) target.invokeExact(Shade.RED, 5) == 5, "enum restart at label count");
    require((int) target.invokeExact((Shade) null, 0) == -1, "enum null target");
    require((int) target.invokeExact((Shade) null, 5) == -1, "enum null at last valid restart");
    for (Shade selector : new Shade[] { null, Shade.RED }) {
      for (int restart : new int[] { -1, 6, Integer.MIN_VALUE, Integer.MAX_VALUE }) {
        fails(IndexOutOfBoundsException.class, () -> {
          int ignored = (int) target.invokeExact(selector, restart);
        }, "mixed-label enum restart bounds");
      }
    }
    labels[0] = "BLUE";
    labels[1] = null;
    labels[2] = OtherShade.class;
    require((int) target.invokeExact(Shade.RED, 0) == 0, "enum name label snapshot");
    require((int) target.invokeExact(Shade.RED, 1) == 1, "duplicate enum label snapshot");
    require((int) target.invokeExact(Shade.BLUE, 2) == 2, "enum class label snapshot");
    MethodHandle strings = SwitchBootstraps.enumSwitch(LOOKUP, "stringLabels", ENUM_SWITCH, "GREEN", "RED").getTarget();
    require((int) strings.invokeExact(Shade.GREEN, 0) == 0, "all-string enum labels");
    require((int) strings.invokeExact(Shade.RED, 0) == 1, "all-string enum second label");
    require((int) strings.invokeExact(Shade.BLUE, 0) == 2, "all-string enum unmatched");
    require((int) strings.invokeExact((Shade) null, 0) == -1, "all-string enum null target");
    MethodHandle empty = SwitchBootstraps.enumSwitch(LOOKUP, "empty", ENUM_SWITCH).getTarget();
    require((int) empty.invokeExact(Shade.RED, 0) == 0, "empty enum labels");
    require((int) empty.invokeExact((Shade) null, 0) == -1, "empty enum labels null target");
    System.out.println("enum-labels-and-restart");
  }

  private static void publicMetadataAndHandleLookup() throws Throwable {
    for (String name : new String[] { "typeSwitch", "enumSwitch" }) {
      Method method = SwitchBootstraps.class.getDeclaredMethod(name,
          MethodHandles.Lookup.class, String.class, MethodType.class, Object[].class);
      require(Modifier.isPublic(method.getModifiers()), "bootstrap is public");
      require(Modifier.isStatic(method.getModifiers()), "bootstrap is static");
      require(method.isVarArgs(), "bootstrap varargs reflection metadata");
      require(method.getReturnType() == CallSite.class, "bootstrap return type metadata");
      require(method.getDeclaringClass() == SwitchBootstraps.class, "bootstrap declaring class metadata");
      MethodHandle bootstrap = LOOKUP.findStatic(SwitchBootstraps.class, name, BOOTSTRAP);
      require(bootstrap.type().equals(BOOTSTRAP), "bootstrap descriptor");
      require(bootstrap.isVarargsCollector(), "bootstrap varargs method handle");
      MethodHandle fixed = bootstrap.asFixedArity();
      require(!fixed.isVarargsCollector(), "fixed-arity bootstrap method handle");
      MethodType type = name.equals("typeSwitch") ? TYPE_SWITCH : ENUM_SWITCH;
      Object[] labels = name.equals("typeSwitch") ? new Object[] { String.class } : new Object[] { "RED" };
      CallSite site = (CallSite) fixed.invokeExact(LOOKUP, name, type, labels);
      require(site.type().equals(type), "bootstrap method-handle invocation");
      int result = name.equals("typeSwitch")
          ? (int) site.dynamicInvoker().invokeExact((Object) "value", 0)
          : (int) site.dynamicInvoker().invokeExact(Shade.RED, 0);
      require(result == 0, "lookup-created bootstrap call-site invocation");
    }
    System.out.println("public-metadata-and-handle-lookup");
  }

  private static void invalidBootstrapArguments() throws Throwable {
    fails(NullPointerException.class, () -> SwitchBootstraps.typeSwitch(LOOKUP, "x", null),
        "null type-switch invocation type");
    fails(NullPointerException.class, () -> SwitchBootstraps.enumSwitch(LOOKUP, "x", null),
        "null enum-switch invocation type");
    fails(NullPointerException.class, () -> SwitchBootstraps.typeSwitch(LOOKUP, "x", TYPE_SWITCH, (Object[]) null),
        "null type labels array");
    fails(NullPointerException.class, () -> SwitchBootstraps.enumSwitch(LOOKUP, "x", ENUM_SWITCH, (Object[]) null),
        "null enum labels array");
    Object[][] invalidTypeLabels = { { null }, { new Object() }, { Shade.RED },
        { MethodType.methodType(void.class) }, { new Object[0] } };
    for (Object[] labels : invalidTypeLabels) {
      fails(IllegalArgumentException.class, () -> SwitchBootstraps.typeSwitch(LOOKUP, "x", TYPE_SWITCH, labels),
          "invalid type-switch label");
    }
    Object[][] invalidEnumLabels = { { null }, { Integer.valueOf(1) }, { Shade.RED },
        { Object.class }, { Enum.class }, { OtherShade.class },
        { EnumDesc.of(ClassDesc.of("classes.modern_test.Java21SwitchBootstrapAPI$Shade"), "RED") } };
    for (Object[] labels : invalidEnumLabels) {
      fails(IllegalArgumentException.class, () -> SwitchBootstraps.enumSwitch(LOOKUP, "x", ENUM_SWITCH, labels),
          "invalid enum-switch label");
    }
    for (String name : new String[] { "", "R.ED", "R/ED", "R;ED", "R[ED", "R<ED", "R>ED", "<RED>" }) {
      fails(IllegalArgumentException.class, () -> SwitchBootstraps.enumSwitch(LOOKUP, "x", ENUM_SWITCH, name),
          "malformed enum constant label");
    }
    for (String name : new String[] { "<init>", "<clinit>" }) {
      MethodHandle target = SwitchBootstraps.enumSwitch(LOOKUP, "x", ENUM_SWITCH, name).getTarget();
      require((int) target.invokeExact(Shade.RED, 0) == 1, "special member name is a nonmatching enum label");
      require((int) target.invokeExact((Shade) null, 0) == -1, "special member name null selector");
    }
    // Zero-arity and primitive-selector typeSwitch behavior differs between the native JDKs.
    MethodType[] invalidTypes = {
      MethodType.methodType(int.class, Object.class),
      MethodType.methodType(int.class, Object.class, int.class, int.class),
      MethodType.methodType(void.class, Object.class, int.class),
      MethodType.methodType(Object.class, Object.class, int.class),
      MethodType.methodType(int.class, Object.class, long.class)
    };
    for (MethodType type : invalidTypes) {
      fails(IllegalArgumentException.class, () -> SwitchBootstraps.typeSwitch(LOOKUP, "x", type),
          "invalid type-switch invocation type");
      fails(IllegalArgumentException.class, () -> SwitchBootstraps.enumSwitch(LOOKUP, "x", type),
          "invalid enum-switch invocation type");
    }
    fails(IllegalArgumentException.class, () -> SwitchBootstraps.enumSwitch(LOOKUP, "x", TYPE_SWITCH),
        "non-enum reference selector");
    fails(IllegalArgumentException.class,
        () -> SwitchBootstraps.enumSwitch(LOOKUP, "x", MethodType.methodType(int.class, int.class, int.class)),
        "primitive enum selector");
    System.out.println("invalid-bootstrap-arguments");
  }

  public static void main(String[] args) throws Throwable {
    callSiteAndHandles();
    typeLabelsAndRestart();
    integerLabelConversions();
    enumDescriptors();
    lazyEnumInitialization();
    enumLabelsAndRestart();
    publicMetadataAndHandleLookup();
    invalidBootstrapArguments();
    System.out.println("checks=" + checks);
  }
}
