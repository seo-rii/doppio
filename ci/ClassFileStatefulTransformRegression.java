package classes.modern_test;

import java.lang.classfile.*;
import java.lang.constant.*;

/** Public traversal-local state and callback order, not VM class definition. */
public final class ClassFileStatefulTransformRegression {
  private static int completed;
  private static void check(boolean value, String message) { if (!value) throw new AssertionError(message); completed++; }
  private static void fails(Class<? extends Throwable> type, Runnable action) {
    try { action.run(); throw new AssertionError("Missing " + type); }
    catch (Throwable failure) { if (!type.isInstance(failure)) throw new AssertionError(failure); completed++; }
  }
  @SuppressWarnings({"rawtypes", "unchecked"})
  private static void unresolved(ClassFileTransform transform) {
    fails(UnsupportedOperationException.class, () -> transform.atStart(null));
    fails(UnsupportedOperationException.class, () -> transform.accept(null, null));
    fails(UnsupportedOperationException.class, () -> transform.atEnd(null));
  }
  private static ClassModel source() {
    byte[] bytes = ClassFile.of().build(ClassDesc.of("classes.modern_test.StatefulOriginal"), b -> {
      b.withFlags(33).withField("a", ConstantDescs.CD_int, f -> f.withFlags(9));
      b.withField("b", ConstantDescs.CD_long, f -> f.withFlags(9));
      b.withMethodBody("left", MethodTypeDesc.of(ConstantDescs.CD_int), 9, c -> c.iconst_1().ireturn());
      b.withMethodBody("right", MethodTypeDesc.of(ConstantDescs.CD_int), 9, c -> c.iconst_2().ireturn());
    });
    return ClassFile.of().parse(bytes);
  }
  public static void main(String[] arguments) {
    fails(NullPointerException.class, () -> ClassTransform.ofStateful(null));
    fails(NullPointerException.class, () -> FieldTransform.ofStateful(null));
    fails(NullPointerException.class, () -> MethodTransform.ofStateful(null));
    fails(NullPointerException.class, () -> CodeTransform.ofStateful(null));
    unresolved(ClassTransform.ofStateful(() -> ClassTransform.ACCEPT_ALL));
    unresolved(FieldTransform.ofStateful(() -> FieldTransform.ACCEPT_ALL));
    unresolved(MethodTransform.ofStateful(() -> MethodTransform.ACCEPT_ALL));
    unresolved(CodeTransform.ofStateful(() -> CodeTransform.ACCEPT_ALL));
    ClassModel source = source(); ClassFile api = ClassFile.of();
    int[] classes = new int[3];
    ClassTransform classTransform = ClassTransform.ofStateful(() -> {
      classes[0]++;
      return new ClassTransform() {
        int phase;
        public void atStart(ClassBuilder b) { if (phase != 0) throw new AssertionError("shared class state"); phase = 1; classes[1]++; }
        public void accept(ClassBuilder b, ClassElement e) { if (phase != 1) throw new AssertionError("class phase"); b.with(e); }
        public void atEnd(ClassBuilder b) { phase = 2; classes[2]++; }
      };
    });
    api.transformClass(source, classTransform); api.transformClass(source, classTransform);
    check(classes[0] == 2 && classes[1] == 2 && classes[2] == 2, "class factory per traversal");
    int[] fields = new int[3];
    FieldTransform fieldTransform = FieldTransform.ofStateful(() -> {
      fields[0]++;
      return new FieldTransform() {
        int phase;
        public void atStart(FieldBuilder b) { if (phase != 0) throw new AssertionError("shared field state"); phase = 1; fields[1]++; }
        public void accept(FieldBuilder b, FieldElement e) { if (phase != 1) throw new AssertionError("field phase"); b.with(e); }
        public void atEnd(FieldBuilder b) { phase = 2; fields[2]++; }
      };
    });
    api.transformClass(source, ClassTransform.transformingFields(fieldTransform));
    api.transformClass(source, ClassTransform.transformingFields(fieldTransform));
    check(fields[0] == 4 && fields[1] == 4 && fields[2] == 4, "field factory per member traversal");
    int[] methods = new int[3];
    MethodTransform methodTransform = MethodTransform.ofStateful(() -> {
      methods[0]++;
      return new MethodTransform() {
        int phase;
        public void atStart(MethodBuilder b) { if (phase != 0) throw new AssertionError("shared method state"); phase = 1; methods[1]++; }
        public void accept(MethodBuilder b, MethodElement e) { if (phase != 1) throw new AssertionError("method phase"); b.with(e); }
        public void atEnd(MethodBuilder b) { phase = 2; methods[2]++; }
      };
    });
    api.transformClass(source, ClassTransform.transformingMethods(methodTransform));
    api.transformClass(source, ClassTransform.transformingMethods(methodTransform));
    check(methods[0] == 4 && methods[1] == 4 && methods[2] == 4, "method factory per member traversal");
    int[] codes = new int[3];
    CodeTransform codeTransform = CodeTransform.ofStateful(() -> {
      codes[0]++;
      return new CodeTransform() {
        int phase;
        public void atStart(CodeBuilder b) { if (phase != 0) throw new AssertionError("shared code state"); phase = 1; codes[1]++; }
        public void accept(CodeBuilder b, CodeElement e) { if (phase != 1) throw new AssertionError("code phase"); b.with(e); }
        public void atEnd(CodeBuilder b) { phase = 2; codes[2]++; }
      };
    });
    api.transformClass(source, ClassTransform.transformingMethodBodies(codeTransform));
    byte[] transformed = api.transformClass(source, ClassTransform.transformingMethodBodies(codeTransform));
    check(codes[0] == 4 && codes[1] == 4 && codes[2] == 4 && api.verify(transformed).isEmpty(), "code factories and actual output verification");
    StringBuilder order = new StringBuilder();
    ClassTransform first = ClassTransform.ofStateful(() -> { order.append("G1"); return new ClassTransform() {
      public void atStart(ClassBuilder b) { order.append("S1"); }
      public void accept(ClassBuilder b, ClassElement e) { b.with(e); }
      public void atEnd(ClassBuilder b) { order.append("F1"); }
    }; });
    ClassTransform next = ClassTransform.ofStateful(() -> { order.append("G2"); return new ClassTransform() {
      public void atStart(ClassBuilder b) { order.append("S2"); }
      public void accept(ClassBuilder b, ClassElement e) { b.with(e); }
      public void atEnd(ClassBuilder b) { order.append("F2"); }
    }; });
    api.transformClass(source, first.andThen(next));
    check(order.toString().equals("G2G1S2S1F1F2"), "all factories resolve before callbacks, downstream first");
    int[] nested = {0};
    api.transformClass(source, ClassTransform.ofStateful(() -> { nested[0]++; return ClassTransform.ofStateful(() -> {
      nested[0]++; return ClassTransform.ACCEPT_ALL;
    }); }));
    check(nested[0] == 2, "nested factories resolve recursively");
    int[] depth = {0}, reentrant = {0}; ClassTransform[] self = new ClassTransform[1];
    self[0] = ClassTransform.ofStateful(() -> { reentrant[0]++; return new ClassTransform() {
      int phase;
      public void atStart(ClassBuilder b) { phase = 1; if (++depth[0] == 1) api.transformClass(source, self[0]); depth[0]--; }
      public void accept(ClassBuilder b, ClassElement e) { if (phase != 1) throw new AssertionError("reentrant state overwritten"); b.with(e); }
      public void atEnd(ClassBuilder b) { phase = 2; }
    }; });
    api.transformClass(source, self[0]);
    check(reentrant[0] == 2 && depth[0] == 0, "reentrant traversals isolate each concrete instance");
    RuntimeException held = new RuntimeException("held-factory");
    try { api.transformClass(source, ClassTransform.ofStateful(() -> { throw held; })); throw new AssertionError("missing held factory failure"); }
    catch (RuntimeException failure) { check(failure == held, "factory failure identity"); }
    order.setLength(0);
    try { api.transformClass(source, ClassTransform.ofStateful(() -> new ClassTransform() {
      public void atStart(ClassBuilder b) { order.append('S'); }
      public void accept(ClassBuilder b, ClassElement e) { throw held; }
      public void atEnd(ClassBuilder b) { order.append('F'); }
    })); throw new AssertionError("missing held callback failure"); }
    catch (RuntimeException failure) { check(failure == held && order.toString().equals("S"), "callback failure, no end handler"); }
    fails(NullPointerException.class, () -> api.transformClass(source, ClassTransform.ofStateful(() -> null)));
    fails(NullPointerException.class, () -> ClassTransform.ACCEPT_ALL.andThen(null));
    fails(NullPointerException.class, () -> FieldTransform.ACCEPT_ALL.andThen(null));
    fails(NullPointerException.class, () -> MethodTransform.ACCEPT_ALL.andThen(null));
    fails(NullPointerException.class, () -> CodeTransform.ACCEPT_ALL.andThen(null));
    int before = codes[0];
    byte[] body = api.build(ClassDesc.of("classes.modern_test.StatefulBody"), b -> b.withMethodBody("value",
        MethodTypeDesc.of(ConstantDescs.CD_int), 9, c -> c.transforming(codeTransform, t -> t.iconst_1().ireturn())));
    check(codes[0] == before + 1 && api.verify(body).isEmpty(), "CodeBuilder.transforming resolves its factory");
    if (completed != 31) throw new AssertionError("Incomplete stateful profile: " + completed);
    System.out.println("CLASSFILE_STATEFUL_TRANSFORM_REGRESSION_OK|31");
  }
}
