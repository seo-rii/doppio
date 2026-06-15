package java.util;

public interface SequencedSet<E> extends Set<E>, SequencedCollection<E> {
  SequencedSet<E> reversed();
}
