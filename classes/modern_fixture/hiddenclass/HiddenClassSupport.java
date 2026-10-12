package classes.modern_test;

import java.io.InputStream;
import java.lang.invoke.MethodHandles;
import java.util.Arrays;

/** Shared genuine-source fixture checks, not a bytecode carrier or guest shim. */
public final class HiddenClassSupport {
  private HiddenClassSupport() {}

  public static void check(boolean condition) {
    if (!condition) throw new AssertionError("hidden-class invariant");
  }

  public static void emit(String id, String event) {
    System.out.println(new StringBuilder().append(id).append('=').append(event).toString());
  }

  public static byte[] bytes(Class<?> anchor, String resource) throws Exception {
    try (InputStream stream = anchor.getResourceAsStream(resource)) {
      check(stream != null);
      return stream.readAllBytes();
    }
  }

  public static Throwable rejectDefinition(MethodHandles.Lookup caller, byte[] bytes,
      boolean initialize, Class<? extends Throwable> expected,
      MethodHandles.Lookup.ClassOption... options) throws Throwable {
    try {
      caller.defineHiddenClass(bytes, initialize, options);
    } catch (Throwable error) {
      check(error.getClass() == expected);
      return error;
    }
    throw new AssertionError("hidden definition unexpectedly succeeded");
  }

  public static Throwable rejectData(MethodHandles.Lookup caller, String name, Class<?> type,
      Class<? extends Throwable> expected) throws Throwable {
    try {
      MethodHandles.classData(caller, name, type);
    } catch (Throwable error) {
      check(error.getClass() == expected);
      return error;
    }
    throw new AssertionError("class data unexpectedly succeeded");
  }

  public static Throwable rejectDataAt(MethodHandles.Lookup caller, String name, Class<?> type,
      int index, Class<? extends Throwable> expected) throws Throwable {
    try {
      MethodHandles.classDataAt(caller, name, type, index);
    } catch (Throwable error) {
      check(error.getClass() == expected);
      return error;
    }
    throw new AssertionError("indexed class data unexpectedly succeeded");
  }

  public static byte[] prefix(byte[] source, int length) {
    return Arrays.copyOf(source, length);
  }
}
