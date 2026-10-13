package java.lang.classfile;

import java.util.Objects;
import java.util.function.Consumer;
import java.util.function.Supplier;

/** Private traversal-local callbacks; reusable factories never retain traversal state. */
final class DoppioStatefulTransforms {
  private DoppioStatefulTransforms() {}
  static final class Resolved<E extends ClassFileElement> {
    final Consumer<E> consumer;
    final Runnable start, end;
    Resolved(Consumer<E> consumer, Runnable start, Runnable end) {
      this.consumer = consumer; this.start = start; this.end = end;
    }
  }
  private interface Resolver<E extends ClassFileElement, B extends ClassFileBuilder<E, B>> {
    Resolved<E> resolve(B builder);
  }
  @SuppressWarnings("unchecked")
  static <E extends ClassFileElement, B extends ClassFileBuilder<E, B>> Resolved<E> resolve(
      ClassFileTransform<?, E, B> transform, B builder) {
    if (transform instanceof Resolver) return ((Resolver<E, B>) transform).resolve(builder);
    return new Resolved<E>(element -> transform.accept(builder, element),
        () -> transform.atStart(builder), () -> transform.atEnd(builder));
  }
  private static <E extends ClassFileElement> Resolved<E> join(Resolved<E> first, Resolved<E> next) {
    return new Resolved<E>(first.consumer, () -> { next.start.run(); first.start.run(); },
        () -> { first.end.run(); next.end.run(); });
  }
  private static UnsupportedOperationException unresolved() {
    return new UnsupportedOperationException("transforms must be resolved before running");
  }
  private abstract static class ClassPending implements ClassTransform, Resolver<ClassElement, ClassBuilder> {
    public void accept(ClassBuilder builder, ClassElement element) { throw unresolved(); }
    public void atStart(ClassBuilder builder) { throw unresolved(); }
    public void atEnd(ClassBuilder builder) { throw unresolved(); }
  }
  private abstract static class FieldPending implements FieldTransform, Resolver<FieldElement, FieldBuilder> {
    public void accept(FieldBuilder builder, FieldElement element) { throw unresolved(); }
    public void atStart(FieldBuilder builder) { throw unresolved(); }
    public void atEnd(FieldBuilder builder) { throw unresolved(); }
  }
  private abstract static class MethodPending implements MethodTransform, Resolver<MethodElement, MethodBuilder> {
    public void accept(MethodBuilder builder, MethodElement element) { throw unresolved(); }
    public void atStart(MethodBuilder builder) { throw unresolved(); }
    public void atEnd(MethodBuilder builder) { throw unresolved(); }
  }
  private abstract static class CodePending implements CodeTransform, Resolver<CodeElement, CodeBuilder> {
    public void accept(CodeBuilder builder, CodeElement element) { throw unresolved(); }
    public void atStart(CodeBuilder builder) { throw unresolved(); }
    public void atEnd(CodeBuilder builder) { throw unresolved(); }
  }
  static ClassTransform classFactory(Supplier<ClassTransform> supplier) {
    Objects.requireNonNull(supplier);
    return new ClassPending() {
      public Resolved<ClassElement> resolve(ClassBuilder builder) {
        return DoppioStatefulTransforms.resolve(supplier.get(), builder);
      }
    };
  }
  static FieldTransform fieldFactory(Supplier<FieldTransform> supplier) {
    Objects.requireNonNull(supplier);
    return new FieldPending() {
      public Resolved<FieldElement> resolve(FieldBuilder builder) {
        return DoppioStatefulTransforms.resolve(supplier.get(), builder);
      }
    };
  }
  static MethodTransform methodFactory(Supplier<MethodTransform> supplier) {
    Objects.requireNonNull(supplier);
    return new MethodPending() {
      public Resolved<MethodElement> resolve(MethodBuilder builder) {
        return DoppioStatefulTransforms.resolve(supplier.get(), builder);
      }
    };
  }
  static CodeTransform codeFactory(Supplier<CodeTransform> supplier) {
    Objects.requireNonNull(supplier);
    return new CodePending() {
      public Resolved<CodeElement> resolve(CodeBuilder builder) {
        return DoppioStatefulTransforms.resolve(supplier.get(), builder);
      }
    };
  }
  static ClassTransform chain(ClassTransform first, ClassTransform next) {
    Objects.requireNonNull(next);
    return new ClassPending() {
      public Resolved<ClassElement> resolve(ClassBuilder builder) {
        Resolved<ClassElement> downstream = DoppioStatefulTransforms.resolve(next, builder);
        ClassTransform consumer = (ignored, element) -> downstream.consumer.accept(element);
        return join(DoppioStatefulTransforms.resolve(first, DoppioBuilders.forward(builder, consumer)), downstream);
      }
    };
  }
  static FieldTransform chain(FieldTransform first, FieldTransform next) {
    Objects.requireNonNull(next);
    return new FieldPending() {
      public Resolved<FieldElement> resolve(FieldBuilder builder) {
        Resolved<FieldElement> downstream = DoppioStatefulTransforms.resolve(next, builder);
        FieldTransform consumer = (ignored, element) -> downstream.consumer.accept(element);
        return join(DoppioStatefulTransforms.resolve(first, DoppioBuilders.forward(builder, consumer)), downstream);
      }
    };
  }
  static MethodTransform chain(MethodTransform first, MethodTransform next) {
    Objects.requireNonNull(next);
    return new MethodPending() {
      public Resolved<MethodElement> resolve(MethodBuilder builder) {
        Resolved<MethodElement> downstream = DoppioStatefulTransforms.resolve(next, builder);
        MethodTransform consumer = (ignored, element) -> downstream.consumer.accept(element);
        return join(DoppioStatefulTransforms.resolve(first, DoppioBuilders.forward(builder, consumer)), downstream);
      }
    };
  }
  static CodeTransform chain(CodeTransform first, CodeTransform next) {
    Objects.requireNonNull(next);
    return new CodePending() {
      public Resolved<CodeElement> resolve(CodeBuilder builder) {
        Resolved<CodeElement> downstream = DoppioStatefulTransforms.resolve(next, builder);
        CodeTransform consumer = (ignored, element) -> downstream.consumer.accept(element);
        return join(DoppioStatefulTransforms.resolve(first, DoppioBuilders.forward(builder, consumer)), downstream);
      }
    };
  }
}
