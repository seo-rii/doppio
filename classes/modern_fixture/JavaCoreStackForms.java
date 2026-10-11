package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.InvocationTargetException;

/** Explicitly mutated resource payloads, never presented as old javac output. */
public final class JavaCoreStackForms {
  private static final String[] IDS = {
    "stack-legacy-jsr-single-49", "stack-legacy-jsr-two-49", "stack-legacy-jsr-wide-49", "stack-legacy-finally-49",
    "stack-legacy-jsr-single-50", "stack-legacy-jsr-two-50", "stack-legacy-jsr-wide-50", "stack-legacy-finally-50",
    "stack-dup", "stack-dup-x1", "stack-dup-x2-cat1", "stack-dup-x2-cat2-bottom",
    "stack-dup2-cat1", "stack-dup2-cat2", "stack-dup2-x1-cat1", "stack-dup2-x1-cat2-top",
    "stack-dup2-x2-cat1", "stack-dup2-x2-cat2-bottom", "stack-dup2-x2-cat2-top", "stack-dup2-x2-cat2-pair",
    "stack-pop", "stack-pop2-cat1", "stack-pop2-cat2", "stack-swap", "stack-nop"
  };
  private static final int[] VALUES = {
    7, 14, 7, 0, 7, 14, 7, 0,
    11, 212, 3123, 212, 1212, 11, 23123, 212, 341234, 23123, 3123, 212,
    1, 1, 1, 21, 1
  };
  private static String currentId;
  private static int expectedValue;

  private static final class PayloadLoader extends ClassLoader {
    private final String resource;

    PayloadLoader(String id) {
      super(JavaCoreStackForms.class.getClassLoader());
      resource = new StringBuilder("/core-stack-cases/").append(id).append("/Target.bin").toString();
    }

    private byte[] payload() throws IOException {
      InputStream input = JavaCoreStackForms.class.getResourceAsStream(resource);
      if (input == null) throw new IOException("Missing stack payload resource");
      try {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int count;
        while ((count = input.read(buffer)) != -1) {
          output.write(buffer, 0, count);
          if (output.size() > 1048576) throw new IOException("Oversized stack payload");
        }
        return output.toByteArray();
      } finally {
        input.close();
      }
    }

    protected Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
      if (!name.equals("corehistorical.Target")) return super.loadClass(name, resolve);
      Class<?> target = findLoadedClass(name);
      if (target == null) {
        try {
          byte[] bytes = payload();
          target = defineClass(name, bytes, 0, bytes.length);
        } catch (IOException failure) {
          throw new ClassNotFoundException(name, failure);
        }
      }
      if (resolve) resolveClass(target);
      return target;
    }
  }

  private static Class<?> target() throws Exception {
    PayloadLoader loader = new PayloadLoader(currentId);
    Class<?> target = Class.forName("corehistorical.Target", true, loader);
    if (target.getClassLoader() != loader) throw new AssertionError("Payload loader identity");
    int counter = ((Integer) target.getMethod("getCounter", new Class<?>[0]).invoke(null, new Object[0])).intValue();
    if (counter != 0) throw new AssertionError("Fresh payload counter");
    return target;
  }

  public static void caseInteger() throws Exception {
    Class<?> target = target();
    Object value = target.getMethod("value", new Class<?>[0]).invoke(null, new Object[0]);
    if (!(value instanceof Integer) || ((Integer) value).intValue() != expectedValue)
      throw new AssertionError("Stack value or ordering");
    System.out.println(new StringBuilder(currentId).append("=value=").append(((Integer) value).intValue()).toString());
  }

  public static void caseException() throws Exception {
    Class<?> target = target();
    Throwable original = new Throwable("Original stack throwable");
    try {
      target.getMethod("rethrow", new Class<?>[] {Throwable.class}).invoke(null, new Object[] {original});
      throw new AssertionError("Expected payload rethrow");
    } catch (InvocationTargetException failure) {
      if (failure.getCause() != original) throw new AssertionError("Throwable identity changed");
    }
    int counter = ((Integer) target.getMethod("getCounter", new Class<?>[0]).invoke(null, new Object[0])).intValue();
    if (counter != 1) throw new AssertionError("Subroutine finally count");
    System.out.println(new StringBuilder(currentId).append("=same;counter=1").toString());
  }

  public static void main(String[] args) throws Exception {
    if (args.length != IDS.length) throw new AssertionError("Complete ordered stack case inventory required");
    for (int i = 0; i < IDS.length; i++)
      if (!IDS[i].equals(args[i])) throw new AssertionError("Stack case inventory mismatch");
    for (int i = 0; i < IDS.length; i++) {
      currentId = IDS[i];
      expectedValue = VALUES[i];
      if (i == 3 || i == 7) caseException();
      else caseInteger();
    }
    System.out.println("CORE_STACK_FORMS_OK");
  }
}
