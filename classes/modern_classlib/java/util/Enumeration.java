package java.util;

public interface Enumeration<E> {
  boolean hasMoreElements();

  E nextElement();

  default Iterator<E> asIterator() {
    final Enumeration<E> enumeration = this;
    return new Iterator<E>() {
      public boolean hasNext() {
        return enumeration.hasMoreElements();
      }

      public E next() {
        return enumeration.nextElement();
      }
    };
  }
}
