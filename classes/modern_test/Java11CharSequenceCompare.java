package classes.modern_test;

public class Java11CharSequenceCompare {
  public static void main(String[] args) {
    CharSequence abc = "abc";
    CharSequence abd = new StringBuilder("abd");
    CharSequence same = new StringBuilder("abc");

    System.out.println(CharSequence.compare(abc, abd) < 0);
    System.out.println(CharSequence.compare(abd, abc) > 0);
    System.out.println(CharSequence.compare(abc, same));
    System.out.println(CharSequence.compare("abc", "ab") > 0);
    System.out.println(CharSequence.compare("ab", "abc") < 0);
    System.out.println(CharSequence.compare(abc, abc));

    try {
      CharSequence.compare(null, abc);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      CharSequence.compare(abc, null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
