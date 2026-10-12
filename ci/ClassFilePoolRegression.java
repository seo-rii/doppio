package classes.modern_test;

import java.lang.classfile.ClassBuilder;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.lang.classfile.constantpool.ConstantPool;
import java.lang.classfile.constantpool.ConstantPoolBuilder;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ClassDesc;

/** Diagnostic shared-pool invariants, separate from the immutable native32 corpus. */
public final class ClassFilePoolRegression {
  private static int completed;

  private static void check(boolean condition, String name) {
    if (!condition) throw new AssertionError(name);
    completed++;
  }

  private static void empty(ClassBuilder builder) {
    builder.withFlags(ClassFile.ACC_PUBLIC | ClassFile.ACC_SUPER);
  }

  public static void main(String[] arguments) {
    ClassFile api = ClassFile.of();
    byte[] bytes = api.build(ClassDesc.of("classes.modern_test.PoolRegressionSource"), ClassFilePoolRegression::empty);
    ClassModel model = api.parse(bytes);
    ConstantPool source = model.constantPool();
    ConstantPool independent = api.parse(bytes.clone()).constantPool();
    ConstantPoolBuilder fresh = ConstantPoolBuilder.of();
    ConstantPoolBuilder left = ConstantPoolBuilder.of(model);
    ConstantPoolBuilder right = ConstantPoolBuilder.of(model);
    check(fresh.canWriteDirect(fresh), "fresh pool writes its own entries");
    check(left.canWriteDirect(source) && right.canWriteDirect(source), "exact original source is direct");
    check(left.canWriteDirect(left) && right.canWriteDirect(right), "each copy owns its entries");
    check(!left.canWriteDirect(independent) && !right.canWriteDirect(independent), "equal bytes do not create provenance");
    check(!left.canWriteDirect(right) && !right.canWriteDirect(left), "siblings are not each other's direct source");
    Utf8Entry leftTail = left.utf8Entry("left-private-tail"), rightTail = right.utf8Entry("right-private-tail");
    check(leftTail.index() == rightTail.index() && !leftTail.stringValue().equals(rightTail.stringValue()), "same tail indexes can differ");
    check(!left.canWriteDirect(right) && !right.canWriteDirect(left), "divergent tail is never raw-copy compatible");
    check(left.canWriteDirect(source) && right.canWriteDirect(source), "appending retains original prefix authority");
    check(left.entryByIndex(model.thisClass().index(), java.lang.classfile.constantpool.ClassEntry.class)
      .asSymbol().equals(model.thisClass().asSymbol()), "cloning preserves original indexes");
    try {
      left.canWriteDirect(null);
      throw new AssertionError("Null source was accepted");
    } catch (NullPointerException expected) { completed++; }
    System.out.println("CLASSFILE_POOL_REGRESSION_OK|" + completed);
  }
}
