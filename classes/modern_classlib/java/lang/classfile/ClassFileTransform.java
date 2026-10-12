package java.lang.classfile;

public interface ClassFileTransform<C extends ClassFileTransform<C, E, B>,
    E extends ClassFileElement, B extends ClassFileBuilder<E, B>> {
  void accept(B builder, E element);
  default void atStart(B builder) {}
  default void atEnd(B builder) {}
  C andThen(C next);
}
