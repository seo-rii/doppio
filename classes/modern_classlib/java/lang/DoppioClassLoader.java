package java.lang;

final class DoppioClassLoader {
  private DoppioClassLoader() {
  }

  static native ClassLoader getPlatformClassLoader();
}
