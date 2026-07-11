package classes.modern_test;

public class Java11CharSequenceCompare {
  public static void main(String[] args) {
    CharSequence abc = "abc";
    CharSequence abd = new StringBuilder("abd");
    CharSequence same = new StringBuilder("abc");
    CharSequence customAbc = new FixedCharSequence("abc");
    CharSequence customAb = new FixedCharSequence("ab");
    CharSequence customAbd = new FixedCharSequence("abd");

    System.out.println(CharSequence.compare(abc, abd) < 0);
    System.out.println(CharSequence.compare(abd, abc) > 0);
    System.out.println(CharSequence.compare(abc, same));
    System.out.println(CharSequence.compare("abc", "ab") > 0);
    System.out.println(CharSequence.compare("ab", "abc") < 0);
    System.out.println(CharSequence.compare(abc, abc));
    System.out.println(CharSequence.compare(customAbc, same));
    System.out.println(CharSequence.compare(customAbc, customAb) > 0);
    System.out.println(CharSequence.compare(customAbc, customAbd) < 0);

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

  private static class FixedCharSequence implements CharSequence {
    private final String value;

    FixedCharSequence(String value) {
      this.value = value;
    }

    public int length() {
      return value.length();
    }

    public char charAt(int index) {
      return value.charAt(index);
    }

    public CharSequence subSequence(int start, int end) {
      return value.subSequence(start, end);
    }

    public String toString() {
      return value;
    }
  }
}
