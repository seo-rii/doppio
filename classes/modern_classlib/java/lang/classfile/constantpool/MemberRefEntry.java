package java.lang.classfile.constantpool;

public interface MemberRefEntry extends PoolEntry {
  ClassEntry owner();
  NameAndTypeEntry nameAndType();
  default Utf8Entry name() { return nameAndType().name(); }
  default Utf8Entry type() { return nameAndType().type(); }
}
