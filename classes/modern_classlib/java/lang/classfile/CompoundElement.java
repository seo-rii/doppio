package java.lang.classfile;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.function.Consumer;
import java.util.stream.Stream;

public interface CompoundElement<E extends ClassFileElement> extends ClassFileElement, Iterable<E> {
  void forEach(Consumer<? super E> consumer);
  default Iterator<E> iterator() { return elementList().iterator(); }
  default Stream<E> elementStream() { return elementList().stream(); }
  default List<E> elementList() {
    List<E> elements = new ArrayList<E>();
    forEach(elements::add);
    return Collections.unmodifiableList(elements);
  }
  default String toDebugString() { return elementList().toString(); }
}
