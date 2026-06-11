package classes.modern_test;

import java.util.Map;

public class Java9MapFactory {
  public static void main(String[] args) {
    System.out.println(Map.of().size());
    System.out.println(Map.of("a", "x", "b", "y").get("b"));
    System.out.println(Map.of("a", "x", "b", "y").size());
    System.out.println(Map.entry("k", "v").getKey());
    System.out.println(Map.entry("k", "v").getValue());
    System.out.println(Map.<String, String>ofEntries() == Map.<String, String>of());
    System.out.println(Map.ofEntries(
        Map.entry("a", "0"),
        Map.entry("b", "1"),
        Map.entry("c", "2"),
        Map.entry("d", "3"),
        Map.entry("e", "4"),
        Map.entry("f", "5"),
        Map.entry("g", "6"),
        Map.entry("h", "7"),
        Map.entry("i", "8"),
        Map.entry("j", "9"),
        Map.entry("k", "10")).get("k"));
    try {
      Map.of("a", "x", null, "y");
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Map.of("a", null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Map.of("a", "x", "a", "y");
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Map.ofEntries(Map.entry("a", "x"), Map.entry("a", "y"));
      System.out.println(false);
    } catch (IllegalArgumentException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Map.entry("a", "x").setValue("y");
      System.out.println(false);
    } catch (UnsupportedOperationException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Map.of("a", "x").put("b", "y");
      System.out.println(false);
    } catch (UnsupportedOperationException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Map.of("a", "x").containsKey(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Map.of("a", "x").containsValue(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Map.of("a", "x").get(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Map.of("a", "x").getOrDefault(null, "default");
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Map.of("a", "x").keySet().contains(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Map.of("a", "x").values().contains(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Map.of("a", "x").entrySet().contains(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    System.out.println(Map.of().entrySet().contains(null));
  }
}
