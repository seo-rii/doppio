package classes.modern_test;

public class Java9CoreLang {
  public static void main(String[] args) {
    Thread.onSpinWait();
    Thread.onSpinWait();
    System.out.println("spin");

    Runtime.Version version = Runtime.version();
    System.out.println(version != null);
    System.out.println(!version.version().isEmpty());
    System.out.println(version.major() >= 9);
    System.out.println(version.version().get(0).intValue() == version.major());
    System.out.println(version.toString().length() > 0);
    System.out.println(Runtime.version() == version);
  }
}
