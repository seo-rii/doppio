package java.lang;

final class DoppioClass {
  private DoppioClass() {
  }

  static native boolean isRecord(Class<?> type);

  static native boolean isSealed(Class<?> type);

  static native Class<?>[] getPermittedSubclasses(Class<?> type);

  static native String getPackageName(Class<?> type);
}
