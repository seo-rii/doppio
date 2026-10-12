package java.lang.classfile;

import java.util.Objects;
import java.util.function.Consumer;
import java.util.function.Predicate;

public interface FieldTransform extends ClassFileTransform<FieldTransform, FieldElement, FieldBuilder> {
  FieldTransform ACCEPT_ALL = (builder, element) -> builder.with(element);
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
    Objects.requireNonNull(next); FieldTransform first = this;
    return new FieldTransform() {
      public void atStart(FieldBuilder builder) { next.atStart(builder); first.atStart(DoppioBuilders.forward(builder, next)); }
      public void accept(FieldBuilder builder, FieldElement element) { first.accept(DoppioBuilders.forward(builder, next), element); }
      public void atEnd(FieldBuilder builder) { first.atEnd(DoppioBuilders.forward(builder, next)); next.atEnd(builder); }
    };
  }
}
