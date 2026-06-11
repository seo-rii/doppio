package classes.modern_test;

public class Java10LocalVariableTypeInference {
  public static void main(String[] args) {
    var prefix = "java";
    var base = 10;
    var values = new int[] {base, base + 1};
    for (var value : values) {
      System.out.println(prefix + value);
    }
  }
}
