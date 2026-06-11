package classes.modern_test;

import java.util.ArrayList;
import java.util.Collection;
import java.util.function.IntFunction;

public class Java11CollectionToArray {
  private static int requestedSize;

  public static void main(String[] args) {
    ArrayList<String> list = new ArrayList<>();
    list.add("a");
    list.add("b");
    String[] values = list.toArray(new IntFunction<String[]>() {
      public String[] apply(int size) {
        requestedSize = size;
        return new String[size];
      }
    });
    System.out.println(requestedSize);
    System.out.println(values.length);
    System.out.println(values[1]);

    Collection<String> empty = new ArrayList<>();
    String[] emptyValues = empty.toArray(new IntFunction<String[]>() {
      public String[] apply(int size) {
        requestedSize = size;
        return new String[size];
      }
    });
    System.out.println(requestedSize);
    System.out.println(emptyValues.length);

    final String[][] oversizedHolder = new String[1][];
    String[] oversizedValues = list.toArray(new IntFunction<String[]>() {
      public String[] apply(int size) {
        requestedSize = size;
        oversizedHolder[0] = new String[5];
        oversizedHolder[0][4] = "tail";
        return oversizedHolder[0];
      }
    });
    System.out.println(requestedSize);
    System.out.println(oversizedValues == oversizedHolder[0]);
    System.out.println(oversizedValues.length);
    System.out.println(oversizedValues[0]);
    System.out.println(oversizedValues[1]);
    System.out.println(oversizedValues[2] == null);
    System.out.println(oversizedValues[4]);

    try {
      list.toArray((IntFunction<String[]>) null);
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    try {
      list.toArray(new IntFunction<String[]>() {
        public String[] apply(int size) {
          return null;
        }
      });
      System.out.println(false);
    } catch (NullPointerException e) {
      System.out.println(e.getClass().getName());
    }

    try {
      list.toArray(new IntFunction<Object[]>() {
        public Object[] apply(int size) {
          return new Integer[size];
        }
      });
      System.out.println(false);
    } catch (ArrayStoreException e) {
      System.out.println(e.getClass().getName());
    }
  }
}
