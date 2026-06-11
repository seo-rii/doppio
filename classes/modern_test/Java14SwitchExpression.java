package classes.modern_test;

public class Java14SwitchExpression {
  public static void main(String[] args) {
    for (int value = 0; value < 4; value++) {
      String label = switch (value) {
        case 0 -> "zero";
        case 1, 2 -> "small";
        default -> {
          int doubled = value * 2;
          yield "other-" + doubled;
        }
      };
      System.out.println(value + ":" + label);
    }
  }
}
