package classes.modern_test;

public class SealedViolation {
  public static void main(String[] args) {
    try {
      Object value = new Java17SealedClassVersion$Triangle();
      System.out.println(value.getClass().getName());
    } catch (LinkageError e) {
      System.out.println("rejected sealed subclass");
    }
  }
}
