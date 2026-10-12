package java.lang.classfile;

import java.lang.classfile.constantpool.ConstantPool;
import java.lang.classfile.constantpool.ConstantPoolBuilder;
import java.lang.classfile.constantpool.PoolEntry;

public interface BufWriter {
  ConstantPoolBuilder constantPool();
  boolean canWriteDirect(ConstantPool pool);
  void reserveSpace(int length);
  void writeU1(int value);
  void writeU2(int value);
  void writeInt(int value);
  void writeFloat(float value);
  void writeLong(long value);
  void writeDouble(double value);
  void writeBytes(byte[] bytes);
  void writeBytes(byte[] bytes, int offset, int length);
  void patchInt(int offset, int length, int value);
  void writeIntBytes(int length, long value);
  void writeIndex(PoolEntry entry);
  void writeIndexOrZero(PoolEntry entry);
  int size();
}
