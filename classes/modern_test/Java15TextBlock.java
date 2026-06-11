package classes.modern_test;

public class Java15TextBlock {
  public static void main(String[] args) {
    String block = """
        alpha
          beta
        gamma
        """;
    System.out.print(block);
    System.out.println(block.length());
  }
}
