package java.lang;

import java.util.Objects;
import java.util.ResourceBundle;

final class System$DoppioLogger implements System$Logger {
  private final String name;

  System$DoppioLogger(String name) {
    this.name = name;
  }

  public String getName() {
    return name;
  }

  public boolean isLoggable(System$Logger.Level level) {
    Objects.requireNonNull(level);
    return true;
  }

  public void log(System$Logger.Level level, ResourceBundle bundle, String message, Throwable thrown) {
    Objects.requireNonNull(level);
  }

  public void log(System$Logger.Level level, ResourceBundle bundle, String format, Object... params) {
    Objects.requireNonNull(level);
  }
}
