package classes.modern_test;

public class Java10RuntimeVersion {
  private static void printAccessors(String text) {
    Runtime.Version version = Runtime.Version.parse(text);
    System.out.println(version.feature());
    System.out.println(version.interim());
    System.out.println(version.update());
    System.out.println(version.patch());
    System.out.println(version.version());
    System.out.println(version.toString());
  }

  public static void main(String[] args) {
    printAccessors("10");
    printAccessors("10.0.1.2");

    Runtime.Version decorated = Runtime.Version.parse("10.2.3.4+5-opt");
    System.out.println(decorated.feature());
    System.out.println(decorated.interim());
    System.out.println(decorated.update());
    System.out.println(decorated.patch());
    System.out.println(decorated.build());
    System.out.println(decorated.optional());
  }
}
