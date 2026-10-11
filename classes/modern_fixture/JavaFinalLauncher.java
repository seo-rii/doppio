package classes.modern_test;

/** Launch each target as the initial class/interface; never dispatch main here. */
public final class JavaFinalLauncher {
  private JavaFinalLauncher() {}

  private static void emit(String id, String event) {
    System.out.println(new StringBuilder(id).append('=').append(event).toString());
  }
  private static void arguments(String id, String[] values) {
    if (values.length != 2) throw new AssertionError("launcher argument count");
    emit(id, new StringBuilder("args=").append(values[0]).append('|').append(values[1]).toString());
  }
  private static void finish() { System.out.println("FINAL_LAUNCHER_OK"); }
  private static void forbidden(String id, String stage) {
    throw new AssertionError(new StringBuilder("FORBIDDEN:").append(id).append(':').append(stage).toString());
  }
  private static void fail(String id) { throw new IllegalStateException(id); }

  public static class PublicStaticArgsBase {
    public static void main(String[] values) {
      emit("fl-inherited-public-static-args", "main=inherited-public-static");
      arguments("fl-inherited-public-static-args", values); finish();
    }
  }
  public static final class InheritedPublicStaticArgs extends PublicStaticArgsBase {
    private InheritedPublicStaticArgs() { forbidden("fl-inherited-public-static-args", "constructor"); }
  }

  public static class ProtectedStaticNoArgsBase {
    protected static void main() {
      emit("fl-inherited-protected-static-noargs", "main=inherited-protected-static-noargs"); finish();
    }
  }
  public static final class InheritedProtectedStaticNoArgs extends ProtectedStaticNoArgsBase {
    private InheritedProtectedStaticNoArgs() { forbidden("fl-inherited-protected-static-noargs", "constructor"); }
  }

  public interface DefaultMain {
    default void main(String[] values) { forbidden("fl-most-specific-interface-default", "general-default"); }
  }
  public interface SpecificDefaultMain extends DefaultMain {
    @Override default void main(String[] values) {
      emit("fl-most-specific-interface-default", "main=most-specific-default");
      arguments("fl-most-specific-interface-default", values); finish();
    }
  }
  public static final class MostSpecificInterfaceDefault implements DefaultMain, SpecificDefaultMain {
    public MostSpecificInterfaceDefault() { emit("fl-most-specific-interface-default", "constructed"); }
  }

  public static class InstanceMainBase {
    public void main(String[] values) { forbidden("fl-class-instance-override", "superclass-main"); }
  }
  public static final class ClassInstanceOverride extends InstanceMainBase implements SpecificDefaultMain {
    public ClassInstanceOverride() { emit("fl-class-instance-override", "constructed"); }
    @Override public void main(String[] values) {
      emit("fl-class-instance-override", "main=class-override");
      arguments("fl-class-instance-override", values); finish();
    }
  }

  public abstract static class AbstractStaticNoConstructor {
    public AbstractStaticNoConstructor(int unused) { forbidden("fl-abstract-static-no-constructor", "constructor"); }
    public static void main(String[] values) {
      emit("fl-abstract-static-no-constructor", "main=abstract-static");
      arguments("fl-abstract-static-no-constructor", values); finish();
    }
  }

  public interface InitialInterfaceAbstract { void main(String[] values); }

  public static final class ClassInitializationFailure {
    static {
      emit("fl-class-initialization-failure", "class-init-start");
      fail("fl-class-initialization-failure");
      emit("fl-class-initialization-failure", "FORBIDDEN-class-init-complete");
    }
    public ClassInitializationFailure() { forbidden("fl-class-initialization-failure", "constructor"); }
    public void main(String[] values) { forbidden("fl-class-initialization-failure", "main"); }
  }

  public static final class InstanceInitializationFailure {
    {
      emit("fl-instance-initialization-failure", "instance-init-start");
      fail("fl-instance-initialization-failure");
      emit("fl-instance-initialization-failure", "FORBIDDEN-instance-init-complete");
    }
    public InstanceInitializationFailure() { forbidden("fl-instance-initialization-failure", "constructor-complete"); }
    public void main(String[] values) { forbidden("fl-instance-initialization-failure", "main"); }
  }

  public static final class NonvoidArgsFallback {
    public NonvoidArgsFallback() { emit("fl-nonvoid-args-fallback", "constructed"); }
    public static int main(String[] values) { forbidden("fl-nonvoid-args-fallback", "nonvoid-main"); return -1; }
    public void main() { emit("fl-nonvoid-args-fallback", "main=noargs-fallback"); finish(); }
  }
  public static final class ObjectArrayFallback {
    public ObjectArrayFallback() { emit("fl-object-array-fallback", "constructed"); }
    public static void main(Object[] values) { forbidden("fl-object-array-fallback", "object-array-main"); }
    public void main() { emit("fl-object-array-fallback", "main=noargs-fallback"); finish(); }
  }
  public static final class TwoArgsFallback {
    public TwoArgsFallback() { emit("fl-two-args-fallback", "constructed"); }
    public static void main(String[] values, int extra) { forbidden("fl-two-args-fallback", "two-args-main"); }
    public void main() { emit("fl-two-args-fallback", "main=noargs-fallback"); finish(); }
  }

  public static final class InvalidOnly {
    public InvalidOnly() { forbidden("fl-invalid-only-failure", "constructor"); }
    public static int main(String[] values) { forbidden("fl-invalid-only-failure", "nonvoid-main"); return -1; }
    public static void main(Object[] values) { forbidden("fl-invalid-only-failure", "object-array-main"); }
    public static void main(String[] values, int extra) { forbidden("fl-invalid-only-failure", "two-args-main"); }
    private void main() { forbidden("fl-invalid-only-failure", "private-main"); }
  }
}
