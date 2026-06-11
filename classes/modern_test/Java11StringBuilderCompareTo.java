package classes.modern_test;

public class Java11StringBuilderCompareTo {
  public static void main(String[] args) {
    StringBuilder alpha = new StringBuilder("abc");
    StringBuilder beta = new StringBuilder("abd");
    StringBuilder same = new StringBuilder("abc");
    StringBuilder shorter = new StringBuilder("ab");
    StringBuilder longer = new StringBuilder("abcd");

    System.out.println(alpha.compareTo(beta) < 0);
    System.out.println(beta.compareTo(alpha) > 0);
    System.out.println(alpha.compareTo(same));
    System.out.println(alpha.compareTo(shorter) > 0);
    System.out.println(shorter.compareTo(alpha) < 0);
    System.out.println(alpha.compareTo(longer) < 0);
    alpha.append("z");
    System.out.println(alpha.compareTo(new StringBuilder("abcz")));
    System.out.println(new StringBuilder("\u0000").compareTo(new StringBuilder("\u0001")) < 0);
    printFailure("builder-null", () -> new StringBuilder("x").compareTo(null));

    StringBuffer first = new StringBuffer("abc");
    StringBuffer second = new StringBuffer("abd");
    StringBuffer equal = new StringBuffer("abc");
    StringBuffer prefix = new StringBuffer("abcd");

    System.out.println(first.compareTo(second) < 0);
    System.out.println(second.compareTo(first) > 0);
    System.out.println(first.compareTo(equal));
    System.out.println(prefix.compareTo(first) > 0);
    first.append("d");
    System.out.println(first.compareTo(prefix));
    printFailure("buffer-null", () -> new StringBuffer("x").compareTo(null));
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
