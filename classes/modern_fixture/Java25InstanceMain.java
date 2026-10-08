package classes.modern_test;

/** Final Java 25 launch protocol fixtures; launch each nested class separately. */
public class Java25InstanceMain {
  private static int constructions;
  private final String initialized = "initialized";

  Java25InstanceMain() {
    constructions++;
  }

  void main(String[] args) {
    if (constructions != 1 || !"initialized".equals(initialized)) {
      throw new AssertionError("instance initialization");
    }
    System.out.println("instance-args=" + String.join("|", args));
    System.out.println("constructed=" + constructions);
  }

  public static final class StaticNoArgs {
    private StaticNoArgs() {
      throw new AssertionError("static main must not construct its class");
    }

    static void main() {
      System.out.println("static-no-args");
    }
  }

  public static final class ProtectedNoArgs {
    protected ProtectedNoArgs() {}

    protected void main() {
      System.out.println("protected-instance-no-args");
    }
  }

  public static final class ArgumentPreference {
    void main(String[] args) {
      System.out.println("instance-args-preferred=" + String.join("|", args));
    }

    static void main() {
      throw new AssertionError("String[] candidate must win over no arguments");
    }
  }

  public static final class StaticArgumentPreference {
    private StaticArgumentPreference() {
      throw new AssertionError("static main must not instantiate");
    }

    protected static void main(String... args) {
      System.out.println("static-args-preferred=" + String.join("|", args));
    }

    void main() {
      throw new AssertionError("String[] candidate must win over no arguments");
    }
  }

  public static class Base {
    void main(String[] args) {
      System.out.println("inherited-args=" + String.join("|", args));
    }
  }

  public static final class Inherited extends Base {}

  public static final class InheritedArgumentPreference extends Base {
    static void main() {
      throw new AssertionError("inherited String[] candidate must win");
    }
  }

  public interface DefaultMain {
    default void main(String[] args) {
      System.out.println("default-interface-args=" + String.join("|", args));
    }
  }

  public static final class InheritedDefault implements DefaultMain {}

  public static class PrivateBase {
    private void main(String[] args) {
      throw new AssertionError("private superclass main must not run");
    }
  }

  public static final class PrivateBaseDefault extends PrivateBase implements DefaultMain {}

  public interface StaticInterfaceMain {
    static void main(String[] args) {
      System.out.println("interface-static-args=" + String.join("|", args));
    }
  }

  public static final class InterfaceStaticNotInherited implements StaticInterfaceMain {
    void main() {
      System.out.println("interface-static-not-inherited");
    }
  }

  public static final class PrivateArgumentFallback {
    private static void main(String[] args) {
      throw new AssertionError("private main is not a candidate");
    }

    void main() {
      System.out.println("private-args-ignored");
    }
  }

  public static final class PrivateMainOnly {
    private static void main(String[] args) {
      throw new AssertionError("private main must not run");
    }
  }

  public static final class MissingConstructor {
    MissingConstructor(int value) {}

    void main() {
      throw new AssertionError("missing constructor must prevent main");
    }
  }

  public static final class PrivateConstructor {
    private PrivateConstructor() {}

    void main() {
      throw new AssertionError("private constructor must prevent main");
    }
  }

  public static final class ConstructorFailure {
    ConstructorFailure() {
      throw new IllegalStateException("constructor-failure");
    }

    void main() {
      throw new AssertionError("failed constructor must prevent main");
    }
  }

  public static final class MainFailure {
    void main() {
      throw new IllegalArgumentException("main-failure");
    }
  }

  public abstract static class AbstractInstance {
    void main() {
      throw new AssertionError("abstract initial class must not instantiate");
    }
  }
}
