package kotlin.jvm.internal;

public class Intrinsics {
  public static void checkNotNull(Object value) {
    if (value == null) {
      throw new NullPointerException();
    }
  }

  public static void checkNotNull(Object value, String message) {
    if (value == null) {
      throw new NullPointerException(message);
    }
  }

  public static void checkParameterIsNotNull(Object value, String paramName) {
    if (value == null) {
      throw new IllegalArgumentException(createParameterIsNullExceptionMessage(paramName));
    }
  }

  public static void checkNotNullParameter(Object value, String paramName) {
    if (value == null) {
      throw new NullPointerException(createParameterIsNullExceptionMessage(paramName));
    }
  }

  private static String createParameterIsNullExceptionMessage(String paramName) {
    StackTraceElement[] trace = Thread.currentThread().getStackTrace();
    String intrinsics = Intrinsics.class.getName();
    for (StackTraceElement element : trace) {
      if (!element.getClassName().equals(intrinsics) &&
          !element.getClassName().equals(Thread.class.getName())) {
        return "Parameter specified as non-null is null: method " +
          element.getClassName() + "." + element.getMethodName() +
          ", parameter " + paramName;
      }
    }
    return "Parameter specified as non-null is null: parameter " + paramName;
  }
}
