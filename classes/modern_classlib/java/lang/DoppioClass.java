package java.lang;

final class DoppioClass {
  private DoppioClass() {
  }

  static native boolean isRecord(Class<?> type);
}
