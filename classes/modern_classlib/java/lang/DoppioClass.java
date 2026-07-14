package java.lang;

import java.lang.constant.ClassDesc;
import java.util.Optional;

final class DoppioClass {
  private DoppioClass() {
  }

  static native boolean isRecord(Class<?> type);

  static native boolean isSealed(Class<?> type);

  static native Class<?>[] getPermittedSubclasses(Class<?> type);

  static native String getPackageName(Class<?> type);

  static native String descriptorString(Class<?> type);

  static native Class<?> componentType(Class<?> type);

  static native Class<?> arrayType(Class<?> type);

  static native Optional<ClassDesc> describeConstable(Class<?> type);
}
