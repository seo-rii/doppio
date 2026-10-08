package classes.modern_test;

import java.lang.invoke.CallSite;
import java.lang.invoke.ConstantCallSite;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.lang.runtime.SwitchBootstraps;

/**
 * Pinned Java 25 numeric primitive Class-label behavior of public typeSwitch.
 * Expected masks are fixed value tables, not casts or runtime conversion predicates.
 * No preview flags, primitive source patterns, constant labels, or reference selectors.
 */
public class Java25SwitchBootstrapExactConversions {
  private static final MethodHandles.Lookup LOOKUP = MethodHandles.lookup();
  private static final Class<?>[] TYPES = {
      byte.class, char.class, short.class, int.class, long.class, float.class, double.class
  };
  // Expected-mask bits use the same B/C/S/I/J/F/D order as TYPES.
  private static final int B = 1, C = 2, S = 4, I = 8, J = 16, F = 32, D = 64;
  private static final int ALL = B | C | S | I | J | F | D;
  private static final int SIGNED = B | S | I | J | F | D;
  private static final int CHAR_SHORT = C | S | I | J | F | D;
  private static final int SHORT = S | I | J | F | D;
  private static final int CHAR = C | I | J | F | D;
  private static final int INT = I | J | F | D;
  private static final int INT_DOUBLE = I | J | D;
  private static final int LONG = J | F | D;
  private static final int LONG_DOUBLE = J | D;
  private static final int FLOATING = F | D;
  // Repeat float and double labels to exercise restart across duplicate matches.
  private static final int[] ORDER = { 0, 1, 2, 3, 4, 5, 6, 5, 6 };
  private static int checks;

  private static final class Value {
    final Object value;
    final int mask;

    Value(Object value, int mask) {
      this.value = value;
      this.mask = mask;
    }
  }

  private static void require(boolean condition, String label) {
    if (!condition) throw new AssertionError(label);
    checks++;
  }

  private static MethodHandle site(Class<?> selectorType, Object... labels) {
    MethodType type = MethodType.methodType(int.class, selectorType, int.class);
    CallSite site = SwitchBootstraps.typeSwitch(LOOKUP, "exactConversions", type, labels);
    MethodHandle target = site.getTarget();
    require(site instanceof ConstantCallSite, "constant call site");
    require(site.type().equals(type), "call-site method type");
    require(target.type().equals(type), "exact target method type");
    require(site.dynamicInvoker().type().equals(type), "exact dynamic invoker method type");
    require(site.dynamicInvoker() == target, "constant invoker identity");
    require(!target.isVarargsCollector(), "fixed arity target");
    // Changing the caller-owned label array must not change this call site.
    for (int index = 0; index < labels.length; index++) labels[index] = String.class;
    return target;
  }

  private static int invoke(MethodHandle target, Class<?> type, Object value, int restart) throws Throwable {
    if (type == byte.class) {
      byte typed = ((Byte) value).byteValue();
      return (int) target.invokeExact(typed, restart);
    } else if (type == char.class) {
      char typed = ((Character) value).charValue();
      return (int) target.invokeExact(typed, restart);
    } else if (type == short.class) {
      short typed = ((Short) value).shortValue();
      return (int) target.invokeExact(typed, restart);
    } else if (type == int.class) {
      int typed = ((Integer) value).intValue();
      return (int) target.invokeExact(typed, restart);
    } else if (type == long.class) {
      long typed = ((Long) value).longValue();
      return (int) target.invokeExact(typed, restart);
    } else if (type == float.class) {
      float typed = ((Float) value).floatValue();
      return (int) target.invokeExact(typed, restart);
    } else {
      double typed = ((Double) value).doubleValue();
      return (int) target.invokeExact(typed, restart);
    }
  }

  private static int firstMatch(int mask, int restart) {
    for (int index = restart; index < ORDER.length; index++) {
      if ((mask & (1 << ORDER[index])) != 0) return index;
    }
    return ORDER.length;
  }

