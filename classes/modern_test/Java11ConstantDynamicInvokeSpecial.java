package classes.modern_test;

public class Java11ConstantDynamicInvokeSpecial {
  public static void main(String[] args) {
    System.out.println("stub");
  }

  public interface SpecialDefault {
    default String defaultValue(String suffix) {
      return "special:" + suffix;
    }
  }

  public static final class SpecialReceiver implements SpecialDefault {
  }
}
