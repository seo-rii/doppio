package classes.modern_test;

public class Java11ConstantDynamicMore {
  public static void main(String[] args) {
    System.out.println("stub");
  }

  public static final class Support {
    public enum Choice {
      ALPHA,
      BETA
    }

    public static final String MESSAGE = "static-final";
  }
}