  private static void selector(Class<?> type, Value[] values) throws Throwable {
    MethodHandle[] pairs = new MethodHandle[TYPES.length];
    for (int index = 0; index < TYPES.length; index++) pairs[index] = site(type, TYPES[index]);
    Object[] labels = new Object[ORDER.length];
    for (int index = 0; index < labels.length; index++) labels[index] = TYPES[ORDER[index]];
    MethodHandle combined = site(type, labels);
    MethodHandle empty = site(type);
    for (int row = 0; row < values.length; row++) {
      Value value = values[row];
      for (int column = 0; column < TYPES.length; column++) {
        int expected = (value.mask & (1 << column)) == 0 ? 1 : 0;
        require(invoke(pairs[column], type, value.value, 0) == expected,
            type.getName() + " row " + row + " to " + TYPES[column].getName());
      }
      for (int restart = 0; restart <= ORDER.length; restart++) {
        require(invoke(combined, type, value.value, restart) == firstMatch(value.mask, restart),
            type.getName() + " row " + row + " restart " + restart);
      }
      require(invoke(empty, type, value.value, 0) == 0, "empty numeric switch");
    }
    for (int restart : new int[] { -1, ORDER.length + 1, Integer.MIN_VALUE, Integer.MAX_VALUE }) {
      try {
        int ignored = invoke(combined, type, values[0].value, restart);
        throw new AssertionError("invalid restart accepted");
      } catch (IndexOutOfBoundsException expected) {
        checks++;
      }
    }
    System.out.println("exact-" + type.getName());
  }

