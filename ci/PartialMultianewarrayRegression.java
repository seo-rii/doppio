package classes.modern_test;

import java.lang.classfile.ClassFile;
import java.lang.classfile.CodeElement;
import java.lang.classfile.CodeModel;
import java.lang.classfile.MethodModel;
import java.lang.classfile.Opcode;
import java.lang.classfile.instruction.NewMultiArrayInstruction;
import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDescs;
import java.lang.constant.MethodTypeDesc;
import java.lang.reflect.Array;
import java.lang.reflect.InvocationTargetException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Arrays;

/** Untouched javac-25 controls and native ClassFile-produced MULTIANEWARRAY inputs. */
public final class PartialMultianewarrayRegression {
  private interface Allocator {
    Object allocate(int family, int dimensions, int[] sizes) throws Throwable;
  }

  private static final ClassDesc REFERENCE = ConstantDescs.CD_String.arrayType(3);
  private static final ClassDesc PRIMITIVE = ConstantDescs.CD_int.arrayType(3);
  private static final ClassDesc RANK_ONE = ConstantDescs.CD_int.arrayType();
  private static final String[] METHOD_NAMES = {
    "referenceOne", "referenceTwo", "referenceFull",
    "primitiveOne", "primitiveTwo", "primitiveFull", "rankOne"
  };

  static String[][][] directReferenceOne(int n) { return new String[n][][]; }
  static String[][][] directReferenceTwo(int a, int b) { return new String[a][b][]; }
  static String[][][] directReferenceFull(int a, int b, int c) { return new String[a][b][c]; }
  static int[][][] directPrimitiveOne(int n) { return new int[n][][]; }
  static int[][][] directPrimitiveTwo(int a, int b) { return new int[a][b][]; }
  static int[][][] directPrimitiveFull(int a, int b, int c) { return new int[a][b][c]; }
  static int[] directRankOne(int n) { return new int[n]; }

  private static Object direct(int family, int dimensions, int[] sizes) {
    if (family == 2) return directRankOne(sizes[0]);
    if (family == 0) {
      if (dimensions == 1) return directReferenceOne(sizes[0]);
      if (dimensions == 2) return directReferenceTwo(sizes[0], sizes[1]);
      return directReferenceFull(sizes[0], sizes[1], sizes[2]);
    }
    if (dimensions == 1) return directPrimitiveOne(sizes[0]);
    if (dimensions == 2) return directPrimitiveTwo(sizes[0], sizes[1]);
    return directPrimitiveFull(sizes[0], sizes[1], sizes[2]);
  }

  private static void check(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
  }

  private static byte[] generate() {
    return ClassFile.of().build(ClassDesc.of("classes.modern_test.PartialMultianewarrayOutput"), builder -> {
      builder.withVersion(69, 0);
      for (int index = 0; index < METHOD_NAMES.length; index++) {
        final int dimensions = index == 6 ? 1 : index % 3 + 1;
        final ClassDesc type = index < 3 ? REFERENCE : index < 6 ? PRIMITIVE : RANK_ONE;
        ClassDesc[] parameters = new ClassDesc[dimensions];
        Arrays.fill(parameters, ConstantDescs.CD_int);
        builder.withMethodBody(METHOD_NAMES[index], MethodTypeDesc.of(type, parameters),
          ClassFile.ACC_PUBLIC | ClassFile.ACC_STATIC, code -> {
            for (int parameter = 0; parameter < dimensions; parameter++) code.iload(parameter);
            code.multianewarray(type, dimensions).areturn();
          });
      }
    });
  }

  private static final class OutputLoader extends ClassLoader {
    Class<?> define(byte[] bytes) { return defineClass(null, bytes, 0, bytes.length); }
  }

  private static Class<?> defineGenerated(byte[] bytes) {
    byte[] original = bytes.clone();
    ClassFile classFile = ClassFile.of();
    check(classFile.verify(bytes).isEmpty(), "Native-produced bytes must verify");
    int methods = 0;
    for (MethodModel method : classFile.parse(bytes).methods()) {
      int index = Arrays.asList(METHOD_NAMES).indexOf(method.methodName().stringValue());
      check(index >= 0, "Only the seven original generated methods");
      int dimensions = index == 6 ? 1 : index % 3 + 1;
      ClassDesc type = index < 3 ? REFERENCE : index < 6 ? PRIMITIVE : RANK_ONE;
      int allocations = 0;
      CodeModel code = method.code().get();
      for (CodeElement element : code) {
        if (element instanceof NewMultiArrayInstruction) {
          NewMultiArrayInstruction allocation = (NewMultiArrayInstruction) element;
          check(allocation.opcode() == Opcode.MULTIANEWARRAY, "Actual MULTIANEWARRAY opcode");
          check(allocation.dimensions() == dimensions, "Actual allocated-dimension operand");
          check(allocation.arrayType().asSymbol().equals(type), "Actual full-rank class operand");
          allocations++;
        }
      }
      check(allocations == 1, "Each generated method has one genuine MULTIANEWARRAY");
      methods++;
    }
    check(methods == 7, "Seven original generated methods");
    check(Arrays.equals(bytes, original), "Verification and parse must not rewrite input bytes");
    Class<?> result = new OutputLoader().define(bytes);
    check(Arrays.equals(bytes, original), "Definition must use the original bytes without rewriting");
    return result;
  }

