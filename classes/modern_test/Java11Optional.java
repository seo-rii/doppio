package classes.modern_test;

import java.util.Optional;

public class Java11Optional {
  public static void main(String[] args) {
    System.out.println(Optional.empty().isEmpty());
    System.out.println(Optional.of("x").isEmpty());
  }
}
