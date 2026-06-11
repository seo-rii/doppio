package classes.modern_test;

import java.util.AbstractMap;
import java.util.Map;

public class Java17MapEntryCopyOf {
  public static void main(String[] args) {
    AbstractMap.SimpleEntry<String, String> mutableEntry = new AbstractMap.SimpleEntry<>("entry", "value");
    Map.Entry<String, String> entryCopy = Map.Entry.copyOf(mutableEntry);
    mutableEntry.setValue("changed");
    System.out.println(entryCopy.getKey());
    System.out.println(entryCopy.getValue());
    try {
      entryCopy.setValue("again");
      System.out.println(false);
    } catch (UnsupportedOperationException e) {
      System.out.println(e.getClass().getName());
    }

    Map.Entry<String, String> immutableEntry = Map.entry("same", "entry");
    System.out.println(Map.Entry.copyOf(immutableEntry) == immutableEntry);
    Map.Entry<String, String> simpleImmutableEntry =
        new AbstractMap.SimpleImmutableEntry<String, String>("same", "entry");
    System.out.println(Map.Entry.copyOf(simpleImmutableEntry) == simpleImmutableEntry);
    Map.Entry<String, String> immutableEntryCopy = Map.Entry.copyOf(simpleImmutableEntry);
    System.out.println(immutableEntryCopy.equals(simpleImmutableEntry));
    System.out.println(immutableEntryCopy.hashCode() == simpleImmutableEntry.hashCode());
    System.out.println(immutableEntryCopy.toString());
    try {
      immutableEntryCopy.setValue("changed");
      System.out.println(false);
    } catch (UnsupportedOperationException e) {
      System.out.println(e.getClass().getName());
    }

    try {
      Map.Entry.copyOf(null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Map.Entry.copyOf(new AbstractMap.SimpleEntry<String, String>(null, "x"));
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      Map.Entry.copyOf(new AbstractMap.SimpleEntry<String, String>("x", null));
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
