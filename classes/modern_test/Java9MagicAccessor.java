package classes.modern_test;

import java.lang.reflect.Constructor;

public class Java9MagicAccessor {
  private static final class PrivateBox {
    private final int value;

    private PrivateBox(int value) {
      this.value = value;
    }
  }

  public static void main(String[] args) throws Exception {
    Constructor<PrivateBox> constructor = PrivateBox.class.getDeclaredConstructor(int.class);
    constructor.setAccessible(true);

    int sum = 0;
    for (int i = 0; i < 32; i++) {
      sum += constructor.newInstance(i).value;
    }

    System.out.println(sum);
  }
}
