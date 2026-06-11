package classes.modern_test;

public class Java13ClassFileRuntime {
  public static void main(String[] args) {
    String[] parts = new String[] { "java", "13", "runtime" };
    String result = "";
    for (int i = 0; i < parts.length; i++) {
      result += (i == 0 ? "" : ":") + parts[i];
    }
    System.out.println(result);
  }
}
