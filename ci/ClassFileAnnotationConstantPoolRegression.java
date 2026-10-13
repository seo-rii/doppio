package classes.modern_test;

import java.lang.classfile.AnnotationValue;
import java.lang.classfile.ClassFile;
import java.lang.classfile.constantpool.ConstantPool;
import java.lang.classfile.constantpool.ConstantPoolBuilder;
import java.lang.classfile.constantpool.DoubleEntry;
import java.lang.classfile.constantpool.FloatEntry;
import java.lang.classfile.constantpool.PoolEntry;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ClassDesc;

/** Genuine CP value equality, including native floating-point corner cases. */
public final class ClassFileAnnotationConstantPoolRegression {
  private static int checks;
  private static void check(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
    checks++;
  }
  private static int scalarHash(int tag, int value) { return (tag * 0x13c4b2d1 + value) | 0x40000000; }
  private static void equal(PoolEntry left, PoolEntry right, int hash) {
    check(left != right, "Distinct entry objects are exercised");
    check(left.equals(right) && right.equals(left), "Equal semantic entries across ownership");
    check(left.hashCode() == hash && right.hashCode() == hash, "Exact native semantic entry hash");
    check(left.equals(left) && !left.equals(null) && !left.equals(new Object()), "Identity and unrelated object equality");
    check(left.tag() == right.tag(), "Equal scalar entries retain their exact entry family");
  }
  public static void main(String[] arguments) {
    ConstantPoolBuilder first = ConstantPoolBuilder.of(), second = ConstantPoolBuilder.of();
    String text = "zero\u0000\u03bb\ud83d\ude00";
    equal(first.utf8Entry(text), second.utf8Entry(new String(text)), text.hashCode() | 0x40000000);
    equal(first.intEntry(Integer.MIN_VALUE), second.intEntry(Integer.MIN_VALUE), scalarHash(3, Integer.MIN_VALUE));
    equal(first.floatEntry(1.25f), second.floatEntry(1.25f), scalarHash(4, Float.hashCode(1.25f)));
    equal(first.longEntry(Long.MIN_VALUE + 7), second.longEntry(Long.MIN_VALUE + 7), scalarHash(5, Long.hashCode(Long.MIN_VALUE + 7)));
    equal(first.doubleEntry(-2.5), second.doubleEntry(-2.5), scalarHash(6, Double.hashCode(-2.5)));
    equal(first.utf8Entry(text), AnnotationValue.ofString(text).constant(), text.hashCode() | 0x40000000);
    equal(first.intEntry(-321), AnnotationValue.ofInt(-321).constant(), scalarHash(3, -321));
    equal(first.floatEntry(Float.POSITIVE_INFINITY), AnnotationValue.ofFloat(Float.POSITIVE_INFINITY).constant(), scalarHash(4, Float.hashCode(Float.POSITIVE_INFINITY)));
    equal(first.longEntry(123456789012345L), AnnotationValue.ofLong(123456789012345L).constant(), scalarHash(5, Long.hashCode(123456789012345L)));
    equal(first.doubleEntry(Double.NEGATIVE_INFINITY), AnnotationValue.ofDouble(Double.NEGATIVE_INFINITY).constant(), scalarHash(6, Double.hashCode(Double.NEGATIVE_INFINITY)));

    FloatEntry floatZero = first.floatEntry(0.0f), floatNegativeZero = second.floatEntry(-0.0f);
    check(floatZero.equals(floatNegativeZero) && floatNegativeZero.equals(floatZero), "Native float equality uses primitive == for signed zero");
    check(floatZero.hashCode() == scalarHash(4, 0) && floatNegativeZero.hashCode() == scalarHash(4, 0x80000000), "Native signed float zero hash keeps sign bits");
    DoubleEntry doubleZero = first.doubleEntry(0.0), doubleNegativeZero = second.doubleEntry(-0.0);
    check(doubleZero.equals(doubleNegativeZero) && doubleNegativeZero.equals(doubleZero), "Native double equality uses primitive == for signed zero");
    check(doubleZero.hashCode() == scalarHash(6, 0) && doubleNegativeZero.hashCode() == scalarHash(6, 0x80000000), "Native signed double zero hash keeps sign bits");
    FloatEntry floatNaN = AnnotationValue.ofFloat(Float.intBitsToFloat(0x7fc00001)).constant();
    FloatEntry otherFloatNaN = AnnotationValue.ofFloat(Float.intBitsToFloat(0x7fc00002)).constant();
    check(floatNaN != otherFloatNaN && floatNaN.equals(floatNaN) && !floatNaN.equals(otherFloatNaN), "Float NaN is equal only by entry identity");
    check(floatNaN.hashCode() == scalarHash(4, Float.hashCode(Float.NaN)) && floatNaN.hashCode() == otherFloatNaN.hashCode(), "Float NaN hash canonicalizes payloads");
    DoubleEntry doubleNaN = AnnotationValue.ofDouble(Double.longBitsToDouble(0x7ff8000000000001L)).constant();
    DoubleEntry otherDoubleNaN = AnnotationValue.ofDouble(Double.longBitsToDouble(0x7ff8000000000002L)).constant();
    check(doubleNaN != otherDoubleNaN && doubleNaN.equals(doubleNaN) && !doubleNaN.equals(otherDoubleNaN), "Double NaN is equal only by entry identity");
    check(doubleNaN.hashCode() == scalarHash(6, Double.hashCode(Double.NaN)) && doubleNaN.hashCode() == otherDoubleNaN.hashCode(), "Double NaN hash canonicalizes payloads");
    check(!first.intEntry(1).equals(second.longEntry(1)) && !first.floatEntry(1).equals(second.doubleEntry(1)), "Numeric entry kinds are not cross-type equal");
    check(!first.utf8Entry(text).equals(second.stringEntry(text)) && !first.utf8Entry(text).equals(text), "UTF entry equality never substitutes string/CONSTANT_String equality");
    check(!first.intEntry(1).equals(second.intEntry(2)) && !first.utf8Entry("a").equals(second.utf8Entry("b")), "Distinct semantic values compare unequal");
    check(!first.floatEntry(1).equals(second.floatEntry(2)) && !first.longEntry(1).equals(second.longEntry(2)) &&
      !first.doubleEntry(1).equals(second.doubleEntry(2)), "Distinct floating and long values compare unequal");

    PoolEntry[] written = new PoolEntry[5];
    ClassFile classFile = ClassFile.of();
    byte[] bytes = classFile.build(ClassDesc.of("classes.modern_test.AnnotationConstantPoolOutput"), builder -> {
      ConstantPoolBuilder pool = builder.constantPool();
      written[0] = pool.utf8Entry(text); written[1] = pool.intEntry(-321); written[2] = pool.floatEntry(1.25f);
      written[3] = pool.longEntry(123456789012345L); written[4] = pool.doubleEntry(-2.5);
    });
    ConstantPool parsed = classFile.parse(bytes).constantPool();
    int[] expectedHashes = {text.hashCode() | 0x40000000, scalarHash(3, -321), scalarHash(4, Float.hashCode(1.25f)),
      scalarHash(5, Long.hashCode(123456789012345L)), scalarHash(6, Double.hashCode(-2.5))};
    for (int index = 0; index < written.length; index++) {
      PoolEntry entry = parsed.entryByIndex(written[index].index());
      equal(written[index], entry, expectedHashes[index]);
      check(entry.constantPool() == parsed && entry.index() > 0, "Parsed entries keep their own indexed raw pool");
    }
    check(((Utf8Entry) parsed.entryByIndex(written[0].index())).stringValue().equals(text), "Raw modified UTF decoding agrees with nominal semantic content");
    System.out.println("CLASSFILE_ANNOTATION_CONSTANT_POOL_REGRESSION_OK|" + checks);
  }
}
