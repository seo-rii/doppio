package java.lang.classfile;

import java.util.Objects;
import java.util.function.Consumer;

public interface CodeTransform extends ClassFileTransform<CodeTransform, CodeElement, CodeBuilder> {
  CodeTransform ACCEPT_ALL = (builder, element) -> builder.with(element);
  static CodeTransform endHandler(Consumer<CodeBuilder> handler) {
    Objects.requireNonNull(handler);
    return new CodeTransform() {
      public void accept(CodeBuilder builder, CodeElement element) { builder.with(element); }
      public void atEnd(CodeBuilder builder) { handler.accept(builder); }
    };
  }
  default CodeTransform andThen(CodeTransform next) {
    Objects.requireNonNull(next); CodeTransform first = this;
    return new CodeTransform() {
      public void atStart(CodeBuilder builder) { next.atStart(builder); first.atStart(DoppioBuilders.forward(builder, next)); }
      public void accept(CodeBuilder builder, CodeElement element) { first.accept(DoppioBuilders.forward(builder, next), element); }
      public void atEnd(CodeBuilder builder) { first.atEnd(DoppioBuilders.forward(builder, next)); next.atEnd(builder); }
    };
  }
}
