package java.util;

public interface Set<E> extends Collection<E> {
  int size();

  boolean isEmpty();

  boolean contains(Object o);

  Iterator<E> iterator();

  Object[] toArray();

  <T> T[] toArray(T[] a);

  boolean add(E e);

  boolean remove(Object o);

  boolean containsAll(Collection<?> c);

  boolean addAll(Collection<? extends E> c);

  boolean retainAll(Collection<?> c);

  boolean removeAll(Collection<?> c);

  void clear();

  boolean equals(Object o);

  int hashCode();

  default Spliterator<E> spliterator() {
    return Spliterators.spliterator(this, Spliterator.DISTINCT);
  }

  static <E> Set<E> of() {
    return ImmutableSet.empty();
  }

  static <E> Set<E> of(E e1) {
    return immutableSet(e1);
  }

  static <E> Set<E> of(E e1, E e2) {
    return immutableSet(e1, e2);
  }

  static <E> Set<E> of(E e1, E e2, E e3) {
    return immutableSet(e1, e2, e3);
  }

  static <E> Set<E> of(E e1, E e2, E e3, E e4) {
    return immutableSet(e1, e2, e3, e4);
  }

  static <E> Set<E> of(E e1, E e2, E e3, E e4, E e5) {
    return immutableSet(e1, e2, e3, e4, e5);
  }

  static <E> Set<E> of(E e1, E e2, E e3, E e4, E e5, E e6) {
    return immutableSet(e1, e2, e3, e4, e5, e6);
  }

  static <E> Set<E> of(E e1, E e2, E e3, E e4, E e5, E e6, E e7) {
    return immutableSet(e1, e2, e3, e4, e5, e6, e7);
  }

  static <E> Set<E> of(E e1, E e2, E e3, E e4, E e5, E e6, E e7, E e8) {
    return immutableSet(e1, e2, e3, e4, e5, e6, e7, e8);
  }

  static <E> Set<E> of(E e1, E e2, E e3, E e4, E e5, E e6, E e7, E e8, E e9) {
    return immutableSet(e1, e2, e3, e4, e5, e6, e7, e8, e9);
  }

  static <E> Set<E> of(E e1, E e2, E e3, E e4, E e5, E e6, E e7, E e8, E e9, E e10) {
    return immutableSet(e1, e2, e3, e4, e5, e6, e7, e8, e9, e10);
  }

  @SafeVarargs
  static <E> Set<E> of(E... elements) {
    return immutableSet(elements);
  }

  static <E> Set<E> copyOf(Collection<? extends E> coll) {
    Objects.requireNonNull(coll);
    if (coll instanceof ImmutableSet) {
      @SuppressWarnings("unchecked")
      Set<E> set = (Set<E>) coll;
      return set;
    }
    if (coll.isEmpty()) {
      return ImmutableSet.empty();
    }
    return new ImmutableSet<E>(false, coll);
  }

  @SafeVarargs
  private static <E> Set<E> immutableSet(E... elements) {
    if (elements.length == 0) {
      return ImmutableSet.empty();
    }
    return new ImmutableSet<E>(true, elements);
  }
}

final class ImmutableSet<E> extends AbstractSet<E> {
  private static final ImmutableSet<?> EMPTY = new ImmutableSet<Object>(true, new Object[0]);

  private final HashSet<E> elements;

  @SuppressWarnings("unchecked")
  static <E> ImmutableSet<E> empty() {
    return (ImmutableSet<E>) EMPTY;
  }

  ImmutableSet(boolean rejectDuplicates, E[] elements) {
    this.elements = new HashSet<E>();
    for (E element : elements) {
      if (!this.elements.add(Objects.requireNonNull(element)) && rejectDuplicates) {
        throw new IllegalArgumentException("duplicate element: " + element);
      }
    }
  }

  ImmutableSet(boolean rejectDuplicates, Collection<? extends E> elements) {
    this.elements = new HashSet<E>();
    for (E element : elements) {
      if (!this.elements.add(Objects.requireNonNull(element)) && rejectDuplicates) {
        throw new IllegalArgumentException("duplicate element: " + element);
      }
    }
  }

  public Iterator<E> iterator() {
    return Collections.unmodifiableSet(elements).iterator();
  }

  public int size() {
    return elements.size();
  }

  public boolean contains(Object o) {
    Objects.requireNonNull(o);
    return elements.contains(o);
  }
}
