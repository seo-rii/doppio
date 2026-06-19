package classes.modern_test;

public class Java9ClassLoaderMetadata {
  private static final class PlainLoader extends ClassLoader {
    PlainLoader() {
      super(null);
    }
  }

  private static final class ParallelLoader extends ClassLoader {
    static final boolean REGISTERED = registerAsParallelCapable();

    ParallelLoader() {
      super(null);
    }
  }

  public static void main(String[] args) {
    ClassLoader system = ClassLoader.getSystemClassLoader();
    ClassLoader platform = ClassLoader.getPlatformClassLoader();
    ClassLoader platformAgain = ClassLoader.getPlatformClassLoader();
    ClassLoader plain = new PlainLoader();
    ClassLoader parallel = new ParallelLoader();

    System.out.println(value(system.getName()));
    System.out.println(value(platform.getName()));
    System.out.println(platform != null);
    System.out.println(platform == platformAgain);
    System.out.println(platform.getParent() == null);
    System.out.println(system.getParent() == platform);
    System.out.println(value(plain.getName()));
    System.out.println(value(parallel.getName()));
    System.out.println(system.isRegisteredAsParallelCapable());
    System.out.println(platform.isRegisteredAsParallelCapable());
    System.out.println(plain.isRegisteredAsParallelCapable());
    System.out.println(ParallelLoader.REGISTERED);
    System.out.println(parallel.isRegisteredAsParallelCapable());
  }

  private static String value(String input) {
    return input == null ? "<null>" : input;
  }
}
