package java.lang.classfile;

import java.lang.classfile.constantpool.ConstantPoolBuilder;
import java.util.Objects;
import java.util.function.Consumer;

public interface ClassFileBuilder<E extends ClassFileElement, B extends ClassFileBuilder<E, B>> extends Consumer<E> {
  B with(E element);
  ConstantPoolBuilder constantPool();
  default void accept(E element) { with(Objects.requireNonNull(element)); }
  @SuppressWarnings("unchecked")
  default B transform(CompoundElement<E> model, ClassFileTransform<?, E, B> transform) {
    Objects.requireNonNull(model);
    Objects.requireNonNull(transform);
    B self = (B) this;
    transform.atStart(self);
    model.forEach(element -> transform.accept(self, element));
    transform.atEnd(self);
    return self;
  }
}
