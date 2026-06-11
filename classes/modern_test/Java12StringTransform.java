package classes.modern_test;

import java.util.function.Function;

public class Java12StringTransform {
  public static void main(String[] args) {
    Function<CharSequence, String> bracket = value -> "[" + value + "]";
    System.out.println("java".transform(bracket));

    Object length = "java".transform(value -> Integer.valueOf(value.length()));
    System.out.println(length.getClass().getName() + ":" + length);

    Object nullResult = "java".transform(value -> null);
    System.out.println(nullResult == null);

    try {
      "x".transform(null);
      System.out.println(false);
    } catch (NullPointerException ex) {
      System.out.println(ex.getClass().getName());
    }

    try {
      "x".transform(value -> {
        throw new IllegalStateException("boom");
      });
      System.out.println(false);
    } catch (IllegalStateException ex) {
      System.out.println(ex.getClass().getName() + ":" + ex.getMessage());
    }
  }
}
