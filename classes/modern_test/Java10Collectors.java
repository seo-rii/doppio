package classes.modern_test;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class Java10Collectors {
  public static void main(String[] args) {
    List<String> list = Stream.of("a", "b").collect(Collectors.toUnmodifiableList());
    System.out.println(list);
    try {
      list.add("c");
      System.out.println(false);
    } catch (UnsupportedOperationException e) {
      System.out.println(e.getClass().getName());
    }
    System.out.println(List.copyOf(list) == list);
    try {
      Stream.of("a", (String) null).collect(Collectors.toUnmodifiableList());
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Set<String> set = Stream.of("b", "a", "b").collect(Collectors.toUnmodifiableSet());
    System.out.println(set.size() + ":" + set.contains("a") + ":" + set.contains("b"));
    try {
      set.add("c");
      System.out.println(false);
    } catch (UnsupportedOperationException e) {
      System.out.println(e.getClass().getName());
    }
    System.out.println(Set.copyOf(set) == set);
    try {
      Stream.of("a", (String) null).collect(Collectors.toUnmodifiableSet());
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    Map<Character, Integer> map = Stream.of("a", "bb")
        .collect(Collectors.toUnmodifiableMap(value -> value.charAt(0), value -> value.length()));
    System.out.println(map.get(Character.valueOf('a')) + ":" + map.get(Character.valueOf('b')));
    try {
      map.put(Character.valueOf('c'), Integer.valueOf(3));
      System.out.println(false);
    } catch (UnsupportedOperationException e) {
      System.out.println(e.getClass().getName());
    }
    System.out.println(Map.copyOf(map) == map);
    try {
      Stream.of("a", "aa")
          .collect(Collectors.toUnmodifiableMap(value -> value.charAt(0), value -> value.length()));
      System.out.println(false);
    } catch (IllegalStateException e) {
      System.out.println(e.getClass().getName());
    }

    Map<Character, Integer> merged = Stream.of("a", "aa", "bbb")
        .collect(Collectors.toUnmodifiableMap(
            value -> value.charAt(0),
            value -> value.length(),
            (left, right) -> left + right));
    System.out.println(merged.get(Character.valueOf('a')) + ":" + merged.get(Character.valueOf('b')));
    System.out.println(Map.copyOf(merged) == merged);

    Map<Character, Integer> mergeNull = Stream.of("a", "aa")
        .collect(Collectors.toUnmodifiableMap(
            value -> value.charAt(0),
            value -> value.length(),
            (left, right) -> null));
    System.out.println(mergeNull.isEmpty());
    try {
      mergeNull.put(Character.valueOf('a'), Integer.valueOf(1));
      System.out.println(false);
    } catch (UnsupportedOperationException e) {
      System.out.println(e.getClass().getName());
    }

    try {
      Stream.of("a").collect(Collectors.toUnmodifiableMap(null, value -> value.length()));
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Stream.of("a").collect(Collectors.toUnmodifiableMap(value -> value.charAt(0), null));
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Stream.of("a")
          .collect(Collectors.toUnmodifiableMap(value -> value.charAt(0), value -> value.length(), null));
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Stream.of("a").collect(Collectors.toUnmodifiableMap(value -> null, value -> value.length()));
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Stream.of("a").collect(Collectors.toUnmodifiableMap(value -> value.charAt(0), value -> null));
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    System.out.println(Stream.of("a", null, "b").collect(Collectors.joining(",", "[", "]")));
  }
}
