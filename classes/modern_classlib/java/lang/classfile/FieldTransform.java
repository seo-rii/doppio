package java.lang.classfile;

import java.util.Objects;
import java.util.function.Consumer;
import java.util.function.Predicate;
import java.util.function.Supplier;

public interface FieldTransform extends ClassFileTransform<FieldTransform, FieldElement, FieldBuilder> {
  FieldTransform ACCEPT_ALL = (builder, element) -> builder.with(element);
  static FieldTransform ofStateful(Supplier<FieldTransform> supplier) { return DoppioStatefulTransforms.fieldFactory(supplier); }
  static FieldTransform dropping(Predicate<FieldElement> predicate) {
    Objects.requireNonNull(predicate);
    return (builder, element) -> { if (!predicate.test(element)) builder.with(element); };
  }
  static FieldTransform endHandler(Consumer<FieldBuilder> handler) {
    Objects.requireNonNull(handler);
    return new FieldTransform() {
      public void accept(FieldBuilder builder, FieldElement element) { builder.with(element); }
      public void atEnd(FieldBuilder builder) { handler.accept(builder); }
    };
  }
  default FieldTransform andThen(FieldTransform next) {
    return DoppioStatefulTransforms.chain(this, next);
  }
}
