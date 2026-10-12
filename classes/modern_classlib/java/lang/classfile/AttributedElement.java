package java.lang.classfile;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

public interface AttributedElement extends ClassFileElement {
  List<Attribute<?>> attributes();
  default <T extends Attribute<T>> Optional<T> findAttribute(AttributeMapper<T> mapper) {
    Objects.requireNonNull(mapper);
    for (Attribute<?> attribute : attributes()) {
      if (attribute.attributeMapper() == mapper) {
        @SuppressWarnings("unchecked") T value = (T) attribute;
        return Optional.of(value);
      }
    }
    return Optional.empty();
  }
  default <T extends Attribute<T>> List<T> findAttributes(AttributeMapper<T> mapper) {
    Objects.requireNonNull(mapper);
    List<T> matches = new ArrayList<T>();
    for (Attribute<?> attribute : attributes()) if (attribute.attributeMapper() == mapper) {
      @SuppressWarnings("unchecked") T value = (T) attribute;
      matches.add(value);
    }
    return Collections.unmodifiableList(matches);
  }
}
