package java.lang.classfile;

import java.util.Objects;
import java.util.function.Consumer;
import java.util.function.Predicate;
import java.util.function.Supplier;

public interface MethodTransform extends ClassFileTransform<MethodTransform, MethodElement, MethodBuilder> {
  MethodTransform ACCEPT_ALL = (builder, element) -> builder.with(element);
  static MethodTransform ofStateful(Supplier<MethodTransform> supplier) { return DoppioStatefulTransforms.methodFactory(supplier); }
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
    return DoppioStatefulTransforms.chain(this, next);
  }
}
