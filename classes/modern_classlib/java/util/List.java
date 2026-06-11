package java.util;

import java.util.function.UnaryOperator;

public interface List<E> extends Collection<E> {
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

  boolean addAll(int index, Collection<? extends E> c);

  boolean removeAll(Collection<?> c);

  boolean retainAll(Collection<?> c);

  default void replaceAll(UnaryOperator<E> operator) {
    Objects.requireNonNull(operator);
    ListIterator<E> iterator = listIterator();
    while (iterator.hasNext()) {
      iterator.set(operator.apply(iterator.next()));
    }
  }

  @SuppressWarnings({ "unchecked", "rawtypes" })
  default void sort(Comparator<? super E> c) {
    Object[] a = toArray();
    Arrays.sort(a, (Comparator) c);
    ListIterator<E> iterator = listIterator();
    for (Object element : a) {
      iterator.next();
      iterator.set((E) element);
    }
  }

  void clear();

  boolean equals(Object o);

  int hashCode();

  E get(int index);

  E set(int index, E element);

  void add(int index, E element);

  E remove(int index);

  int indexOf(Object o);

  int lastIndexOf(Object o);

  ListIterator<E> listIterator();

  ListIterator<E> listIterator(int index);

  List<E> subList(int fromIndex, int toIndex);

  default Spliterator<E> spliterator() {
    return Spliterators.spliterator(this, Spliterator.ORDERED);
  }

  static <E> List<E> of() {
    return ImmutableList.empty();
  }

  static <E> List<E> of(E e1) {
    return immutableList(e1);
  }

  static <E> List<E> of(E e1, E e2) {
    return immutableList(e1, e2);
  }

  static <E> List<E> of(E e1, E e2, E e3) {
    return immutableList(e1, e2, e3);
  }

  static <E> List<E> of(E e1, E e2, E e3, E e4) {
    return immutableList(e1, e2, e3, e4);
  }

  static <E> List<E> of(E e1, E e2, E e3, E e4, E e5) {
    return immutableList(e1, e2, e3, e4, e5);
  }

  static <E> List<E> of(E e1, E e2, E e3, E e4, E e5, E e6) {
    return immutableList(e1, e2, e3, e4, e5, e6);
  }

  static <E> List<E> of(E e1, E e2, E e3, E e4, E e5, E e6, E e7) {
    return immutableList(e1, e2, e3, e4, e5, e6, e7);
  }

  static <E> List<E> of(E e1, E e2, E e3, E e4, E e5, E e6, E e7, E e8) {
    return immutableList(e1, e2, e3, e4, e5, e6, e7, e8);
  }

  static <E> List<E> of(E e1, E e2, E e3, E e4, E e5, E e6, E e7, E e8, E e9) {
    return immutableList(e1, e2, e3, e4, e5, e6, e7, e8, e9);
  }

  static <E> List<E> of(E e1, E e2, E e3, E e4, E e5, E e6, E e7, E e8, E e9, E e10) {
    return immutableList(e1, e2, e3, e4, e5, e6, e7, e8, e9, e10);
  }

  @SafeVarargs
  static <E> List<E> of(E... elements) {
    return immutableList(elements);
  }

  static <E> List<E> copyOf(Collection<? extends E> coll) {
    Objects.requireNonNull(coll);
    if (coll instanceof ImmutableList) {
      @SuppressWarnings("unchecked")
      List<E> list = (List<E>) coll;
      return list;
    }
    if (coll.isEmpty()) {
      return ImmutableList.empty();
    }
    ArrayList<E> list = new ArrayList<E>(coll.size());
    for (E element : coll) {
      list.add(element);
    }
    return new ImmutableList<E>(list.toArray());
  }

  @SafeVarargs
  private static <E> List<E> immutableList(E... elements) {
    if (elements.length == 0) {
      return ImmutableList.empty();
    }
    return new ImmutableList<E>(elements);
  }
}

final class ImmutableList<E> extends AbstractList<E> implements RandomAccess {
  private static final ImmutableList<?> EMPTY = new ImmutableList<Object>(new Object[0]);

  private final Object[] elements;

  @SuppressWarnings("unchecked")
  static <E> ImmutableList<E> empty() {
    return (ImmutableList<E>) EMPTY;
  }

  ImmutableList(Object[] elements) {
    this.elements = elements.clone();
    for (int i = 0; i < this.elements.length; i++) {
      Objects.requireNonNull(this.elements[i]);
    }
  }

  public E get(int index) {
    @SuppressWarnings("unchecked")
    E element = (E) elements[index];
    return element;
  }

  public int size() {
    return elements.length;
  }

  public boolean contains(Object o) {
    Objects.requireNonNull(o);
    return super.contains(o);
  }

  public int indexOf(Object o) {
    Objects.requireNonNull(o);
    return super.indexOf(o);
  }

  public int lastIndexOf(Object o) {
    Objects.requireNonNull(o);
    return super.lastIndexOf(o);
  }
}
