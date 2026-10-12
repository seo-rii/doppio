package java.lang.classfile.instruction;

import java.lang.classfile.Instruction;
import java.lang.classfile.Opcode;
import java.lang.classfile.TypeKind;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.ConstantPoolBuilder;
import java.lang.classfile.constantpool.DoppioConstantPool;
import java.lang.constant.ClassDesc;
import java.util.Objects;

/** Actual typed instruction values, independent of the class reader's lifecycle. */
public final class DoppioMemoryInstructions {
  private static final ConstantPoolBuilder TEMPORARY_POOL = DoppioConstantPool.temporaryPool();
  private DoppioMemoryInstructions() {}

  private static void checkKind(Opcode opcode, Opcode.Kind kind) {
    if (Objects.requireNonNull(opcode).kind() != kind) throw new IllegalArgumentException("Invalid instruction opcode kind");
  }

  private static TypeKind arrayKind(int offset) {
    switch (offset) {
      case 0: return TypeKind.INT;
      case 1: return TypeKind.LONG;
      case 2: return TypeKind.FLOAT;
      case 3: return TypeKind.DOUBLE;
      case 4: return TypeKind.REFERENCE;
      case 5: return TypeKind.BYTE;
      case 6: return TypeKind.CHAR;
      case 7: return TypeKind.SHORT;
      default: throw new IllegalArgumentException("Invalid array opcode");
    }
  }

  public static Opcode arrayOpcode(TypeKind kind, boolean store) {
    Objects.requireNonNull(kind);
    switch (kind) {
      case INT: return store ? Opcode.IASTORE : Opcode.IALOAD;
      case LONG: return store ? Opcode.LASTORE : Opcode.LALOAD;
      case FLOAT: return store ? Opcode.FASTORE : Opcode.FALOAD;
      case DOUBLE: return store ? Opcode.DASTORE : Opcode.DALOAD;
      case REFERENCE: return store ? Opcode.AASTORE : Opcode.AALOAD;
      case BOOLEAN: case BYTE: return store ? Opcode.BASTORE : Opcode.BALOAD;
      case CHAR: return store ? Opcode.CASTORE : Opcode.CALOAD;
      case SHORT: return store ? Opcode.SASTORE : Opcode.SALOAD;
      default: throw new IllegalArgumentException("Invalid array element type");
    }
  }

  static ArrayLoadInstruction arrayLoad(Opcode opcode) {
    checkKind(opcode, Opcode.Kind.ARRAY_LOAD);
    return new ArrayLoadValue(opcode, arrayKind(opcode.bytecode() - 46));
  }
  static ArrayStoreInstruction arrayStore(Opcode opcode) {
    checkKind(opcode, Opcode.Kind.ARRAY_STORE);
    return new ArrayStoreValue(opcode, arrayKind(opcode.bytecode() - 79));
  }
  static NewPrimitiveArrayInstruction newPrimitiveArray(TypeKind typeKind) {
    if (Objects.requireNonNull(typeKind).newarrayCode() < 0)
      throw new IllegalArgumentException("Invalid primitive array component type");
    return new PrimitiveArrayValue(typeKind);
  }
  static NewReferenceArrayInstruction newReferenceArray(ClassEntry componentType) {
    return new ReferenceArrayValue(Objects.requireNonNull(componentType));
  }
  static NewMultiArrayInstruction newMultiArray(ClassEntry arrayType, int dimensions) {
    // Native value factories validate only the encoded u1 dimension count.
    // Array descriptors and actual rank belong to writing/verification.
    if (dimensions < 1 || dimensions > 255) throw new IllegalArgumentException("Invalid array dimension count");
    return new MultiArrayValue(Objects.requireNonNull(arrayType), dimensions);
  }
  static TypeCheckInstruction typeCheck(Opcode opcode, ClassEntry type) {
    checkKind(opcode, Opcode.Kind.TYPE_CHECK);
    return new TypeCheckValue(opcode, Objects.requireNonNull(type));
  }
  static TypeCheckInstruction typeCheck(Opcode opcode, ClassDesc type) {
    // Preserve the native nominal overload's pool-conversion error precedence.
    return typeCheck(opcode, TEMPORARY_POOL.classEntry(type));
  }
  static MonitorInstruction monitor(Opcode opcode) {
    checkKind(opcode, Opcode.Kind.MONITOR);
    return new MonitorValue(opcode);
  }

  private abstract static class Value implements Instruction {
    final Opcode opcode;
    Value(Opcode opcode) { this.opcode = opcode; }
    public Opcode opcode() { return opcode; }
    public int sizeInBytes() { return opcode.sizeIfFixed(); }
  }
  private static final class ArrayLoadValue extends Value implements ArrayLoadInstruction {
    final TypeKind kind;
    ArrayLoadValue(Opcode opcode, TypeKind kind) { super(opcode); this.kind = kind; }
    public TypeKind typeKind() { return kind; }
  }
  private static final class ArrayStoreValue extends Value implements ArrayStoreInstruction {
    final TypeKind kind;
    ArrayStoreValue(Opcode opcode, TypeKind kind) { super(opcode); this.kind = kind; }
    public TypeKind typeKind() { return kind; }
  }
  private static final class PrimitiveArrayValue extends Value implements NewPrimitiveArrayInstruction {
    final TypeKind kind;
    PrimitiveArrayValue(TypeKind kind) { super(Opcode.NEWARRAY); this.kind = kind; }
    public TypeKind typeKind() { return kind; }
  }
  private static final class ReferenceArrayValue extends Value implements NewReferenceArrayInstruction {
    final ClassEntry component;
    ReferenceArrayValue(ClassEntry component) { super(Opcode.ANEWARRAY); this.component = component; }
    public ClassEntry componentType() { return component; }
  }
  private static final class MultiArrayValue extends Value implements NewMultiArrayInstruction {
    final ClassEntry type;
    final int dimensions;
    MultiArrayValue(ClassEntry type, int dimensions) { super(Opcode.MULTIANEWARRAY); this.type = type; this.dimensions = dimensions; }
    public ClassEntry arrayType() { return type; }
    public int dimensions() { return dimensions; }
  }
  private static final class TypeCheckValue extends Value implements TypeCheckInstruction {
    final ClassEntry type;
    TypeCheckValue(Opcode opcode, ClassEntry type) { super(opcode); this.type = type; }
    public ClassEntry type() { return type; }
  }
  private static final class MonitorValue extends Value implements MonitorInstruction {
    MonitorValue(Opcode opcode) { super(opcode); }
  }
}
