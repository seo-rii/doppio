package java.util;

public interface Deque<E> extends Queue<E>, SequencedCollection<E> {
  void addFirst(E e);

  void addLast(E e);

  boolean offerFirst(E e);

  boolean offerLast(E e);

  E removeFirst();

  E removeLast();

  E pollFirst();

  E pollLast();

  E getFirst();

  E getLast();

  E peekFirst();

  E peekLast();

  boolean removeFirstOccurrence(Object o);

  boolean removeLastOccurrence(Object o);

  boolean add(E e);

  boolean offer(E e);

  E remove();

  E poll();

  E element();

  E peek();

  void push(E e);

  E pop();

  boolean remove(Object o);

  boolean contains(Object o);

  int size();

  Iterator<E> iterator();

  Iterator<E> descendingIterator();

  default Deque<E> reversed() {
    final Deque<E> forward = this;
    return new Deque<E>() {
      public void addFirst(E e) {
        forward.addLast(e);
      }

      public void addLast(E e) {
        forward.addFirst(e);
      }

      public boolean offerFirst(E e) {
        return forward.offerLast(e);
      }

      public boolean offerLast(E e) {
        return forward.offerFirst(e);
      }

      public E removeFirst() {
        return forward.removeLast();
      }

      public E removeLast() {
        return forward.removeFirst();
      }

      public E pollFirst() {
        return forward.pollLast();
      }

      public E pollLast() {
        return forward.pollFirst();
      }

      public E getFirst() {
        return forward.getLast();
      }

      public E getLast() {
        return forward.getFirst();
      }

      public E peekFirst() {
        return forward.peekLast();
      }

      public E peekLast() {
        return forward.peekFirst();
      }

      public boolean removeFirstOccurrence(Object o) {
        return forward.removeLastOccurrence(o);
      }

      public boolean removeLastOccurrence(Object o) {
        return forward.removeFirstOccurrence(o);
      }

      public boolean add(E e) {
        addLast(e);
        return true;
      }

      public boolean offer(E e) {
        return offerLast(e);
      }

      public E remove() {
        return removeFirst();
      }

      public E poll() {
        return pollFirst();
      }

      public E element() {
        return getFirst();
      }

      public E peek() {
        return peekFirst();
      }

      public void push(E e) {
        addFirst(e);
      }

      public E pop() {
        return removeFirst();
      }

      public boolean remove(Object o) {
        return removeFirstOccurrence(o);
      }

      public boolean contains(Object o) {
        return forward.contains(o);
      }

      public int size() {
        return forward.size();
      }

      public boolean isEmpty() {
        return forward.isEmpty();
      }

      public Iterator<E> iterator() {
        return forward.descendingIterator();
      }

      public Iterator<E> descendingIterator() {
        return forward.iterator();
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

      public boolean containsAll(Collection<?> c) {
        for (Object element : c) {
          if (!contains(element)) {
            return false;
          }
        }
        return true;
      }

      public boolean addAll(Collection<? extends E> c) {
        boolean modified = false;
        for (E element : c) {
          addLast(element);
          modified = true;
        }
        return modified;
      }

      public boolean removeAll(Collection<?> c) {
        return forward.removeAll(c);
      }

      public boolean retainAll(Collection<?> c) {
        return forward.retainAll(c);
      }

      public void clear() {
        forward.clear();
      }

      public Deque<E> reversed() {
        return forward;
      }
    };
  }
}
