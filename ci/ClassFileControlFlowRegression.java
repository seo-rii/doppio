package classes.modern_test;

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.util.List;

/** Hand-written verifier diagnostics, separate from the unchanged javac25 corpus. */
public final class ClassFileControlFlowRegression {
  private static int completed;
  private static void utf(DataOutputStream output, String value) throws Exception {
    output.writeByte(1); output.writeUTF(value);
  }
  private static void entries(DataOutputStream output, int[] values) throws Exception {
    int count = 0;
    for (int i = 0; i < values.length; i++, count++) if (values[i] == 7 || values[i] == 8) i++;
    output.writeShort(count);
    for (int i = 0; i < values.length; i++) {
      output.writeByte(values[i]);
      if (values[i] == 7 || values[i] == 8) output.writeShort(values[++i]);
    }
  }
  // Full frames make declared types explicit instead of relying on compressed-frame inference.
  private static byte[] frames(int[] offsets, int[][] locals, int[][] stack) throws Exception {
    ByteArrayOutputStream buffer = new ByteArrayOutputStream();
    DataOutputStream output = new DataOutputStream(buffer);
    output.writeShort(offsets.length); int previous = -1;
    for (int i = 0; i < offsets.length; i++) {
      output.writeByte(255); output.writeShort(offsets[i] - previous - 1);
      entries(output, locals[i]); entries(output, stack[i]); previous = offsets[i];
    }
    output.flush(); return buffer.toByteArray();
  }
  private static byte[] sample(String descriptor, int maxStack, int maxLocals,
      int[] code, byte[] frames, int[][] handlers) throws Exception {
    return sample(descriptor,maxStack,maxLocals,code,frames,handlers,false);
  }
  private static byte[] sample(String descriptor, int maxStack, int maxLocals,
      int[] code, byte[] frames, int[][] handlers, boolean objectConstructor) throws Exception {
    ByteArrayOutputStream buffer = new ByteArrayOutputStream();
    DataOutputStream output = new DataOutputStream(buffer);
    output.writeInt(0xcafebabe); output.writeShort(0); output.writeShort(69); output.writeShort(23);
    utf(output, objectConstructor ? "java/lang/Object" : "FlowRegressionTarget"); // 1
    output.writeByte(7); output.writeShort(1);                      // 2
    utf(output, "java/lang/Object");                               // 3
    output.writeByte(7); output.writeShort(3);                      // 4
    utf(output, "test"); utf(output, descriptor);                   // 5,6
    utf(output, "Code"); utf(output, "StackMapTable");              // 7,8
    utf(output, "java/lang/String");                               // 9
    output.writeByte(7); output.writeShort(9);                      // 10
    utf(output, "length"); utf(output, "()I");                      // 11,12
    output.writeByte(12); output.writeShort(11); output.writeShort(12); // 13
    output.writeByte(10); output.writeShort(10); output.writeShort(13); // 14
    utf(output, "java/lang/Exception");                            // 15
    output.writeByte(7); output.writeShort(15);                     // 16
    utf(output, "<init>"); utf(output, "()V");                      // 17,18
    output.writeByte(12); output.writeShort(17); output.writeShort(18); // 19
    output.writeByte(10); output.writeShort(4); output.writeShort(19);  // 20
    utf(output, "java/lang/Throwable");                            // 21
    output.writeByte(7); output.writeShort(21);                     // 22
    output.writeShort(0x21); output.writeShort(2); output.writeShort(objectConstructor ? 0 : 4);
    output.writeShort(0); output.writeShort(0); output.writeShort(1);
    output.writeShort(objectConstructor ? 1 : 9); output.writeShort(objectConstructor ? 17 : 5);
    output.writeShort(6); output.writeShort(1);
    output.writeShort(7); output.writeInt(12 + code.length + handlers.length * 8 + (frames == null ? 0 : 6 + frames.length));
    output.writeShort(maxStack); output.writeShort(maxLocals); output.writeInt(code.length);
    for (int value : code) output.writeByte(value);
    output.writeShort(handlers.length);
    for (int[] handler : handlers) for (int value : handler) output.writeShort(value);
    output.writeShort(frames == null ? 0 : 1);
    if (frames != null) { output.writeShort(8); output.writeInt(frames.length); output.write(frames); }
    output.writeShort(0); output.flush(); return buffer.toByteArray();
  }
  private static void check(boolean value, String message) { if (!value) throw new AssertionError(message); }
  private static void outcome(String name, byte[] bytes, boolean valid) {
    ClassFile api = ClassFile.of();
    List<VerifyError> errors = api.verify(bytes);
    check(errors.isEmpty() == valid, name + ": byte outcome " + errors);
    for (VerifyError error : errors) check(error.getClass() == VerifyError.class, name + ": error type");
    ClassModel model;
    try { model = api.parse(bytes); }
    catch (IllegalArgumentException malformed) { check(!valid, name + ": invalid parse"); completed++; return; }
    check(api.verify(model).isEmpty() == valid, name + ": model outcome"); completed++;
  }
  public static void main(String[] arguments) throws Exception {
    int[][] none = new int[0][];
    int[] join = {0x1a,0x99,0,7,0x04,0xa7,0,4,0x05,0xac};
    byte[] integerFrames = frames(new int[]{8,9}, new int[][]{{1},{1}}, new int[][]{{},{1}});
    outcome("integer-join", sample("(I)I",1,1,join,integerFrames,none),true);
    outcome("backedge-to-zero", sample("(I)I",1,1,
        new int[]{0x1a,0x99,0,9,0x84,0,255,0xa7,255,249,0x1a,0xac},
        frames(new int[]{0,10},new int[][]{{1},{1}},new int[][]{{},{}}),none),true);
    int[] wide = {0x1a,0x99,0,8,0x09,0x40,0xa7,0,5,0x0a,0x40,0x1f,0xad};
    byte[] wideFrames = frames(new int[]{9,11},new int[][]{{1},{1,4}},new int[][]{{},{}});
    outcome("category-two-local-join",sample("(I)J",2,3,wide,wideFrames,none),true);
    outcome("missing-target-frames",sample("(I)I",1,1,join,null,none),false);
    outcome("wrong-join-stack-type",sample("(I)I",1,1,join,
        frames(new int[]{8,9},new int[][]{{1},{1}},new int[][]{{},{2}}),none),false);
    outcome("wrong-branch-locals",sample("(I)I",1,1,join,
        frames(new int[]{8,9},new int[][]{{2},{1}},new int[][]{{},{1}}),none),false);
    outcome("incompatible-stack-height",sample("(I)I",2,1,
        new int[]{0x1a,0x99,0,8,0x04,0x04,0xa7,0,4,0x05,0xac},
        frames(new int[]{9,10},new int[][]{{1},{1}},new int[][]{{},{1}}),none),false);
    outcome("overwritten-wide-tail-at-join",sample("(I)J",2,3,
        new int[]{0x1a,0x99,0,10,0x09,0x40,0x03,0x3d,0xa7,0,5,0x0a,0x40,0x1f,0xad},
        frames(new int[]{11,13},new int[][]{{1},{1,4}},new int[][]{{},{}}),none),false);
    int[] narrowInvoke = {0x1b,0x99,0,7,0x2a,0xa7,0,4,0x2a,0xb6,0,14,0xac};
    byte[] objectFrames = frames(new int[]{8,9},new int[][]{{7,10,1},{7,10,1}},new int[][]{{},{7,4}});
    outcome("declared-object-not-inferred-string",sample("(Ljava/lang/String;I)I",1,2,narrowInvoke,objectFrames,none),false);
    outcome("declared-object-then-checkcast",sample("(Ljava/lang/String;I)I",1,2,
        new int[]{0x1b,0x99,0,7,0x2a,0xa7,0,4,0x2a,0xc0,0,10,0xb6,0,14,0xac},objectFrames,none),true);
    outcome("branch-into-operand",sample("(I)I",1,1,
        new int[]{0x1a,0x99,0,1,0x04,0xac},null,none),false);
    outcome("branch-at-code-end",sample("()V",0,0,new int[]{0xa7,0,3},null,none),false);
    outcome("negative-branch-outside-code",sample("()V",0,0,new int[]{0xa7,255,255,0xb1},null,none),false);
    outcome("max-stack-at-join",sample("(I)I",0,1,join,integerFrames,none),false);
    outcome("stack-map-target-in-operand",sample("(I)I",1,1,join,
        frames(new int[]{2,8,9},new int[][]{{1},{1},{1}},new int[][]{{},{},{1}}),none),false);
    int[] caught = {0x01,0xbf,0x57,0x04,0xac};
    byte[] catchFrames = frames(new int[]{2},new int[][]{{}},new int[][]{{7,22}});
    outcome("catch-all-flow",sample("()I",1,0,caught,catchFrames,new int[][]{{0,2,2,0}}),true);
    outcome("typed-exception-flow",sample("()I",1,0,caught,
        frames(new int[]{2},new int[][]{{}},new int[][]{{7,16}}),new int[][]{{0,2,2,16}}),true);
    outcome("handler-missing-frame",sample("()I",1,0,caught,null,new int[][]{{0,2,2,0}}),false);
    outcome("handler-frame-wrong-primitive",sample("()I",1,0,caught,
        frames(new int[]{2},new int[][]{{}},new int[][]{{1}}),new int[][]{{0,2,2,0}}),false);
    outcome("handler-frame-narrower-than-catch",sample("()I",1,0,caught,
        frames(new int[]{2},new int[][]{{}},new int[][]{{7,16}}),new int[][]{{0,2,2,0}}),false);
    outcome("int-null-join-with-declared-object",sample("(I)Ljava/lang/Object;",1,1,
        new int[]{0x1a,0x99,0,7,0x04,0xa7,0,4,0x01,0xb0},
        frames(new int[]{8,9},new int[][]{{1},{1}},new int[][]{{},{7,4}}),none),false);
    outcome("same-allocation-alias-through-branch",sample("(I)Ljava/lang/Object;",3,1,
        new int[]{0xbb,0,4,0x59,0x1a,0x99,0,6,0xa7,0,3,0xb7,0,20,0xb0},
        frames(new int[]{11},new int[][]{{1}},new int[][]{{8,0,8,0}}),none),true);
    outcome("different-allocation-tokens-at-join",sample("(I)Ljava/lang/Object;",2,1,
        new int[]{0x1a,0x99,0,9,0xbb,0,4,0xa7,0,6,0xbb,0,4,0x59,0xb7,0,20,0xb0},
        frames(new int[]{10,13},new int[][]{{1},{1}},new int[][]{{},{8,4}}),none),false);
    outcome("object-constructor-initial-frame",sample("()V",0,1,new int[]{0xb1},
        frames(new int[]{0},new int[][]{{7,4}},new int[][]{{}}),none,true),true);
    check(completed == 24,"Incomplete flow diagnostics");
    System.out.println("CLASSFILE_CONTROL_FLOW_REGRESSION_OK|24");
  }
}
