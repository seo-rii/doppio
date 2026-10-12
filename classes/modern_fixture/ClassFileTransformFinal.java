package classes.modern_test;

import java.lang.classfile.Attributes;
import java.lang.classfile.ClassBuilder;
import java.lang.classfile.ClassElement;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.lang.classfile.ClassTransform;
import java.lang.classfile.CodeBuilder;
import java.lang.classfile.CodeElement;
import java.lang.classfile.CodeTransform;
import java.lang.classfile.MethodModel;
import java.lang.classfile.attribute.SourceFileAttribute;
import java.lang.classfile.instruction.ConstantInstruction;
import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDescs;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;

import static classes.modern_test.ClassFileSupport.artifact;
import static classes.modern_test.ClassFileSupport.check;
import static classes.modern_test.ClassFileSupport.emit;
import static java.lang.constant.ConstantDescs.CD_int;

/** Public transforms of an original javac25 owner-free companion. */
public final class ClassFileTransformFinal {
  private static final RuntimeException CALLBACK_FAILURE = new IllegalStateException("class-file callback sentinel");
  private static int callbackCalls;
  private static int compositionSeen;

  private static ClassModel model() throws Exception {
    return ClassFile.of().parse(ClassFileSupport.bytes(ClassFileTransformFinal.class, "ClassFileTransformTarget.class"));
  }

  private static boolean isUnused(ClassElement element) {
    return element instanceof MethodModel method && "debugUnused".equals(method.methodName().stringValue());
  }

  private static boolean selectAnswer(MethodModel method) {
    return "answer".equals(method.methodName().stringValue());
  }

  private static void replaceSourcefile(ClassBuilder builder, ClassElement element) {
    if (element instanceof SourceFileAttribute) builder.with(SourceFileAttribute.of("Transformed.java"));
    else builder.with(element);
  }

  private static void replaceConstant(CodeBuilder builder, CodeElement element) {
    if (element instanceof ConstantInstruction constant && Integer.valueOf(42).equals(constant.constantValue())) {
      builder.loadConstant(73);
    } else builder.with(element);
  }

  private static void addMethod(ClassBuilder builder) {
    builder.withMethodBody("added", MethodTypeDesc.of(CD_int), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC,
        ClassFileTransformFinal::codeAdded);
  }

  private static void codeAdded(CodeBuilder builder) { builder.bipush(101).ireturn(); }

  private static void firstConstant(CodeBuilder builder, CodeElement element) {
    if (element instanceof ConstantInstruction constant && Integer.valueOf(42).equals(constant.constantValue())) {
      builder.loadConstant(7);
    } else builder.with(element);
  }

  private static void secondConstant(CodeBuilder builder, CodeElement element) {
    if (element instanceof ConstantInstruction constant && Integer.valueOf(7).equals(constant.constantValue())) {
      compositionSeen++;
      builder.loadConstant(9);
    } else builder.with(element);
  }

  private static void throwCallback(ClassBuilder builder, ClassElement element) {
    callbackCalls++;
    throw CALLBACK_FAILURE;
  }

  private static void caseAcceptAll() throws Throwable {
    ClassFile api = ClassFile.of();
    byte[] bytes = api.transformClass(model(), ClassTransform.ACCEPT_ALL);
    ClassModel transformed = api.parse(bytes);
    check("classes/modern_test/ClassFileTransformTarget".equals(transformed.thisClass().asInternalName()));
    check(transformed.methods().size() == 3);
    check(api.verify(bytes).isEmpty());
    artifact("cf-transform-accept-all", "transformed-accept-all", bytes);
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    Class<?> generated = lookup.defineClass(bytes);
    int answer = (int) lookup.findStatic(generated, "answer", MethodType.methodType(int.class)).invokeExact();
    check(answer == 42);
    emit("cf-transform-accept-all", "original-owner=retained;methods=3;verify=empty;defined/invoked=same-bytes;result=42");
  }

  private static void caseDropMethod() throws Throwable {
    ClassFile api = ClassFile.of();
    byte[] bytes = api.transformClass(model(), ClassDesc.of("classes.modern_test.CfTransformDropped"),
        ClassTransform.dropping(ClassFileTransformFinal::isUnused));
    ClassModel transformed = api.parse(bytes);
    check(transformed.methods().size() == 2);
    for (MethodModel method : transformed.methods()) check(!"debugUnused".equals(method.methodName().stringValue()));
    check(api.verify(bytes).isEmpty());
    artifact("cf-transform-drop-method", "transformed-dropped", bytes);
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    Class<?> generated = lookup.defineClass(bytes);
    int answer = (int) lookup.findStatic(generated, "answer", MethodType.methodType(int.class)).invokeExact();
    check(answer == 42);
    emit("cf-transform-drop-method", "unused-method=removed;methods=2;verify=empty;defined/invoked=same-bytes;survivor=42");
  }

  private static void caseRenameOwnerfree() throws Throwable {
    ClassFile api = ClassFile.of();
    byte[] bytes = api.transformClass(model(), ClassDesc.of("classes.modern_test.CfTransformRenamed"), ClassTransform.ACCEPT_ALL);
    ClassModel transformed = api.parse(bytes);
    check("classes/modern_test/CfTransformRenamed".equals(transformed.thisClass().asInternalName()));
    check(transformed.methods().size() == 3);
    check(api.verify(bytes).isEmpty());
    artifact("cf-transform-rename-ownerfree", "transformed-renamed", bytes);
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    Class<?> generated = lookup.defineClass(bytes);
    check("classes.modern_test.CfTransformRenamed".equals(generated.getName()));
    int answer = (int) lookup.findStatic(generated, "answer", MethodType.methodType(int.class)).invokeExact();
    check(answer == 42);
    emit("cf-transform-rename-ownerfree", "simple-owner=renamed;self-references=absent;verify=empty;defined/invoked=same-bytes;result=42");
  }

