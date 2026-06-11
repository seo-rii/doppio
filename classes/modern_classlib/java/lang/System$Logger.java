package java.lang;

import java.util.Objects;
import java.util.ResourceBundle;
import java.util.function.Supplier;

public interface System$Logger {
  public static enum Level {
    ALL(Integer.MIN_VALUE),
    TRACE(400),
    DEBUG(500),
    INFO(800),
    WARNING(900),
    ERROR(1000),
    OFF(Integer.MAX_VALUE);

    private final int severity;

    private Level(int severity) {
      this.severity = severity;
    }

    public final String getName() {
      return name();
    }

    public final int getSeverity() {
      return severity;
    }
  }

  String getName();

  boolean isLoggable(Level level);

  default void log(Level level, String message) {
    log(level, (ResourceBundle) null, message, (Object[]) null);
  }

  default void log(Level level, Supplier<String> messageSupplier) {
    Objects.requireNonNull(messageSupplier);
    if (isLoggable(Objects.requireNonNull(level))) {
      log(level, (ResourceBundle) null, messageSupplier.get(), (Object[]) null);
    }
  }

  default void log(Level level, Object obj) {
    Objects.requireNonNull(obj);
    if (isLoggable(Objects.requireNonNull(level))) {
      log(level, (ResourceBundle) null, obj.toString(), (Object[]) null);
    }
  }

  default void log(Level level, String message, Throwable thrown) {
    log(level, null, message, thrown);
  }

  default void log(Level level, Supplier<String> messageSupplier, Throwable thrown) {
    Objects.requireNonNull(messageSupplier);
    if (isLoggable(Objects.requireNonNull(level))) {
      log(level, null, messageSupplier.get(), thrown);
    }
  }

  default void log(Level level, String format, Object... params) {
    log(level, (ResourceBundle) null, format, params);
  }

  void log(Level level, ResourceBundle bundle, String message, Throwable thrown);

  void log(Level level, ResourceBundle bundle, String format, Object... params);
}
