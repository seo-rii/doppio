package java.lang;

final class DoppioRuntime {
  private static final Runtime$Version VERSION = Runtime$Version.parse("17");

  private DoppioRuntime() {
  }

  static Runtime$Version version() {
    return VERSION;
  }
}
