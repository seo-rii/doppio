package classes.modern_test;

import java.util.MissingFormatArgumentException;

public class Java15StringFormatted {
  public static void main(String[] args) {
    System.out.println("[%s:%02d]".formatted("item", 7));
    System.out.println("%s-%d-%b".formatted("x", 5, true));
    System.out.println("literal %% %s".formatted("ok"));
    System.out.println("[%s]".formatted((Object) null));

    Object[] values = new Object[] { "array", Integer.valueOf(3) };
    System.out.println("%s:%d".formatted(values));

    try {
      "%s %s".formatted("x");
      System.out.println(false);
    } catch (MissingFormatArgumentException ex) {
      System.out.println(ex.getClass().getName());
    }
  }
}