  private static void caseSourcefile() throws Throwable {
    ClassFile api = ClassFile.of();
    byte[] bytes = api.transformClass(model(), ClassDesc.of("classes.modern_test.CfTransformSourcefile"),
        ClassFileTransformFinal::replaceSourcefile);
    ClassModel transformed = api.parse(bytes);
    check(transformed.findAttributes(Attributes.sourceFile()).size() == 1);
    check("Transformed.java".equals(transformed.findAttribute(Attributes.sourceFile()).get().sourceFile().stringValue()));
    check(api.verify(bytes).isEmpty());
    artifact("cf-transform-sourcefile", "transformed-sourcefile", bytes);
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    Class<?> generated = lookup.defineClass(bytes);
    int answer = (int) lookup.findStatic(generated, "answer", MethodType.methodType(int.class)).invokeExact();
    check(answer == 42);
    emit("cf-transform-sourcefile", "SourceFile=Transformed.java;singleton=one;verify=empty;defined/invoked=same-bytes;result=42");
  }

  private static void caseConstant() throws Throwable {
    ClassFile api = ClassFile.of();
    byte[] bytes = api.transformClass(model(), ClassDesc.of("classes.modern_test.CfTransformConstant"),
        ClassTransform.transformingMethodBodies(ClassFileTransformFinal::selectAnswer, ClassFileTransformFinal::replaceConstant));
    check(api.verify(bytes).isEmpty());
    artifact("cf-transform-constant", "transformed-constant", bytes);
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    Class<?> generated = lookup.defineClass(bytes);
    int answer = (int) lookup.findStatic(generated, "answer", MethodType.methodType(int.class)).invokeExact();
    int unused = (int) lookup.findStatic(generated, "debugUnused", MethodType.methodType(int.class)).invokeExact();
    check(answer == 73 && unused == 13);
    emit("cf-transform-constant", "selected-constant=42-to-73;unselected=13;verify=empty;defined/invoked=same-bytes;targeted-code=exact");
  }

  private static void caseEndHandler() throws Throwable {
    ClassFile api = ClassFile.of();
    byte[] bytes = api.transformClass(model(), ClassDesc.of("classes.modern_test.CfTransformAdded"),
        ClassTransform.endHandler(ClassFileTransformFinal::addMethod));
    check(api.parse(bytes).methods().size() == 4);
    check(api.verify(bytes).isEmpty());
    artifact("cf-transform-end-handler", "transformed-added", bytes);
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    Class<?> generated = lookup.defineClass(bytes);
    int answer = (int) lookup.findStatic(generated, "answer", MethodType.methodType(int.class)).invokeExact();
    int added = (int) lookup.findStatic(generated, "added", MethodType.methodType(int.class)).invokeExact();
    check(answer == 42 && added == 101);
    emit("cf-transform-end-handler", "methods=4;existing=42;added=101;verify=empty;defined/invoked=same-bytes;finisher=effective");
  }

  private static void caseComposition() throws Throwable {
    ClassFile api = ClassFile.of();
    compositionSeen = 0;
    CodeTransform first = ClassFileTransformFinal::firstConstant;
    CodeTransform chain = first.andThen(ClassFileTransformFinal::secondConstant);
    byte[] bytes = api.transformClass(model(), ClassDesc.of("classes.modern_test.CfTransformComposed"),
        ClassTransform.transformingMethodBodies(ClassFileTransformFinal::selectAnswer, chain));
    check(compositionSeen == 1);
    check(api.verify(bytes).isEmpty());
    artifact("cf-transform-composition", "transformed-composed", bytes);
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    Class<?> generated = lookup.defineClass(bytes);
    int answer = (int) lookup.findStatic(generated, "answer", MethodType.methodType(int.class)).invokeExact();
    check(answer == 9);
    emit("cf-transform-composition", "upstream=7;downstream=9;produced-element-observed=once;verify=empty;defined/invoked=same-bytes;result=9");
  }

  private static void caseCallbackIdentity() throws Throwable {
    callbackCalls = 0;
    try {
      ClassFile.of().transformClass(model(), ClassDesc.of("classes.modern_test.CfTransformNeverBuilt"),
          ClassFileTransformFinal::throwCallback);
      throw new AssertionError();
    } catch (Throwable error) {
      check(error == CALLBACK_FAILURE && error.getClass() == IllegalStateException.class);
    }
    check(callbackCalls == 1);
    emit("cf-transform-callback-identity", "callback=once;throwable=original-IllegalStateException;output/definition=absent");
  }

  public static void main(String[] arguments) throws Throwable {
    check(ConstantDescs.CD_int != null);
    caseAcceptAll();
    caseDropMethod();
    caseRenameOwnerfree();
    caseSourcefile();
    caseConstant();
    caseEndHandler();
    caseComposition();
    caseCallbackIdentity();
    System.out.println("CLASSFILE_TRANSFORM_OK");
  }
}

final class ClassFileTransformTarget {
  public static int answer() { return 42; }
  public static int debugUnused() { return 13; }
}
