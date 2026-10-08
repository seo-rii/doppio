package java.lang.runtime;

import java.lang.Enum$EnumDesc;
import java.lang.constant.ClassDesc;
import java.lang.invoke.CallSite;
import java.lang.invoke.ConstantCallSite;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;
import java.util.Objects;

/** Public call-site entry points for selected final reference and enum switches. */
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
        || type.parameterType(0).isPrimitive() || type.parameterType(1) != int.class) {
      throw new IllegalArgumentException("Expected (reference, int)int invocation type");
    }
  }

  private static CallSite callSite(MethodHandles.Lookup lookup, String invocationName,
      MethodType type, Object[] labels, boolean enumOnly) {
    Objects.requireNonNull(lookup);
    Objects.requireNonNull(invocationName);
    State state = new State(lookup, labels, enumOnly);
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
        if (((Class<?>) label).isInstance(selector)) return index;
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
    final Enum<?>[] enumConstants;
    final boolean[] enumResolved;

    State(MethodHandles.Lookup lookup, Object[] labels, boolean enumOnly) {
      this.lookup = lookup;
      this.labels = labels;
      this.enumOnly = enumOnly;
      this.enumConstants = new Enum<?>[labels.length];
      this.enumResolved = new boolean[labels.length];
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
