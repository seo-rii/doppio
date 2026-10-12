package java.lang.classfile.attribute;

import java.lang.classfile.DoppioClassReader;
import java.lang.classfile.Label;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.constant.ClassDesc;
import java.util.List;

/** Expanded verification entries: a long/double occupies one entry, but two JVM slots. */
public interface StackMapFrameInfo {
  int frameType();
  Label target();
  List<VerificationTypeInfo> locals();
  List<VerificationTypeInfo> stack();
  static StackMapFrameInfo of(Label target, List<VerificationTypeInfo> locals, List<VerificationTypeInfo> stack) {
    return DoppioClassReader.stackMapFrame(target, locals, stack);
  }

  interface VerificationTypeInfo {
    int ITEM_TOP = 0;
    int ITEM_INTEGER = 1;
    int ITEM_FLOAT = 2;
    int ITEM_DOUBLE = 3;
    int ITEM_LONG = 4;
    int ITEM_NULL = 5;
    int ITEM_UNINITIALIZED_THIS = 6;
    int ITEM_OBJECT = 7;
    int ITEM_UNINITIALIZED = 8;
    int tag();
  }

  enum SimpleVerificationTypeInfo implements VerificationTypeInfo {
    TOP(ITEM_TOP), INTEGER(ITEM_INTEGER), FLOAT(ITEM_FLOAT), DOUBLE(ITEM_DOUBLE), LONG(ITEM_LONG),
    NULL(ITEM_NULL), UNINITIALIZED_THIS(ITEM_UNINITIALIZED_THIS);
    private final int tag;
    SimpleVerificationTypeInfo(int tag) { this.tag = tag; }
    public int tag() { return tag; }
  }

  interface ObjectVerificationTypeInfo extends VerificationTypeInfo {
    static ObjectVerificationTypeInfo of(ClassEntry className) { return DoppioClassReader.objectVerificationType(className); }
    static ObjectVerificationTypeInfo of(ClassDesc classDesc) { return DoppioClassReader.objectVerificationType(classDesc); }
    ClassEntry className();
    default ClassDesc classSymbol() { return className().asSymbol(); }
  }

  interface UninitializedVerificationTypeInfo extends VerificationTypeInfo {
    Label newTarget();
    static UninitializedVerificationTypeInfo of(Label newTarget) {
      return DoppioClassReader.uninitializedVerificationType(newTarget);
    }
  }
}
