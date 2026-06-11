package classes.modern_test;

import java.util.ListResourceBundle;
import java.util.ResourceBundle;

public class Java9SystemGetLogger {
  public static void main(String[] args) {
    System.Logger logger = System.getLogger("doppio.test");
    System.out.println(logger != null);
    System.out.println(logger.getName());
    System.out.println(logger instanceof System.Logger);

    ResourceBundle bundle = new ListResourceBundle() {
      protected Object[][] getContents() {
        return new Object[][] { { "key", "value" } };
      }
    };
    System.Logger bundled = System.getLogger("doppio.bundle", bundle);
    System.out.println(bundled != null);
    System.out.println(bundled.getName());
    System.out.println(bundled instanceof System.Logger);

    try {
      logger.isLoggable(null);
      System.out.println(false);
    } catch (NullPointerException ex) {
      System.out.println(ex.getClass().getName());
    }

    try {
      logger.log(null, "plain-null-level");
      System.out.println(false);
    } catch (NullPointerException ex) {
      System.out.println(ex.getClass().getName());
    }

    try {
      logger.log(null, (ResourceBundle) null, "fmt", new Object[] { "x" });
      System.out.println(false);
    } catch (NullPointerException ex) {
      System.out.println(ex.getClass().getName());
    }

    try {
      logger.log(null, (ResourceBundle) null, "msg", new RuntimeException("x"));
      System.out.println(false);
    } catch (NullPointerException ex) {
      System.out.println(ex.getClass().getName());
    }

    try {
      System.getLogger(null);
      System.out.println(false);
    } catch (NullPointerException ex) {
      System.out.println(ex.getClass().getName());
    }

    try {
      System.getLogger("doppio.bad", null);
      System.out.println(false);
    } catch (NullPointerException ex) {
      System.out.println(ex.getClass().getName());
    }
  }
}
