package classes.modern_test;

import java.util.HashMap;
import java.util.Collections;
import java.util.Map;

public class Java10MapCopyOf {
  public static void main(String[] args) {
    HashMap<String, String> source = new HashMap<>();
    source.put("x", "1");
    source.put("y", "2");
    Map<String, String> copy = Map.copyOf(source);
    source.put("z", "3");
    System.out.println(copy.size());
    System.out.println(copy.get("y"));
    System.out.println(copy.containsKey("z"));
    Map<String, String> factoryMap = Map.of("identity", "value");
    System.out.println(Map.copyOf(factoryMap) == factoryMap);
    Map<String, String> emptyFactoryMap = Map.of();
    Map<String, String> legacyEmptyMap = Collections.emptyMap();
    System.out.println(Map.of() == Map.of());
    System.out.println(Map.copyOf(emptyFactoryMap) == emptyFactoryMap);
    System.out.println(Map.copyOf(legacyEmptyMap) == legacyEmptyMap);
    Map<String, String> userUnmodifiableMap =
        Collections.unmodifiableMap(new HashMap<String, String>(factoryMap));
    System.out.println(Map.copyOf(userUnmodifiableMap) == userUnmodifiableMap);

    try {
      Map.copyOf(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HashMap<String, String> nullKey = new HashMap<>();
      nullKey.put(null, "x");
      Map.copyOf(nullKey);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      HashMap<String, String> nullValue = new HashMap<>();
      nullValue.put("x", null);
      Map.copyOf(nullValue);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      copy.put("z", "3");
      System.out.println(false);
    } catch (UnsupportedOperationException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
