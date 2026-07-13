package java.lang;

final class DoppioClassLoader {
  private DoppioClassLoader() {
  }

  static native ClassLoader getPlatformClassLoader();

  static native Package getDefinedPackage(ClassLoader loader, String name);

  static native Package[] getDefinedPackages(ClassLoader loader);
}
