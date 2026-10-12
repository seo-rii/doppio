package java.lang.classfile;

import java.util.Objects;
import java.util.function.Consumer;
import java.util.function.Predicate;

public interface ClassTransform extends ClassFileTransform<ClassTransform, ClassElement, ClassBuilder> {
  ClassTransform ACCEPT_ALL = (builder, element) -> builder.with(element);
  static ClassTransform dropping(Predicate<ClassElement> predicate) {
    Objects.requireNonNull(predicate);
    return (builder, element) -> { if (!predicate.test(element)) builder.with(element); };
  }
  static ClassTransform endHandler(Consumer<ClassBuilder> handler) {
    Objects.requireNonNull(handler);
    return new ClassTransform() {
      public void accept(ClassBuilder builder, ClassElement element) { builder.with(element); }
      public void atEnd(ClassBuilder builder) { handler.accept(builder); }
    };
  }
  static ClassTransform transformingMethods(Predicate<MethodModel> predicate, MethodTransform transform) {
    Objects.requireNonNull(predicate); Objects.requireNonNull(transform);
    return (builder, element) -> {
      if (element instanceof MethodModel && predicate.test((MethodModel) element))
        builder.transformMethod((MethodModel) element, transform);
      else builder.with(element);
    };
  }
  static ClassTransform transformingMethods(MethodTransform transform) { return transformingMethods(method -> true, transform); }
  static ClassTransform transformingMethodBodies(Predicate<MethodModel> predicate, CodeTransform transform) {
    return transformingMethods(predicate, MethodTransform.transformingCode(transform));
  }
  static ClassTransform transformingMethodBodies(CodeTransform transform) { return transformingMethodBodies(method -> true, transform); }
  static ClassTransform transformingFields(FieldTransform transform) {
    Objects.requireNonNull(transform);
    return (builder, element) -> {
      if (element instanceof FieldModel) builder.transformField((FieldModel) element, transform);
      else builder.with(element);
    };
  }
  default ClassTransform andThen(ClassTransform next) {
    Objects.requireNonNull(next);
    ClassTransform first = this;
    return new ClassTransform() {
      public void atStart(ClassBuilder builder) {
        next.atStart(builder); first.atStart(DoppioBuilders.forward(builder, next));
      }
      public void accept(ClassBuilder builder, ClassElement element) { first.accept(DoppioBuilders.forward(builder, next), element); }
      public void atEnd(ClassBuilder builder) {
        first.atEnd(DoppioBuilders.forward(builder, next)); next.atEnd(builder);
      }
    };
  }
}
