package java.lang.runtime;

import java.lang.Enum$EnumDesc;
import java.lang.constant.ClassDesc;
import java.lang.invoke.CallSite;
import java.lang.invoke.ConstantCallSite;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.util.Objects;

/** Public call sites for selected reference, numeric primitive and enum switches. */
public final class SwitchBootstraps {
  private SwitchBootstraps() {}

  public static CallSite typeSwitch(MethodHandles.Lookup lookup, String invocationName,
      MethodType invocationType, Object... labels) {
    checkInvocationType(invocationType);
    Object[] snapshot = Objects.requireNonNull(labels).clone();
    for (Object label : snapshot) {
      if (!(label instanceof Class) && !(label instanceof String)
          && !(label instanceof Integer) && !(label instanceof Enum$EnumDesc)) {
        throw new IllegalArgumentException("Invalid type-switch label");
      }
    }
    return callSite(lookup, invocationName, invocationType, snapshot, false);
  }

  public static CallSite enumSwitch(MethodHandles.Lookup lookup, String invocationName,
      MethodType invocationType, Object... labels) {
    checkInvocationType(invocationType);
    Class<?> selectorType = invocationType.parameterType(0);
    if (!selectorType.isEnum()) {
      throw new IllegalArgumentException("Selector type must be an enum");
    }
    Object[] snapshot = Objects.requireNonNull(labels).clone();
    for (Object label : snapshot) {
      if (!(label instanceof String) && label != selectorType) {
        throw new IllegalArgumentException("Invalid enum-switch label");
      }
      if (label instanceof String) {
        String name = (String) label;
        boolean specialName = name.equals("<init>") || name.equals("<clinit>");
        if (name.isEmpty() || name.indexOf('.') >= 0 || name.indexOf('/') >= 0
            || name.indexOf(';') >= 0 || name.indexOf('[') >= 0
            || !specialName && (name.indexOf('<') >= 0 || name.indexOf('>') >= 0)) {
          throw new IllegalArgumentException("Invalid enum constant name");
        }
      }
    }
    return callSite(lookup, invocationName, invocationType, snapshot, true);
  }

  private static void checkInvocationType(MethodType type) {
    Objects.requireNonNull(type);
    if (type.parameterCount() != 2 || type.returnType() != int.class
        || type.parameterType(1) != int.class) {
      throw new IllegalArgumentException("Expected (selector, int)int invocation type");
    }
  }

  private static CallSite callSite(MethodHandles.Lookup lookup, String invocationName,
      MethodType type, Object[] labels, boolean enumOnly) {
    Objects.requireNonNull(lookup);
    Objects.requireNonNull(invocationName);
    State state = new State(lookup, labels, enumOnly, type.parameterType(0));
    try {
      // The Java 8 lookup constructor rejects this modern java.* package.
      MethodHandle target = MethodHandles.privateLookupIn(SwitchBootstraps.class, lookup)
          .findStatic(SwitchBootstraps.class,
          "select", MethodType.methodType(int.class, State.class, Object.class, int.class));
      return new ConstantCallSite(target.bindTo(state).asType(type));
    } catch (ReflectiveOperationException impossible) {
      throw new AssertionError(impossible);
    }
  }

  private static int select(State state, Object selector, int restart) {
    if (restart < 0 || restart > state.labels.length) {
      throw new IndexOutOfBoundsException("Invalid switch restart index: " + restart);
    }
    if (selector == null) return -1;
    for (int index = restart; index < state.labels.length; index++) {
      Object label = state.labels[index];
      if (label instanceof Class) {
        if (state.matchesClass((Class<?>) label, selector)) return index;
      } else if (label instanceof String) {
        Object value = state.enumOnly ? ((Enum<?>) selector).name() : selector;
        if (label.equals(value)) return index;
      } else if (label instanceof Integer) {
        int value;
        if (selector instanceof Number) {
          value = ((Number) selector).intValue();
        } else if (selector instanceof Character) {
          value = ((Character) selector).charValue();
        } else {
          continue;
        }
        if (((Integer) label).intValue() == value) return index;
      } else if (state.matchesEnum(index, (Enum$EnumDesc<?>) label, selector)) {
        return index;
      }
      // Failed adjacent equal labels must not repeat observable numeric conversions.
      // Starting at a later duplicate still tests that label independently.
      while (index + 1 < state.labels.length && label.equals(state.labels[index + 1])) {
        index++;
      }
    }
    return state.labels.length;
  }

  private static final class State {
    final MethodHandles.Lookup lookup;
    final Object[] labels;
    final boolean enumOnly;
    final Class<?> selectorType;
    final Enum<?>[] enumConstants;
    final boolean[] enumResolved;

