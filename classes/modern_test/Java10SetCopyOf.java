package classes.modern_test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Set;

public class Java10SetCopyOf {
  public static void main(String[] args) {
    ArrayList<String> source = new ArrayList<>();
    source.add("x");
    source.add("y");
    source.add("x");
    Set<String> copy = Set.copyOf(source);
    source.add("z");
    System.out.println(copy.size());
    System.out.println(copy.contains("y"));
    System.out.println(copy.contains("z"));
    Set<String> factorySet = Set.of("identity");
    System.out.println(Set.copyOf(factorySet) == factorySet);
    Set<String> emptyFactorySet = Set.of();
    Set<String> legacyEmptySet = Collections.emptySet();
    System.out.println(Set.of() == Set.of());
    System.out.println(Set.copyOf(emptyFactorySet) == emptyFactorySet);
    System.out.println(Set.copyOf(legacyEmptySet) == legacyEmptySet);
    Set<String> userUnmodifiableSet =
        Collections.unmodifiableSet(Set.copyOf(factorySet));
    System.out.println(Set.copyOf(userUnmodifiableSet) == userUnmodifiableSet);
    try {
      Set.copyOf(Arrays.asList("x", null));
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Set.copyOf(null);
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
