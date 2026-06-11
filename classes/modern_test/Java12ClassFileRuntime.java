package classes.modern_test;

public class Java12ClassFileRuntime {
  public static void main(String[] args) {
    int total = 0;
    for (int value = 1; value <= 4; value++) {
      total += value * value;
    }
    System.out.println("java12:" + total);
  }
}
