package classes.modern_test;

import java.util.Arrays;
import java.util.ResourceBundle;

public class Java9SystemLogger {
  private static final class RecordingLogger implements System.Logger {
    String last;
    int events;
    boolean loggable;

    RecordingLogger(boolean loggable) {
      this.loggable = loggable;
    }

    public String getName() {
      return "recording";
    }

    public boolean isLoggable(System.Logger.Level level) {
      return loggable && level != System.Logger.Level.OFF;
    }

    private String levelName(System.Logger.Level level) {
      return level == null ? "null" : level.getName();
    }

    public void log(System.Logger.Level level, ResourceBundle bundle, String message, Throwable thrown) {
      events++;
      last = levelName(level) + ":" + (bundle == null) + ":" + message + ":" + (thrown != null);
    }

    public void log(System.Logger.Level level, ResourceBundle bundle, String format, Object... params) {
      events++;
      last = levelName(level) + ":" + (bundle == null) + ":" + format + ":" + Arrays.toString(params);
    }
  }

  public static void main(String[] args) {
    for (System.Logger.Level level : System.Logger.Level.values()) {
      System.out.println(level.getName() + ":" + level.getSeverity());
    }
    System.out.println(System.Logger.Level.valueOf("INFO") == System.Logger.Level.INFO);
    System.out.println(System.Logger.class.getName());
    System.out.println(System.Logger.Level.class.getName());

    RecordingLogger logger = new RecordingLogger(true);
    System.out.println(logger.getName());
    System.out.println(logger.isLoggable(System.Logger.Level.INFO));
    System.out.println(logger.isLoggable(System.Logger.Level.OFF));
    logger.log(System.Logger.Level.INFO, "plain");
    System.out.println(logger.events + ":" + logger.last);
    logger.log(System.Logger.Level.WARNING, new Object() {
      public String toString() {
        return "object-message";
      }
    });
    System.out.println(logger.events + ":" + logger.last);
    logger.log(System.Logger.Level.ERROR, "with-throwable", new IllegalArgumentException("bad"));
    System.out.println(logger.events + ":" + logger.last);
    logger.log(System.Logger.Level.DEBUG, "format", "x", Integer.valueOf(3));
    System.out.println(logger.events + ":" + logger.last);

    final int[] supplierCalls = { 0 };
    logger.log(System.Logger.Level.TRACE, () -> {
      supplierCalls[0]++;
      return "supplier-message";
    });
    System.out.println(logger.events + ":" + logger.last + ":" + supplierCalls[0]);

    RecordingLogger disabled = new RecordingLogger(false);
    disabled.log(System.Logger.Level.TRACE, () -> {
      supplierCalls[0]++;
      return "bad";
    });
    System.out.println(disabled.events + ":" + supplierCalls[0]);

    try {
      logger.log(System.Logger.Level.INFO, (java.util.function.Supplier<String>) null);
      System.out.println(false);
    } catch (NullPointerException ex) {
      System.out.println(ex.getClass().getName() + ":" + logger.events);
    }
    try {
      logger.log(null, () -> {
        supplierCalls[0]++;
        return "bad";
      });
      System.out.println(false);
    } catch (NullPointerException ex) {
      System.out.println(ex.getClass().getName() + ":" + supplierCalls[0] + ":" + logger.events);
    }
    try {
      logger.log(System.Logger.Level.INFO, (Object) null);
      System.out.println(false);
    } catch (NullPointerException ex) {
      System.out.println(ex.getClass().getName() + ":" + logger.events);
    }

    logger.log(null, "plain-null-level");
    System.out.println(logger.events + ":" + logger.last);
    logger.log(null, "throw-null-level", new RuntimeException("x"));
    System.out.println(logger.events + ":" + logger.last);
    logger.log(null, "fmt-null-level", "a");
    System.out.println(logger.events + ":" + logger.last);

    final int[] objectCalls = { 0 };
    disabled.log(System.Logger.Level.INFO, new Object() {
      public String toString() {
        objectCalls[0]++;
        return "bad";
      }
    });
    System.out.println(disabled.events + ":" + objectCalls[0]);
    try {
      disabled.log(null, new Object());
      System.out.println(false);
    } catch (NullPointerException ex) {
      System.out.println(ex.getClass().getName() + ":" + disabled.events);
    }
  }
}
