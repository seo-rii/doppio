package classes.modern_test;

import java.util.Enumeration;
import java.util.Iterator;
import java.util.NoSuchElementException;
import java.util.Vector;

public class Java9EnumerationAsIterator {
  public static void main(String[] args) {
    Vector<String> values = new Vector<String>();
    values.add("one");
    values.add("two");

    Enumeration<String> enumeration = values.elements();
    Iterator<String> iterator = enumeration.asIterator();
    System.out.println(iterator.hasNext());
    System.out.println(iterator.next());
    System.out.println(iterator.next());
    System.out.println(iterator.hasNext());

    try {
      iterator.next();
      System.out.println(false);
    } catch (NoSuchElementException e) {
      System.out.println(e.getClass().getName());
    }
    try {
      iterator.remove();
      System.out.println(false);
    } catch (UnsupportedOperationException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
