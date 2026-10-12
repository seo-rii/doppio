package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.util.List;

/**
 * Diagnostic algorithm regressions, not the unchanged javac25/native C7a
 * corpus. The actual Java class-library API consumes these hand-written bytes;
 * no guest class is defined to decide whether verification succeeded.
 */
public final class ClassFileVerifierRegression {
  private static int completed;

  private static byte[] sample(String descriptor, boolean constructor, int maxStack,
      int maxLocals, int constructorReferenceTag, int... code) throws Exception {
    ByteArrayOutputStream buffer = new ByteArrayOutputStream();
    DataOutputStream output = new DataOutputStream(buffer);
    output.writeInt(0xcafebabe);
    output.writeShort(0);
    output.writeShort(69);
    output.writeShort(12);
    utf(output, "VerifierRegressionTarget");                         // 1
    output.writeByte(7); output.writeShort(1);                       // 2
    utf(output, "java/lang/Object");                                // 3
    output.writeByte(7); output.writeShort(3);                       // 4
    utf(output, constructor ? "<init>" : "test");                    // 5
    utf(output, descriptor);                                        // 6
    utf(output, "Code");                                            // 7
    utf(output, "<init>");                                          // 8
    utf(output, "()V");                                             // 9
    output.writeByte(12); output.writeShort(8); output.writeShort(9); // 10
    output.writeByte(constructorReferenceTag);
    output.writeShort(4); output.writeShort(10);                     // 11
    output.writeShort(0x21);
    output.writeShort(2);
    output.writeShort(4);
    output.writeShort(0); // interfaces
    output.writeShort(0); // fields
    output.writeShort(1); // methods
    output.writeShort(constructor ? 1 : 9);
    output.writeShort(5);
    output.writeShort(6);
    output.writeShort(1); // method attributes
    output.writeShort(7);
    output.writeInt(12 + code.length);
    output.writeShort(maxStack);
    output.writeShort(maxLocals);
    output.writeInt(code.length);
    for (int instruction : code) output.writeByte(instruction);
    output.writeShort(0); // exception handlers
    output.writeShort(0); // Code attributes
    output.writeShort(0); // class attributes
    output.flush();
    return buffer.toByteArray();
  }

  private static void utf(DataOutputStream output, String value) throws Exception {
    output.writeByte(1);
    output.writeUTF(value);
  }

  private static void check(boolean condition, String name) {
    if (!condition) throw new AssertionError(name);
  }

  private static void errors(List<VerifyError> errors, String name) {
    check(!errors.isEmpty(), name + ": invalid Code was accepted");
    for (VerifyError error : errors)
      check(error.getClass() == VerifyError.class, name + ": wrong error type");
  }

  private static void valid(String name, byte[] bytes) {
    ClassFile api = ClassFile.of();
    ClassModel model = api.parse(bytes);
    check(api.verify(bytes).isEmpty(), name + ": byte verification failed");
    check(api.verify(model).isEmpty(), name + ": model verification failed");
    completed++;
  }

  private static void invalid(String name, byte[] bytes) {
    ClassFile api = ClassFile.of();
    ClassModel model = api.parse(bytes);
    errors(api.verify(bytes), name + ": bytes");
    errors(api.verify(model), name + ": model");
    completed++;
  }

  private static void malformed(String name, byte[] bytes) {
    ClassFile api = ClassFile.of();
    errors(api.verify(bytes), name + ": bytes");
    // A checked reader may reject the invalid CP entry earlier. If it creates
    // a model, the typed verifier must still reject rather than return a pass.
    ClassModel model;
    try { model = api.parse(bytes); }
    catch (IllegalArgumentException expected) { completed++; return; }
    errors(api.verify(model), name + ": model");
    completed++;
  }

  private static byte[] interfaceConstructorReference(byte[] original) {
    byte[] changed = original.clone();
    int cursor = 10;
    for (int index = 1; index < 11; index++) {
      int tag = changed[cursor++] & 255;
      if (tag == 1) {
        int length = (changed[cursor] & 255) << 8 | changed[cursor + 1] & 255;
        cursor += 2 + length;
      } else if (tag == 7) cursor += 2;
      else if (tag == 12) cursor += 4;
      else throw new AssertionError("Unexpected diagnostic CP shape");
    }
    check(original[cursor] == 10, "Original constructor reference must be Methodref");
    changed[cursor] = 11;
    int differences = 0;
    for (int index = 0; index < original.length; index++)
      if (changed[index] != original[index]) differences++;
    check(differences == 1 && original[cursor] == 10, "Mutation must change exactly one retained CP tag");
    return changed;
  }

  public static void main(String[] arguments) throws Exception {
    valid("integer", sample("()I", false, 1, 0, 10, 0x10, 42, 0xac));
    valid("wide-arguments", sample("(JJ)J", false, 4, 4, 10, 0x1e, 0x20, 0x61, 0xad));
    valid("constructor", sample("()V", true, 1, 1, 10, 0x2a, 0xb7, 0, 11, 0xb1));
    invalid("uninitialized-local", sample("()I", false, 1, 1, 10, 0x1a, 0xac));
    invalid("overwrite-wide-second-slot", sample("(JJ)J", false, 2, 4, 10,
        0x03, 0x3c, 0x1e, 0xad));
    invalid("overlapping-wide-store", sample("(JJ)J", false, 2, 4, 10,
        0x09, 0x40, 0x1e, 0xad));
    invalid("operand-underflow", sample("()I", false, 1, 0, 10, 0xac));
    invalid("max-stack", sample("()I", false, 1, 0, 10, 0x03, 0x04, 0x60, 0xac));
    invalid("typed-return", sample("()I", false, 1, 0, 10, 0x01, 0xb0));
    invalid("fall-off-end", sample("()I", false, 1, 0, 10, 0x03));
    malformed("truncated-instruction", sample("()I", false, 1, 0, 10, 0x11, 0));
    invalid("constructor-before-initialization", sample("()V", true, 0, 1, 10, 0xb1));
    invalid("category-two-pop", sample("()V", false, 2, 0, 10, 0x09, 0x57, 0xb1));
    malformed("interface-constructor-reference", interfaceConstructorReference(
        sample("()V", true, 1, 1, 10, 0x2a, 0xb7, 0, 11, 0xb1)));
    invalid("missing-branch-stack-map", sample("()V", false, 0, 0, 10, 0xa7, 0, 3, 0xb1));
    check(completed == 15, "Incomplete regression execution");
    System.out.println("CLASSFILE_VERIFIER_REGRESSION_OK|15");
  }
}
