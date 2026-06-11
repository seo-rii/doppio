package classes.modern_test;

public class Java11StringMethods {
  public static void main(String[] args) {
    System.out.println("".isBlank());
    System.out.println(" \t\n".isBlank());
    System.out.println("\u2003".isBlank());
    System.out.println(" x ".isBlank());

    String padded = " \tjava\u2003";
    System.out.println("[" + padded.strip() + "]");
    System.out.println("[" + padded.stripLeading() + "]");
    System.out.println("[" + padded.stripTrailing() + "]");
    System.out.println("[" + "java".strip() + "]");

    String repeated = "ab".repeat(3);
    System.out.println(repeated);
    System.out.println("x".repeat(0).length());
    System.out.println("".repeat(5).length());
    System.out.println("z".repeat(1));

    try {
      "x".repeat(-1);
      System.out.println(false);
    } catch (IllegalArgumentException ex) {
      System.out.println(ex.getClass().getName());
    }
  }
}
