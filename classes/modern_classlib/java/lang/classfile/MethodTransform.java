package java.lang.classfile;

import java.util.Objects;
import java.util.function.Consumer;
import java.util.function.Predicate;

public interface MethodTransform extends ClassFileTransform<MethodTransform, MethodElement, MethodBuilder> {
  MethodTransform ACCEPT_ALL = (builder, element) -> builder.with(element);
  static MethodTransform dropping(Predicate<MethodElement> predicate) {
    Objects.requireNonNull(predicate);
    return (builder, element) -> { if (!predicate.test(element)) builder.with(element); };
  }
  static MethodTransform endHandler(Consumer<MethodBuilder> handler) {
    Objects.requireNonNull(handler);
    return new MethodTransform() {
      public void accept(MethodBuilder builder, MethodElement element) { builder.with(element); }
      public void atEnd(MethodBuilder builder) { handler.accept(builder); }
    };
  }
  static MethodTransform transformingCode(CodeTransform transform) {
    Objects.requireNonNull(transform);
    return (builder, element) -> {
      if (element instanceof CodeModel) builder.transformCode((CodeModel) element, transform);
      else builder.with(element);
    };
  }
  default MethodTransform andThen(MethodTransform next) {
    Objects.requireNonNull(next); MethodTransform first = this;
    return new MethodTransform() {
      public void atStart(MethodBuilder builder) { next.atStart(builder); first.atStart(DoppioBuilders.forward(builder, next)); }
      public void accept(MethodBuilder builder, MethodElement element) { first.accept(DoppioBuilders.forward(builder, next), element); }
      public void atEnd(MethodBuilder builder) { first.atEnd(DoppioBuilders.forward(builder, next)); next.atEnd(builder); }
    };
  }
}
