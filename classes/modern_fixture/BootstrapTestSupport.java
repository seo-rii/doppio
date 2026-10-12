package classes.modern_test;

import java.lang.invoke.CallSite;
import java.lang.invoke.ConstantCallSite;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.invoke.MutableCallSite;
import java.lang.invoke.VolatileCallSite;
import java.util.HashMap;

/** User bootstraps shared by the original, carrier-free C4 class-file inputs. */
public final class BootstrapTestSupport {
  public static final long WIDE = 9007199254740993L;
  public static final RuntimeException RUNTIME = new IllegalArgumentException("user bootstrap failure");
  public static final Error ERROR = new AssertionError("user bootstrap error");
  public static Throwable accessFailure;
  public static MutableCallSite mutable;
  public static VolatileCallSite volatileSite;
  public static int recorded;
  private static final HashMap<String, Integer> COUNTS = new HashMap<String, Integer>();
  private static final MethodHandles.Lookup OWN = MethodHandles.lookup();

  public static void check(boolean value) {if (!value) throw new AssertionError("bootstrap invariant");}
  public static void emit(String id, String event) {
    System.out.println(new StringBuilder().append(id).append('=').append(event).toString());
  }
  public static int count(String name) {Integer value = COUNTS.get(name); return value == null ? 0 : value.intValue();}
  private static int enter(String name) {int result = count(name) + 1; COUNTS.put(name, Integer.valueOf(result)); return result;}
  private static void caller(MethodHandles.Lookup lookup, String name, Class<?> expected) {
    check(lookup.lookupClass().getName().startsWith("classes.modern_test.Bootstrap"));
    check((lookup.lookupModes() & MethodHandles.Lookup.PRIVATE) != 0);
    check(name != null && expected != null);
  }

  public static int constantInt(MethodHandles.Lookup lookup, String name, Class<?> type) {
    caller(lookup, name, type); enter(name); check(type == int.class); return 41;
  }
  public static long constantLong(MethodHandles.Lookup lookup, String name, Class<?> type) {
    caller(lookup, name, type); enter(name); check(type == long.class); return WIDE;
  }
  public static float constantFloat(MethodHandles.Lookup lookup, String name, Class<?> type) {
    caller(lookup, name, type); enter(name); check(type == float.class); return 1.5f;
  }
  public static double constantDouble(MethodHandles.Lookup lookup, String name, Class<?> type) {
    caller(lookup, name, type); enter(name); check(type == double.class); return 2.25d;
  }
  public static Object constant(MethodHandles.Lookup lookup, String name, Class<?> type) {
    caller(lookup, name, type); enter(name);
    if (name.equals("c_ref")) return new String("cached-reference");
    if (name.equals("c_box")) return Byte.valueOf((byte) 7);
    if (name.equals("c_boxlong")) return Integer.valueOf(9);
    if (name.equals("c_class")) return String.class;
    if (name.equals("c_cache")) return Integer.valueOf(73);
    if (name.equals("e_c_runtime") || name.equals("e_c_nested_leaf") || name.equals("e_i_nested_leaf")) throw RUNTIME;
    if (name.equals("e_c_error")) throw ERROR;
    if (name.equals("e_c_wrong")) return Integer.valueOf(17);
    return null;
  }
  public static long identityLong(long value) {return value;}
  public static long constantHandle(MethodHandles.Lookup lookup, String name, Class<?> type, MethodType expected, MethodHandle target) throws Throwable {
    caller(lookup, name, type); enter(name); check(expected.equals(MethodType.methodType(long.class, long.class)));
    check(target.type().equals(expected)); return (long) target.invokeExact(WIDE);
  }
  public static Object constantNested(MethodHandles.Lookup lookup, String name, Class<?> type, Object value) {
    caller(lookup, name, type); enter(name); check(value == null); return "nested:null";
  }
  public static long constantWide(MethodHandles.Lookup lookup, String name, Class<?> type, long value, double fraction) {
    caller(lookup, name, type); enter(name); check(value == WIDE && fraction == 2.25d); return value + 1L;
  }
  private static void arguments(Object[] values) throws Throwable {
    check(values.length == 9 && values[0].equals("static") && values[1].equals(Integer.valueOf(7)));
    check(values[2].equals(Long.valueOf(WIDE)) && values[3].equals(Float.valueOf(1.5f)) && values[4].equals(Double.valueOf(2.25d)));
    check(values[5] == String.class && values[6].equals(MethodType.methodType(long.class, long.class)));
    check((long) ((MethodHandle) values[7]).invokeExact(WIDE) == WIDE && values[8] == null);
  }
  public static Object constantVarargs(MethodHandles.Lookup lookup, String name, Class<?> type, Object... values) throws Throwable {
    caller(lookup, name, type); enter(name); arguments(values); return "varargs:9";
  }
  public static Object constantAdapted(MethodHandles.Lookup lookup, Object name, Object type, Object value) {
    caller(lookup, (String) name, (Class<?>) type); enter((String) name); check(value.equals("adapted")); return value;
  }
  public static Object constantPrivate(MethodHandles.Lookup lookup, String name, Class<?> type) throws Throwable {
    caller(lookup, name, type); enter(name);
    return (String) lookup.findStatic(lookup.lookupClass(), "secret", MethodType.methodType(String.class)).invokeExact();
  }
  public static Object constantInvalidLookup(Object lookup, String name, Class<?> type) {enter(name); return "must-not-run";}
  public static Object constantArity(MethodHandles.Lookup lookup, String name, Class<?> type, int absent) {enter(name); return "must-not-run";}
  private static String secret() {return "not-authorized";}
  public static Object constantDenied(MethodHandles.Lookup lookup, String name, Class<?> type) throws Throwable {
    enter(name);
    try {return (String) lookup.findStatic(BootstrapTestSupport.class, "secret", MethodType.methodType(String.class)).invokeExact();}
    catch (Throwable failure) {accessFailure = failure; throw failure;}
  }
  public static Object constantNestedFailure(MethodHandles.Lookup lookup, String name, Class<?> type, Object failed) {enter(name); return "must-not-run";}

