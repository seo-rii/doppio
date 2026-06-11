package classes.modern_test;

public class Java9RuntimeVersion {
  private static void printVersion(String text) {
    Runtime.Version version = Runtime.Version.parse(text);
    System.out.println(version.major());
    System.out.println(version.minor());
    System.out.println(version.security());
    System.out.println(version.version());
    System.out.println(version.pre());
    System.out.println(version.build());
    System.out.println(version.optional());
    System.out.println(version.toString());
  }

  private static void printDecorated(String text) {
    Runtime.Version version = Runtime.Version.parse(text);
    System.out.println(version.pre());
    System.out.println(version.build());
    System.out.println(version.optional());
    System.out.println(version.toString());
  }

  public static void main(String[] args) {
    printVersion("9");
    printVersion("9.0.1");
    printVersion("9.0.1+7");
    printVersion("9.0.1-ea+7-LTS");
    printVersion("9.0.1-LTS");
    printDecorated("9-ea-opt");
    printDecorated("9+-opt");

    Runtime.Version withOptional = Runtime.Version.parse("9.0.1+7-LTS");
    Runtime.Version sameWithoutOptional = Runtime.Version.parse("9.0.1+7");
    Runtime.Version nextSecurity = Runtime.Version.parse("9.0.2");
    Runtime.Version earlyAccess = Runtime.Version.parse("9.0.1-ea");
    Runtime.Version laterBuild = Runtime.Version.parse("9.0.1+8");
    Runtime.Version numericPre10 = Runtime.Version.parse("9-10");
    Runtime.Version numericPre2 = Runtime.Version.parse("9-2");
    Runtime.Version numericPre1 = Runtime.Version.parse("9-1");
    Runtime.Version stringPre = Runtime.Version.parse("9-ea");
    System.out.println(withOptional.compareTo(sameWithoutOptional) > 0);
    System.out.println(withOptional.compareToIgnoreOptional(sameWithoutOptional));
    System.out.println(withOptional.equals(sameWithoutOptional));
    System.out.println(withOptional.equalsIgnoreOptional(sameWithoutOptional));
    System.out.println(withOptional.compareTo(nextSecurity) < 0);
    System.out.println(nextSecurity.compareTo(withOptional) > 0);
    System.out.println(earlyAccess.compareTo(withOptional) < 0);
    System.out.println(laterBuild.compareTo(withOptional) > 0);
    System.out.println(numericPre10.compareTo(numericPre2) > 0);
    System.out.println(numericPre2.compareTo(numericPre10) < 0);
    System.out.println(Runtime.Version.parse("9-01").compareTo(Runtime.Version.parse("9-1")));
    System.out.println(Runtime.Version.parse("9-01").equals(Runtime.Version.parse("9-1")));
    System.out.println(Runtime.Version.parse("9-01").equalsIgnoreOptional(Runtime.Version.parse("9-1")));
    System.out.println(Runtime.Version.parse("9-01").hashCode() == Runtime.Version.parse("9-1").hashCode());
    System.out.println(numericPre1.compareTo(stringPre) < 0);
    System.out.println(stringPre.compareTo(numericPre1) > 0);
    System.out.println(Runtime.Version.parse("9+1-10").compareTo(Runtime.Version.parse("9+1-2")) < 0);
    System.out.println(withOptional.hashCode() == Runtime.Version.parse("9.0.1+7-LTS").hashCode());

    try {
      withOptional.version().add(99);
      System.out.println(false);
    } catch (UnsupportedOperationException ex) {
      System.out.println(ex.getClass().getName());
    }
    try {
      Runtime.Version.parse(null);
      System.out.println(false);
    } catch (NullPointerException ex) {
      System.out.println(ex.getClass().getName());
    }
    try {
      Runtime.Version.parse("01");
      System.out.println(false);
    } catch (IllegalArgumentException ex) {
      System.out.println(ex.getClass().getName());
    }
    try {
      Runtime.Version.parse("9.0.0");
      System.out.println(false);
    } catch (IllegalArgumentException ex) {
      System.out.println(ex.getClass().getName());
    }
    try {
      Runtime.Version.parse("9-ea.foo");
      System.out.println(false);
    } catch (IllegalArgumentException ex) {
      System.out.println(ex.getClass().getName());
    }
  }
}
