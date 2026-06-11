package classes.modern_test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class Java10ListCopyOf {
  public static void main(String[] args) {
    ArrayList<String> source = new ArrayList<>();
    source.add("x");
    source.add("y");
    List<String> copy = List.copyOf(source);
    source.add("z");
    System.out.println(copy.size());
    System.out.println(copy.get(1));
    List<String> factoryList = List.of("identity");
    System.out.println(List.copyOf(factoryList) == factoryList);
    List<String> emptyFactoryList = List.of();
    List<String> legacyEmptyList = Collections.emptyList();
    System.out.println(List.of() == List.of());
    System.out.println(List.copyOf(emptyFactoryList) == emptyFactoryList);
    System.out.println(List.copyOf(legacyEmptyList) == legacyEmptyList);
    List<String> userUnmodifiableList =
        Collections.unmodifiableList(new ArrayList<String>(factoryList));
    System.out.println(List.copyOf(userUnmodifiableList) == userUnmodifiableList);
    try {
      List.copyOf(Arrays.asList("x", null));
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      List.copyOf(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      copy.add("z");
      System.out.println(false);
    } catch (UnsupportedOperationException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
