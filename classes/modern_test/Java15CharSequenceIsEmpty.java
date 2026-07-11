package classes.modern_test;

public class Java15CharSequenceIsEmpty {
  public static void main(String[] args) {
    CharSequence empty = "";
    CharSequence builderEmpty = new StringBuilder();
    CharSequence nonEmpty = "x";
    CharSequence builderNonEmpty = new StringBuilder("x");

    System.out.println(empty.isEmpty());
    System.out.println(builderEmpty.isEmpty());
    System.out.println(nonEmpty.isEmpty());
    System.out.println(builderNonEmpty.isEmpty());
    System.out.println(new FixedCharSequence("").isEmpty());
    System.out.println(new FixedCharSequence("custom").isEmpty());

    CharSequence surrogatePair = "A\uD83D\uDE00";
    System.out.println(surrogatePair.chars().count());
    System.out.println(surrogatePair.codePoints().count());
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
