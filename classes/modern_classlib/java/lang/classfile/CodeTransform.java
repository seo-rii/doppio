package java.lang.classfile;

import java.util.Objects;
import java.util.function.Consumer;
import java.util.function.Supplier;

public interface CodeTransform extends ClassFileTransform<CodeTransform, CodeElement, CodeBuilder> {
  CodeTransform ACCEPT_ALL = (builder, element) -> builder.with(element);
  static CodeTransform ofStateful(Supplier<CodeTransform> supplier) { return DoppioStatefulTransforms.codeFactory(supplier); }
  static CodeTransform endHandler(Consumer<CodeBuilder> handler) {
    Objects.requireNonNull(handler);
    return new CodeTransform() {
      public void accept(CodeBuilder builder, CodeElement element) { builder.with(element); }
      public void atEnd(CodeBuilder builder) { handler.accept(builder); }
    };
  }
  default CodeTransform andThen(CodeTransform next) {
    return DoppioStatefulTransforms.chain(this, next);
  }
}
