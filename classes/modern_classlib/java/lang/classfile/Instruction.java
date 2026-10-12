package java.lang.classfile;

public interface Instruction extends CodeElement {
  Opcode opcode();
  int sizeInBytes();
}
