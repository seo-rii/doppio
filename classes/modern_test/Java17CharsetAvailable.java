package classes.modern_test;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.SortedMap;

public class Java17CharsetAvailable {
  public static void main(String[] args) {
    SortedMap<String, Charset> available = Charset.availableCharsets();
    System.out.println(available.containsKey("UTF-8"));
    System.out.println(available.containsKey("utf-8"));
    System.out.println(available.get("utf-8").name());
    System.out.println(available.get("US-ASCII").name());
    System.out.println(available.comparator() != null);
    System.out.println(available.size() > 3);
    System.out.println(available == Charset.availableCharsets());
    printFailure("put", () -> available.put("X-TEST", StandardCharsets.UTF_8));
  }

  private static void printFailure(String label, Throwing action) {
    try {
      action.run();
      System.out.println(label + ":ok");
    } catch (Throwable t) {
      System.out.println(label + ":" + t.getClass().getName());
    }
  }

  private interface Throwing {
    void run();
  }
}
