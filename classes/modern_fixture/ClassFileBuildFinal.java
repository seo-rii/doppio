package classes.modern_test;

import java.lang.classfile.Attributes;
import java.lang.classfile.ClassBuilder;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.lang.classfile.CodeBuilder;
import java.lang.classfile.attribute.SourceFileAttribute;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.ConstantPoolBuilder;
import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDescs;
import java.lang.constant.MethodTypeDesc;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;

import static classes.modern_test.ClassFileSupport.artifact;
import static classes.modern_test.ClassFileSupport.check;
import static classes.modern_test.ClassFileSupport.emit;
import static java.lang.constant.ConstantDescs.CD_Object;
import static java.lang.constant.ConstantDescs.CD_String;
import static java.lang.constant.ConstantDescs.CD_double;
import static java.lang.constant.ConstantDescs.CD_int;
import static java.lang.constant.ConstantDescs.CD_long;
import static java.lang.constant.ConstantDescs.CD_void;

/** Genuine public Class-File builder callbacks; all generated Code is branch-free. */
public final class ClassFileBuildFinal {
  private static void buildEmpty(ClassBuilder builder) {
    builder.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER);
  }

  private static void buildInt(ClassBuilder builder) {
    builder.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER);
    builder.withMethodBody("answer", MethodTypeDesc.of(CD_int), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC,
        ClassFileBuildFinal::codeInt);
  }

  private static void codeInt(CodeBuilder builder) { builder.bipush(42).ireturn(); }

  private static void buildLong(ClassBuilder builder) {
    builder.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER);
    builder.withMethodBody("wide", MethodTypeDesc.of(CD_long, CD_long, CD_long), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC,
        ClassFileBuildFinal::codeLong);
  }

  private static void codeLong(CodeBuilder builder) { builder.lload(0).lload(2).ladd().lreturn(); }

  private static void buildDouble(ClassBuilder builder) {
    builder.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER);
    builder.withMethodBody("decimal", MethodTypeDesc.of(CD_double, CD_double), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC,
        ClassFileBuildFinal::codeDouble);
  }

  private static void codeDouble(CodeBuilder builder) { builder.dload(0).ldc(0.5).dadd().dreturn(); }

  private static void buildReference(ClassBuilder builder) {
    builder.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER);
    builder.withMethodBody("text", MethodTypeDesc.of(CD_String), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC,
        ClassFileBuildFinal::codeReference);
  }

  private static void codeReference(CodeBuilder builder) { builder.ldc("public-classfile").areturn(); }

  private static void buildConstructor(ClassBuilder builder) {
    builder.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER);
    builder.withField("value", CD_long, ClassFile.ACC_PUBLIC);
    builder.withMethodBody("<init>", MethodTypeDesc.of(CD_void, CD_long), ClassFile.ACC_PUBLIC,
        ClassFileBuildFinal::codeConstructor);
    builder.withMethodBody("value", MethodTypeDesc.of(CD_long), ClassFile.ACC_PUBLIC,
        ClassFileBuildFinal::codeGetter);
  }

  private static void codeConstructor(CodeBuilder builder) {
    builder.aload(0).invokespecial(CD_Object, "<init>", MethodTypeDesc.of(CD_void))
        .aload(0).lload(1).putfield(ClassDesc.of("classes.modern_test.CfBuiltConstructor"), "value", CD_long).return_();
  }

  private static void codeGetter(CodeBuilder builder) {
    builder.aload(0).getfield(ClassDesc.of("classes.modern_test.CfBuiltConstructor"), "value", CD_long).lreturn();
  }

  private static void buildSourcefile(ClassBuilder builder) {
    buildInt(builder);
    builder.with(SourceFileAttribute.of("Earlier.java"));
    builder.with(SourceFileAttribute.of("Selected.java"));
  }

  private static void buildExplicitPool(ClassBuilder builder) {
    builder.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER);
    ConstantPoolBuilder pool = builder.constantPool();
    builder.withField(pool.utf8Entry("wide"), pool.utf8Entry("J"), ClassFile.ACC_PUBLIC);
    builder.withMethodBody(pool.utf8Entry("answer"), pool.utf8Entry("()I"), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC,
        ClassFileBuildFinal::codeExplicitPool);
  }

  private static void codeExplicitPool(CodeBuilder builder) { builder.bipush(9).ireturn(); }

  private static void caseEmptyModel() throws Throwable {
    ClassFile api = ClassFile.of();
    byte[] bytes = api.build(ClassDesc.of("classes.modern_test.CfBuiltEmpty"), ClassFileBuildFinal::buildEmpty);
    ClassModel model = api.parse(bytes);
    check(model.fields().isEmpty() && model.methods().isEmpty());
    check(model.majorVersion() == 69 && model.minorVersion() == 0);
    check(model.flags().flagsMask() == (ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER));
    check(api.verify(bytes).isEmpty());
    artifact("cf-build-empty-model", "built-empty", bytes);
    Class<?> generated = MethodHandles.lookup().defineClass(bytes);
    check("classes.modern_test.CfBuiltEmpty".equals(generated.getName()));
    check(generated.getDeclaredMethods().length == 0);
    emit("cf-build-empty-model", "members=0/0;version=69/0;flags=public/super;verify=empty;defined=same-bytes");
  }

  private static void caseIntExecute() throws Throwable {
    ClassFile api = ClassFile.of();
    byte[] bytes = api.build(ClassDesc.of("classes.modern_test.CfBuiltInt"), ClassFileBuildFinal::buildInt);
    check(api.parse(bytes).methods().get(0).methodTypeSymbol().descriptorString().equals("()I"));
    check(api.verify(bytes).isEmpty());
    artifact("cf-build-int-execute", "built-int", bytes);
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    Class<?> generated = lookup.defineClass(bytes);
    int answer = (int) lookup.findStatic(generated, "answer", MethodType.methodType(int.class)).invokeExact();
    check(answer == 42);
    emit("cf-build-int-execute", "descriptor=()I;verify=empty;defined/invoked=same-bytes;result=42");
  }

  private static void caseLongExecute() throws Throwable {
    ClassFile api = ClassFile.of();
    byte[] bytes = api.build(ClassDesc.of("classes.modern_test.CfBuiltLong"), ClassFileBuildFinal::buildLong);
    check(api.parse(bytes).methods().get(0).methodTypeSymbol().descriptorString().equals("(JJ)J"));
    check(api.verify(bytes).isEmpty());
    artifact("cf-build-long-execute", "built-long", bytes);
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    Class<?> generated = lookup.defineClass(bytes);
    long answer = (long) lookup.findStatic(generated, "wide", MethodType.methodType(long.class, long.class, long.class))
        .invokeExact(9007199254740993L, 9L);
    check(answer == 9007199254741002L);
    emit("cf-build-long-execute", "descriptor=(JJ)J;slots=0/2;verify=empty;defined/invoked=same-bytes;result=9007199254741002");
  }

  private static void caseDoubleExecute() throws Throwable {
    ClassFile api = ClassFile.of();
    byte[] bytes = api.build(ClassDesc.of("classes.modern_test.CfBuiltDouble"), ClassFileBuildFinal::buildDouble);
    check(api.parse(bytes).methods().get(0).methodTypeSymbol().descriptorString().equals("(D)D"));
    check(api.verify(bytes).isEmpty());
    artifact("cf-build-double-execute", "built-double", bytes);
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    Class<?> generated = lookup.defineClass(bytes);
    double answer = (double) lookup.findStatic(generated, "decimal", MethodType.methodType(double.class, double.class))
        .invokeExact(12.0);
    check(answer == 12.5);
    emit("cf-build-double-execute", "descriptor=(D)D;wide-constant=0.5;verify=empty;defined/invoked=same-bytes;result=12.5");
  }

  private static void caseReferenceExecute() throws Throwable {
    ClassFile api = ClassFile.of();
    byte[] bytes = api.build(ClassDesc.of("classes.modern_test.CfBuiltReference"), ClassFileBuildFinal::buildReference);
    check(api.verify(bytes).isEmpty());
    artifact("cf-build-reference-execute", "built-reference", bytes);
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    Class<?> generated = lookup.defineClass(bytes);
    String answer = (String) lookup.findStatic(generated, "text", MethodType.methodType(String.class)).invokeExact();
    check("public-classfile".equals(answer));
    emit("cf-build-reference-execute", "descriptor=()String;constant=public-classfile;verify=empty;defined/invoked=same-bytes;reference-return=exact");
  }

  private static void caseConstructorField() throws Throwable {
    ClassFile api = ClassFile.of();
    byte[] bytes = api.build(ClassDesc.of("classes.modern_test.CfBuiltConstructor"), ClassFileBuildFinal::buildConstructor);
    ClassModel model = api.parse(bytes);
    check(model.fields().size() == 1 && model.methods().size() == 2);
    check(model.fields().get(0).fieldTypeSymbol().equals(CD_long));
    check(api.verify(bytes).isEmpty());
    artifact("cf-build-constructor-field", "built-constructor", bytes);
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    Class<?> generated = lookup.defineClass(bytes);
    Object instance = lookup.findConstructor(generated, MethodType.methodType(void.class, long.class)).invoke(9007199254740993L);
    long answer = (long) lookup.findVirtual(generated, "value", MethodType.methodType(long.class)).invoke(instance);
    check(answer == 9007199254740993L);
    emit("cf-build-constructor-field", "field=value:J;constructor=(J)V;getter=()J;verify=empty;defined/invoked=same-bytes;result=9007199254740993");
  }

  private static void caseSourcefileLast() throws Throwable {
    ClassFile api = ClassFile.of();
    byte[] bytes = api.build(ClassDesc.of("classes.modern_test.CfBuiltSourcefile"), ClassFileBuildFinal::buildSourcefile);
    ClassModel model = api.parse(bytes);
    check(model.findAttributes(Attributes.sourceFile()).size() == 1);
    check("Selected.java".equals(model.findAttribute(Attributes.sourceFile()).get().sourceFile().stringValue()));
    check(api.verify(bytes).isEmpty());
    artifact("cf-build-sourcefile-last", "built-sourcefile", bytes);
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    Class<?> generated = lookup.defineClass(bytes);
    int answer = (int) lookup.findStatic(generated, "answer", MethodType.methodType(int.class)).invokeExact();
    check(answer == 42);
    emit("cf-build-sourcefile-last", "SourceFile=Selected.java;singleton=last-wins;verify=empty;defined/invoked=same-bytes;result=42");
  }

  private static void caseExplicitPool() throws Throwable {
    ClassFile api = ClassFile.of();
    ConstantPoolBuilder pool = ConstantPoolBuilder.of();
    ClassEntry name = pool.classEntry(pool.utf8Entry("classes/modern_test/CfBuiltExplicitPool"));
    byte[] bytes = api.build(name, pool, ClassFileBuildFinal::buildExplicitPool);
    ClassModel model = api.parse(bytes);
    check("classes/modern_test/CfBuiltExplicitPool".equals(model.thisClass().asInternalName()));
    check(model.fields().size() == 1 && "wide".equals(model.fields().get(0).fieldName().stringValue()));
    check(model.fields().get(0).fieldTypeSymbol().equals(CD_long));
    check(api.verify(bytes).isEmpty());
    artifact("cf-build-explicit-pool", "built-explicit-pool", bytes);
    MethodHandles.Lookup lookup = MethodHandles.lookup();
    Class<?> generated = lookup.defineClass(bytes);
    int answer = (int) lookup.findStatic(generated, "answer", MethodType.methodType(int.class)).invokeExact();
    check(answer == 9);
    emit("cf-build-explicit-pool", "raw-ClassEntry/UTF8=exact;field=wide:J;verify=empty;defined/invoked=same-bytes;result=9");
  }

  public static void main(String[] arguments) throws Throwable {
    check(ConstantDescs.CD_int != null);
    caseEmptyModel();
    caseIntExecute();
    caseLongExecute();
    caseDoubleExecute();
    caseReferenceExecute();
    caseConstructorField();
    caseSourcefileLast();
    caseExplicitPool();
    System.out.println("CLASSFILE_BUILD_OK");
  }
}
