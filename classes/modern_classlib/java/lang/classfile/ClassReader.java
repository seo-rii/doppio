package java.lang.classfile;

import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.ConstantPool;
import java.lang.classfile.constantpool.PoolEntry;
import java.lang.classfile.constantpool.Utf8Entry;
import java.util.Optional;
import java.util.function.Function;

public interface ClassReader extends ConstantPool {
  Function<Utf8Entry, AttributeMapper<?>> customAttributes();
  int flags();
  ClassEntry thisClassEntry();
  Optional<ClassEntry> superclassEntry();
  int classfileLength();
  PoolEntry readEntry(int offset);
  <T extends PoolEntry> T readEntry(int offset, Class<T> type);
  PoolEntry readEntryOrNull(int offset);
  <T extends PoolEntry> T readEntryOrNull(int offset, Class<T> type);
  int readU1(int offset);
  int readU2(int offset);
  int readS1(int offset);
  int readS2(int offset);
  int readInt(int offset);
  long readLong(int offset);
  float readFloat(int offset);
  double readDouble(int offset);
  byte[] readBytes(int offset, int length);
  void copyBytesTo(BufWriter writer, int offset, int length);
}
