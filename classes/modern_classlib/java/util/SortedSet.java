package java.util;

public interface SortedSet<E> extends Set<E>, SequencedSet<E> {
  Comparator<? super E> comparator();

  SortedSet<E> subSet(E fromElement, E toElement);

  SortedSet<E> headSet(E toElement);

  SortedSet<E> tailSet(E fromElement);

  E first();

  E last();

  default Spliterator<E> spliterator() {
    return Spliterators.spliterator(this,
        Spliterator.DISTINCT | Spliterator.ORDERED | Spliterator.SORTED);
  }

  default void addFirst(E e) {
    throw new UnsupportedOperationException();
  }

  default void addLast(E e) {
    throw new UnsupportedOperationException();
  }

  default E getFirst() {
    return first();
  }

  default E getLast() {
    return last();
  }

  default E removeFirst() {
    E element = first();
    remove(element);
    return element;
  }

  default E removeLast() {
    E element = last();
    remove(element);
    return element;
  }

  default SortedSet<E> reversed() {
    final SortedSet<E> forward = this;
    if (forward instanceof NavigableSet) {
      return ((NavigableSet<E>) forward).descendingSet();
    }
    return new SortedSet<E>() {
      public Comparator<? super E> comparator() {
        Comparator<? super E> comparator = forward.comparator();
        if (comparator == null) {
          return Collections.reverseOrder();
        }
        return Collections.reverseOrder(comparator);
      }

      public SortedSet<E> subSet(E fromElement, E toElement) {
        throw new UnsupportedOperationException();
      }

      public SortedSet<E> headSet(E toElement) {
        throw new UnsupportedOperationException();
      }

      public SortedSet<E> tailSet(E fromElement) {
        throw new UnsupportedOperationException();
      }

      public E first() {
        return forward.last();
      }

      public E last() {
        return forward.first();
      }

      public int size() {
        return forward.size();
      }

      public boolean isEmpty() {
        return forward.isEmpty();
      }

      public boolean contains(Object o) {
        return forward.contains(o);
      }

      public Iterator<E> iterator() {
        final ArrayList<E> values = new ArrayList<E>();
        for (E element : forward) {
          values.add(element);
        }
        return new Iterator<E>() {
          private int index = values.size();
          private E lastReturned;
          private boolean canRemove;

          public boolean hasNext() {
            return index > 0;
          }

          public E next() {
            if (!hasNext()) {
              throw new NoSuchElementException();
            }
            lastReturned = values.get(--index);
            canRemove = true;
            return lastReturned;
          }

          public void remove() {
            if (!canRemove) {
              throw new IllegalStateException();
            }
            forward.remove(lastReturned);
            canRemove = false;
          }
        };
      }

      public Object[] toArray() {
        ArrayList<E> values = new ArrayList<E>();
        for (E element : this) {
          values.add(element);
        }
        return values.toArray();
      }

      public <T> T[] toArray(T[] a) {
        ArrayList<E> values = new ArrayList<E>();
        for (E element : this) {
          values.add(element);
        }
        return values.toArray(a);
      }

      public boolean add(E e) {
        return forward.add(e);
      }

      public boolean remove(Object o) {
        return forward.remove(o);
      }

      public boolean containsAll(Collection<?> c) {
        return forward.containsAll(c);
      }

      public boolean addAll(Collection<? extends E> c) {
        return forward.addAll(c);
      }

      public boolean retainAll(Collection<?> c) {
        return forward.retainAll(c);
      }

      public boolean removeAll(Collection<?> c) {
        return forward.removeAll(c);
      }

      public void clear() {
        forward.clear();
      }

      public boolean equals(Object o) {
        return forward.equals(o);
      }

      public int hashCode() {
        return forward.hashCode();
      }

      public SortedSet<E> reversed() {
        return forward;
      }
    };
  }
}