  private static MethodHandle fixedInt(int value) {return MethodHandles.constant(int.class, Integer.valueOf(value));}
  private static int narrow(byte value, int increment) {return value + increment;}
  private static long wide(long value, double fraction) {check(fraction == 2.25d); return value + 1L;}
  private static String reference(String value) {return value;}
  private static void record(int value) {recorded = value;}
  private static int targetError() {throw ERROR;}
  public static CallSite site(MethodHandles.Lookup lookup, String name, MethodType type) throws Throwable {
    caller(lookup, name, type.returnType()); int count = enter(name); MethodHandle target;
    if (name.equals("e_i_runtime") || name.equals("e_i_lexical")) throw RUNTIME;
    if (name.equals("e_i_error")) throw ERROR;
    if (name.equals("e_i_null")) return null;
    if (name.equals("e_i_target")) return new ConstantCallSite(MethodHandles.constant(String.class, "wrong-target"));
    if (name.equals("i_narrow")) target = OWN.findStatic(BootstrapTestSupport.class, "narrow", MethodType.methodType(int.class, byte.class, int.class));
    else if (name.equals("i_wide")) target = OWN.findStatic(BootstrapTestSupport.class, "wide", MethodType.methodType(long.class, long.class, double.class));
    else if (name.equals("i_reference")) target = OWN.findStatic(BootstrapTestSupport.class, "reference", MethodType.methodType(String.class, String.class)).asType(type);
    else if (name.equals("i_void")) target = OWN.findStatic(BootstrapTestSupport.class, "record", MethodType.methodType(void.class, int.class));
    else if (name.equals("i_null")) target = MethodHandles.identity(String.class);
    else if (name.equals("i_private")) target = lookup.findStatic(lookup.lookupClass(), "secret", type);
    else if (name.equals("i_mutable")) {mutable = new MutableCallSite(fixedInt(1)); return mutable;}
    else if (name.equals("i_volatile")) {volatileSite = new VolatileCallSite(fixedInt(3)); return volatileSite;}
    else if (name.equals("i_target_error")) target = OWN.findStatic(BootstrapTestSupport.class, "targetError", type);
    else if (name.equals("i_lex_twice") || name.equals("i_lex_methods")) target = fixedInt(count);
    else target = fixedInt(19);
    return new ConstantCallSite(target);
  }
  public static Object siteAdapted(Object lookup, Object name, Object type) throws Throwable {
    return site((MethodHandles.Lookup) lookup, (String) name, (MethodType) type);
  }
  public static CallSite siteVarargs(MethodHandles.Lookup lookup, String name, MethodType type, Object... values) throws Throwable {
    caller(lookup, name, type.returnType()); enter(name); arguments(values);
    return new ConstantCallSite(MethodHandles.constant(String.class, "varargs:9"));
  }
  public static CallSite siteHandle(MethodHandles.Lookup lookup, String name, MethodType type, MethodType expected, MethodHandle target) {
    caller(lookup, name, type.returnType()); enter(name); check(type.equals(expected) && target.type().equals(type)); return new ConstantCallSite(target);
  }
  public static Object siteWrong(MethodHandles.Lookup lookup, String name, MethodType type) {enter(name); return "not-a-site";}
  public static CallSite siteArity(MethodHandles.Lookup lookup, String name, MethodType type, int absent) {enter(name); return new ConstantCallSite(fixedInt(absent));}
  public static CallSite siteNestedFailure(MethodHandles.Lookup lookup, String name, MethodType type, Object failed) {enter(name); return new ConstantCallSite(fixedInt(0));}
  private static MethodHandle constructed(String name, int value) {enter(name); return fixedInt(value);}
  public static final class ConstructedSite extends ConstantCallSite {
    public ConstructedSite(MethodHandles.Lookup lookup, String name, MethodType type, int value) {
      super(constructed(name, value)); caller(lookup, name, type.returnType()); check(type.equals(MethodType.methodType(int.class)));
    }
  }
}