  public static void main(String[] args) throws Throwable {
    selector(byte.class, new Value[] {
        new Value((byte) -128, SIGNED), new Value((byte) -1, SIGNED),
        new Value((byte) 0, ALL), new Value((byte) 1, ALL), new Value((byte) 127, ALL)
    });
    selector(char.class, new Value[] {
        new Value((char) 0, ALL), new Value((char) 1, ALL), new Value((char) 127, ALL),
        new Value((char) 128, CHAR_SHORT), new Value((char) 32767, CHAR_SHORT),
        new Value((char) 32768, CHAR), new Value((char) 65535, CHAR)
    });
    selector(short.class, new Value[] {
        new Value((short) -32768, SHORT), new Value((short) -129, SHORT),
        new Value((short) -128, SIGNED), new Value((short) -1, SIGNED),
        new Value((short) 0, ALL), new Value((short) 1, ALL), new Value((short) 127, ALL),
        new Value((short) 128, CHAR_SHORT), new Value((short) 32767, CHAR_SHORT)
    });
    selector(int.class, new Value[] {
        new Value(Integer.MIN_VALUE, INT), new Value(Integer.MIN_VALUE + 1, INT_DOUBLE),
        new Value(-65536, INT), new Value(-32769, INT), new Value(-32768, SHORT),
        new Value(-129, SHORT), new Value(-128, SIGNED), new Value(-1, SIGNED),
        new Value(0, ALL), new Value(1, ALL), new Value(127, ALL),
        new Value(128, CHAR_SHORT), new Value(32767, CHAR_SHORT),
        new Value(32768, CHAR), new Value(65535, CHAR), new Value(65536, INT),
        new Value(16777215, INT), new Value(16777216, INT),
        new Value(16777217, INT_DOUBLE), new Value(16777218, INT),
        new Value(-16777217, INT_DOUBLE), new Value(Integer.MAX_VALUE, INT_DOUBLE)
    });
    selector(long.class, new Value[] {
        new Value(Long.MIN_VALUE, LONG), new Value(Long.MIN_VALUE + 1, J),
        new Value(-9007199254740993L, J), new Value(-9007199254740992L, LONG),
        new Value(-9007199254740991L, LONG_DOUBLE), new Value(-2147483649L, LONG_DOUBLE),
        new Value(-2147483648L, INT), new Value(-1L, SIGNED), new Value(0L, ALL),
        new Value(1L, ALL), new Value(65535L, CHAR), new Value(65536L, INT),
        new Value(16777217L, INT_DOUBLE), new Value(16777218L, INT),
        new Value(2147483647L, INT_DOUBLE), new Value(2147483648L, LONG),
        new Value(2147483649L, LONG_DOUBLE), new Value(9007199254740991L, LONG_DOUBLE),
        new Value(9007199254740992L, LONG), new Value(9007199254740993L, J),
        new Value(9007199254740994L, LONG_DOUBLE), new Value(4611686018427387904L, LONG),
        new Value(9223372036854774784L, LONG_DOUBLE), new Value(9223372036854775296L, J),
        new Value(Long.MAX_VALUE, J)
    });
    selector(float.class, new Value[] {
        new Value(-0.0f, FLOATING), new Value(0.0f, ALL), new Value(Float.NaN, FLOATING),
        new Value(Float.POSITIVE_INFINITY, FLOATING), new Value(Float.NEGATIVE_INFINITY, FLOATING),
        new Value(Float.MIN_VALUE, FLOATING), new Value(-Float.MIN_VALUE, FLOATING),
        new Value(Float.MIN_NORMAL, FLOATING), new Value(Float.MAX_VALUE, FLOATING),
        new Value(0.5f, FLOATING), new Value(-0.5f, FLOATING), new Value(1.5f, FLOATING),
        new Value(-129.0f, SHORT), new Value(-128.0f, SIGNED), new Value(127.0f, ALL),
        new Value(128.0f, CHAR_SHORT), new Value(32767.0f, CHAR_SHORT),
        new Value(32768.0f, CHAR), new Value(65535.0f, CHAR), new Value(65536.0f, INT),
        new Value(16777216.0f, INT), new Value(16777218.0f, INT),
        new Value(0x1.fffffep30f, INT), new Value(0x1p31f, LONG), new Value(-0x1p31f, INT),
        new Value(-0x1.000002p31f, LONG), new Value(0x1.fffffep62f, LONG),
        new Value(0x1p63f, FLOATING), new Value(-0x1p63f, LONG),
        new Value(-0x1.000002p63f, FLOATING)
    });
    selector(double.class, new Value[] {
        new Value(-0.0, FLOATING), new Value(0.0, ALL), new Value(Double.NaN, FLOATING),
        new Value(Double.POSITIVE_INFINITY, FLOATING), new Value(Double.NEGATIVE_INFINITY, FLOATING),
        new Value(Double.MIN_VALUE, D), new Value(Double.MIN_NORMAL, D), new Value(Double.MAX_VALUE, D),
        new Value(0x1p-149, FLOATING), new Value(-0x1p-149, FLOATING), new Value(0x1p-150, D),
        new Value(0x1.0000000000001p-149, D), new Value(0x1.fffffep127, FLOATING),
        new Value(0x1.ffffffp127, D), new Value(0x1p128, D), new Value(0.1, D),
        new Value(1.0, ALL), new Value(1.5, FLOATING), new Value(-129.0, SHORT),
        new Value(-128.0, SIGNED), new Value(127.0, ALL), new Value(128.0, CHAR_SHORT),
        new Value(32767.0, CHAR_SHORT), new Value(32768.0, CHAR),
        new Value(65535.0, CHAR), new Value(65536.0, INT), new Value(16777215.0, INT),
        new Value(16777216.0, INT), new Value(16777217.0, INT_DOUBLE), new Value(16777218.0, INT),
        new Value(2147483647.0, INT_DOUBLE), new Value(2147483648.0, LONG),
        new Value(2147483649.0, LONG_DOUBLE), new Value(-2147483648.0, INT),
        new Value(-2147483649.0, LONG_DOUBLE), new Value(9007199254740991.0, LONG_DOUBLE),
        new Value(9007199254740992.0, LONG), new Value(9007199254740994.0, LONG_DOUBLE),
        new Value(0x1.fffffffffffffp62, LONG_DOUBLE), new Value(0x1p63, FLOATING),
        new Value(-0x1p63, LONG), new Value(-0x1.0000000000001p63, D)
    });
    System.out.println("exact-conversions:" + checks);
  }
}
