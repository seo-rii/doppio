package java.lang.classfile.instruction;

import java.lang.classfile.Instruction;
import java.lang.classfile.Opcode;
import java.lang.classfile.constantpool.InvokeDynamicEntry;
import java.lang.classfile.constantpool.LoadableConstantEntry;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ConstantDesc;
import java.lang.constant.DirectMethodHandleDesc;
import java.lang.constant.MethodTypeDesc;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

public interface InvokeDynamicInstruction extends Instruction {
  InvokeDynamicEntry invokedynamic();
  default Utf8Entry name() { return invokedynamic().name(); }
  default Utf8Entry type() { return invokedynamic().type(); }
  default MethodTypeDesc typeSymbol() { return invokedynamic().typeSymbol(); }
  default DirectMethodHandleDesc bootstrapMethod() { return invokedynamic().bootstrap().bootstrapMethod().asSymbol(); }
  default List<ConstantDesc> bootstrapArgs() {
    List<ConstantDesc> arguments = new ArrayList<ConstantDesc>();
    for (LoadableConstantEntry entry : invokedynamic().bootstrap().arguments()) arguments.add(entry.constantValue());
    return Collections.unmodifiableList(arguments);
  }
  static InvokeDynamicInstruction of(InvokeDynamicEntry entry) {
    final InvokeDynamicEntry constant = Objects.requireNonNull(entry);
    if (constant.tag() != 18) throw new IllegalArgumentException("invokedynamic requires an InvokeDynamic entry");
    return new InvokeDynamicInstruction() {
      public InvokeDynamicEntry invokedynamic() { return constant; }
      public Opcode opcode() { return Opcode.INVOKEDYNAMIC; }
      public int sizeInBytes() { return 5; }
    };
  }
}
