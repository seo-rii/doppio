package classes.modern_test;

import java.lang.classfile.ClassBuilder;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.lang.classfile.CodeBuilder;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.ConstantPool;
import java.lang.classfile.constantpool.ConstantPoolException;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ConstantDescs;
import java.lang.constant.MethodTypeDesc;
import java.util.List;

import static classes.modern_test.ClassFileSupport.artifact;
import static classes.modern_test.ClassFileSupport.check;
import static classes.modern_test.ClassFileSupport.emit;
import static java.lang.constant.ConstantDescs.CD_int;

/** Selected public verifier and failure boundaries; invalid outputs are never defined. */
public final class ClassFileVerifyFinal {
  private static int forbiddenCallbackCalls;

  private static byte[] original() throws Exception {
    return ClassFileSupport.bytes(ClassFileVerifyFinal.class, "ClassFileVerifyTarget.class");
  }

  private static byte[] badMagic() throws Exception {
    byte[] bytes = original();
    bytes[0] = 0;
    return bytes;
  }

  private static void buildTypedInvalid(ClassBuilder builder) {
    builder.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER);
    builder.withMethodBody("bad", MethodTypeDesc.of(CD_int), ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC,
        ClassFileVerifyFinal::codeTypedInvalid);
  }

  private static void codeTypedInvalid(CodeBuilder builder) { builder.aconst_null().areturn(); }

  private static void forbiddenCallback(ClassBuilder builder) { forbiddenCallbackCalls++; }

  private static void forceTraversal(byte[] bytes) {
    ClassModel model = ClassFile.of().parse(bytes);
    model.thisClass().asInternalName();
    model.fields().size();
    model.methods().size();
    model.attributes().size();
    for (var method : model.methods()) {
      method.methodName().stringValue();
      if (method.code().isPresent()) method.code().get().elementList().size();
    }
  }

  private static void caseValidModel() throws Exception {
    ClassFile api = ClassFile.of();
    byte[] bytes = original();
    ClassModel model = api.parse(bytes);
    check(model.methods().size() == 2);
    check(api.verify(bytes).isEmpty() && api.verify(model).isEmpty());
    emit("cf-verify-valid-model", "original=ClassFileVerifyTarget;byte/model-verification=empty;methods=2");
  }

  private static void caseTypedInvalidReturn() {
    ClassFile api = ClassFile.of(ClassFile.StackMapsOption.DROP_STACK_MAPS);
    byte[] bytes = api.build(java.lang.constant.ClassDesc.of("classes.modern_test.CfTypedInvalid"),
        ClassFileVerifyFinal::buildTypedInvalid);
    ClassModel model = api.parse(bytes);
    check("()I".equals(model.methods().get(0).methodTypeSymbol().descriptorString()));
    check(model.methods().get(0).code().isPresent());
    List<VerifyError> byteErrors = api.verify(bytes), modelErrors = api.verify(model);
    check(!byteErrors.isEmpty() && !modelErrors.isEmpty());
    for (VerifyError error : byteErrors) check(error.getClass() == VerifyError.class);
    for (VerifyError error : modelErrors) check(error.getClass() == VerifyError.class);
    artifact("cf-verify-typed-invalid-return", "typed-invalid-return", bytes);
    emit("cf-verify-typed-invalid-return", "parse=structurally-valid;declared=()I;code=aconst_null/areturn;byte/model-errors=VerifyError;definition=forbidden");
  }

  private static void caseBadMagicList() throws Exception {
    List<VerifyError> errors = ClassFile.of().verify(badMagic());
    check(!errors.isEmpty());
    for (VerifyError error : errors) check(error.getClass() == VerifyError.class);
    emit("cf-verify-bad-magic-list", "magic=invalid;verification=nonempty-VerifyError-list;no-parser-exception-escape");
  }

  private static void caseBadMagicParse() throws Exception {
    try { forceTraversal(badMagic()); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == IllegalArgumentException.class); }
    emit("cf-verify-bad-magic-parse", "magic=invalid;parse/forced-traversal=IllegalArgumentException;verification-is-separate");
  }

  private static void caseTruncatedParse() throws Exception {
    byte[] original = original(), truncated = new byte[7];
    System.arraycopy(original, 0, truncated, 0, truncated.length);
    try { forceTraversal(truncated); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == IllegalArgumentException.class); }
    emit("cf-verify-truncated-parse", "original-prefix=7-bytes;parse/forced-traversal=IllegalArgumentException;header/version=not-rewritten");
  }

  private static void casePoolFailures() throws Exception {
    ClassModel model = ClassFile.of().parse(original());
    ConstantPool pool = model.constantPool();
    try { pool.entryByIndex(0); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == ConstantPoolException.class); }
    try { pool.entryByIndex(pool.size()); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == ConstantPoolException.class); }
    ClassEntry owner = model.thisClass();
    try { pool.entryByIndex(owner.index(), Utf8Entry.class); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == ConstantPoolException.class); }
    emit("cf-verify-pool-failures", "index=0/upper-bound;typed-entry=wrong-class;rejections=3;exact=ConstantPoolException");
  }

  private static void casePrimitiveBuild() {
    forbiddenCallbackCalls = 0;
    try { ClassFile.of().build(CD_int, ClassFileVerifyFinal::forbiddenCallback); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == IllegalArgumentException.class); }
    check(forbiddenCallbackCalls == 0);
    emit("cf-verify-primitive-build", "class-name=primitive;exact=IllegalArgumentException;builder-callback/effects=absent");
  }

  private static void caseNullBytes() {
    try { ClassFile.of().parse((byte[]) null); throw new AssertionError(); }
    catch (Throwable error) { check(error.getClass() == NullPointerException.class); }
    emit("cf-verify-null-bytes", "byte-array=null;exact=NullPointerException;model/output=absent");
  }

  public static void main(String[] arguments) throws Exception {
    check(ConstantDescs.CD_int != null);
    caseValidModel();
    caseTypedInvalidReturn();
    caseBadMagicList();
    caseBadMagicParse();
    caseTruncatedParse();
    casePoolFailures();
    casePrimitiveBuild();
    caseNullBytes();
    System.out.println("CLASSFILE_VERIFY_OK");
  }
}

final class ClassFileVerifyTarget {
  public static int answer() { return 42; }
}
