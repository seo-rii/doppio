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

    CharSequence surrogatePair = "A\uD83D\uDE00";
    System.out.println(surrogatePair.chars().count());
    System.out.println(surrogatePair.codePoints().count());
  }
}
