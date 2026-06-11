package classes.modern_test;

public class Java11CharacterToString {
  public static void main(String[] args) {
    String ascii = Character.toString(65);
    String nul = Character.toString(0);
    String smile = Character.toString(0x1f600);
    String max = Character.toString(0x10ffff);

    System.out.println(ascii);
    System.out.println(nul.length());
    System.out.println((int) nul.charAt(0));
    System.out.println(smile.length());
    System.out.println(smile.codePointAt(0));
    System.out.println(max.length());
    System.out.println(max.codePointAt(0));
    printFailure("negative", () -> Character.toString(-1));
    printFailure("too-high", () -> Character.toString(0x110000));
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