    State(MethodHandles.Lookup lookup, Object[] labels, boolean enumOnly, Class<?> selectorType) {
      this.lookup = lookup;
      this.labels = labels;
      this.enumOnly = enumOnly;
      this.selectorType = selectorType;
      this.enumConstants = new Enum<?>[labels.length];
      this.enumResolved = new boolean[labels.length];
    }

    boolean matchesClass(Class<?> label, Object selector) {
      // Boolean primitive selectors do not match even boxed supertypes.
      if (selectorType == boolean.class && label != boolean.class && label != Boolean.class) {
        return false;
      }
      // asType boxes selectors, but exact numeric conversion depends on the
      // declared primitive type. Reference selectors retain identity matching.
      if (selectorType.isPrimitive() && selectorType != boolean.class
          && label.isPrimitive() && label != boolean.class && label != void.class) {
        return matchesNumericClass(label, selector);
      }
      if (label == boolean.class) label = Boolean.class;
      else if (label == byte.class) label = Byte.class;
      else if (label == char.class) label = Character.class;
      else if (label == short.class) label = Short.class;
      else if (label == int.class) label = Integer.class;
      else if (label == long.class) label = Long.class;
      else if (label == float.class) label = Float.class;
      else if (label == double.class) label = Double.class;
      return label.isInstance(selector);
    }

    private boolean matchesNumericClass(Class<?> label, Object selector) {
      if (selectorType != float.class && selectorType != double.class) {
        long value = selectorType == char.class ? ((Character) selector).charValue()
            : ((Number) selector).longValue();
        if (label == byte.class) return value >= Byte.MIN_VALUE && value <= Byte.MAX_VALUE;
        if (label == char.class) return value >= Character.MIN_VALUE && value <= Character.MAX_VALUE;
        if (label == short.class) return value >= Short.MIN_VALUE && value <= Short.MAX_VALUE;
        if (label == int.class) return value >= Integer.MIN_VALUE && value <= Integer.MAX_VALUE;
        if (label == long.class) return true;
        return fitsBinaryPrecision(value, label == float.class ? 24 : 53);
      }

      double value = ((Number) selector).doubleValue();
      if (label == double.class) return true;
      if (label == float.class) return selectorType == float.class || fitsFloat(value);

      double lower;
      double upper;
      if (label == byte.class) { lower = -128.0; upper = 128.0; }
      else if (label == char.class) { lower = 0.0; upper = 65536.0; }
      else if (label == short.class) { lower = -32768.0; upper = 32768.0; }
      else if (label == int.class) { lower = -0x1p31; upper = 0x1p31; }
      else { lower = -0x1p63; upper = 0x1p63; }
      // Upper-exclusive bounds reject saturating casts at 2^31 and 2^63.
      // Negative zero cannot be represented by an integral target.
      return value >= lower && value < upper && !(value == 0.0 && 1.0 / value < 0.0)
          && value == (double) (long) value;
    }

    private static boolean fitsBinaryPrecision(long value, int precision) {
      if (value == 0) return true;
      // Treat the overflowing magnitude of Long.MIN_VALUE as unsigned.
      // Removing powers of two leaves the bits needed by the significand.
      long magnitude = value < 0 ? -value : value;
      while ((magnitude & 1L) == 0) magnitude >>>= 1;
      return (magnitude >>> precision) == 0;
    }

    private static boolean fitsFloat(double value) {
      long bits = Double.doubleToRawLongBits(value);
      int exponent = (int) ((bits >>> 52) & 0x7ffL);
      if (exponent == 0x7ff || value == 0.0) return true; // NaN, infinity, signed zero.
      // Binary32 finite nonzero values have unbiased exponents -149 through 127.
      if (exponent < 874 || exponent > 1150) return false;
      // Normal floats keep 24 significand bits; subnormals have fewer.
      int discardedBits = 29 + Math.max(0, 897 - exponent);
      return (bits & ((1L << discardedBits) - 1)) == 0;
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    synchronized boolean matchesEnum(int index, Enum$EnumDesc<?> label, Object selector) {
      if (!(selector instanceof Enum)) return false;
      Class<?> selectorType = ((Enum<?>) selector).getDeclaringClass();
      // Comparing descriptors first avoids resolving unrelated or uninitialized enums.
      if (!label.constantType().equals(ClassDesc.of(selectorType.getName()))) {
        return false;
      }
      if (!enumResolved[index]) {
        try {
          Class<?> enumType = (Class<?>) label.constantType().resolveConstantDesc(lookup);
          lookup.accessClass(enumType);
          if (enumType != selectorType) return false;
          enumConstants[index] = Enum.valueOf((Class) enumType, label.constantName());
        } catch (ReflectiveOperationException | IllegalArgumentException unmatched) {
          // An inaccessible type or an absent constant is a nonmatching enum label.
        }
        enumResolved[index] = true;
      }
      return enumConstants[index] == selector;
    }
  }
}
