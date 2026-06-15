package java.util;

public interface SequencedCollection<E> extends Collection<E> {
  SequencedCollection<E> reversed();

  default void addFirst(E e) {
    throw new UnsupportedOperationException();
  }

  default void addLast(E e) {
    throw new UnsupportedOperationException();
  }

  default E getFirst() {
    return iterator().next();
  }

  default E getLast() {
    return reversed().iterator().next();
  }

  default E removeFirst() {
    Iterator<E> iterator = iterator();
    E first = iterator.next();
    iterator.remove();
    return first;
  }

  default E removeLast() {
    Iterator<E> iterator = reversed().iterator();
    E last = iterator.next();
    iterator.remove();
    return last;
  }
}