  private static Object invokeGenerated(Class<?> output, int family, int dimensions, int[] sizes)
      throws Throwable {
    int index = family == 2 ? 6 : family * 3 + dimensions - 1;
    Class<?>[] parameters = new Class<?>[dimensions];
    Object[] arguments = new Object[dimensions];
    Arrays.fill(parameters, int.class);
    for (int i = 0; i < dimensions; i++) arguments[i] = Integer.valueOf(sizes[i]);
    try {
      return output.getDeclaredMethod(METHOD_NAMES[index], parameters).invoke(null, arguments);
    } catch (InvocationTargetException exception) {
      throw exception.getCause();
    }
  }

  private static void inspectArray(Object value, int family, int rank, int[] sizes, int depth) {
    check(value != null, "Requested dimension must be allocated at depth " + depth);
    String descriptor = family == 0 ? "Ljava.lang.String;" : "I";
    for (int i = depth; i < rank; i++) descriptor = "[" + descriptor;
    check(value.getClass().getName().equals(descriptor), "Exact runtime array class at depth " + depth);
    check(Array.getLength(value) == sizes[depth], "Exact requested length at depth " + depth);
    for (int i = 0; i < sizes[depth]; i++) {
      Object element = Array.get(value, i);
      if (depth + 1 < sizes.length) inspectArray(element, family, rank, sizes, depth + 1);
      else if (depth + 1 == rank && family != 0)
        check(Integer.valueOf(0).equals(element), "Allocated primitive leaves must contain zero");
      else check(element == null, "Unallocated array/reference leaves must remain null");
    }
  }

  private static int allocationCase(Allocator allocator, int family, int rank, int[] sizes)
      throws Throwable {
    boolean negative = false;
    for (int size : sizes) if (size < 0) negative = true;
    try {
      Object result = allocator.allocate(family, sizes.length, sizes);
      check(!negative, "Every supplied negative size must throw, even after a zero dimension");
      inspectArray(result, family, rank, sizes, 0);
    } catch (NegativeArraySizeException exception) {
      check(negative, "A nonnegative allocation must not throw NegativeArraySizeException");
    }
    return 1;
  }

  private static int matrix(Allocator allocator) throws Throwable {
    int count = 0;
    for (int family = 0; family < 2; family++) {
      for (int dimensions = 1; dimensions <= 3; dimensions++) {
        int[] positive = Arrays.copyOf(new int[] {2, 3, 4}, dimensions);
        count += allocationCase(allocator, family, 3, positive);
        for (int position = 0; position < dimensions; position++) {
          int[] zero = positive.clone(); zero[position] = 0;
          count += allocationCase(allocator, family, 3, zero);
          int[] negative = positive.clone(); negative[position] = -1;
          count += allocationCase(allocator, family, 3, negative);
          for (int earlier = 0; earlier < position; earlier++) {
            int[] zeroBeforeNegative = negative.clone(); zeroBeforeNegative[earlier] = 0;
            count += allocationCase(allocator, family, 3, zeroBeforeNegative);
          }
        }
      }
    }
    count += allocationCase(allocator, 2, 1, new int[] {3});
    count += allocationCase(allocator, 2, 1, new int[] {0});
    count += allocationCase(allocator, 2, 1, new int[] {-1});
    check(count == 41, "Exact partial/full allocation matrix count");
    return count;
  }

  public static void main(String[] arguments) throws Throwable {
    check(arguments.length > 0, "Required direct or generated mode");
    if (arguments[0].equals("direct")) {
      check(arguments.length == 1, "No extra direct-mode arguments");
      int count = matrix(PartialMultianewarrayRegression::direct);
      System.out.println("PARTIAL_MULTIANEWARRAY_DIRECT_OK|" + count);
    } else {
      check(arguments[0].equals("generated") && arguments.length == 3,
        "Required generated produce/consume mode and original byte-file path");
      byte[] bytes;
      if (arguments[1].equals("produce")) {
        bytes = generate();
        Files.write(Paths.get(arguments[2]), bytes);
      } else {
        check(arguments[1].equals("consume"), "Required original-byte consume mode");
        bytes = Files.readAllBytes(Paths.get(arguments[2]));
      }
      Class<?> output = defineGenerated(bytes);
      int count = matrix((family, dimensions, sizes) -> invokeGenerated(output, family, dimensions, sizes));
      System.out.println("PARTIAL_MULTIANEWARRAY_GENERATED_OK|" + count);
    }
  }
}
