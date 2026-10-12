package java.lang.classfile;

import java.lang.classfile.constantpool.*;
import java.util.Arrays;
import java.util.Objects;

/** Real byte buffer used by public custom mappers and selected typed attribute codecs. */
public final class DoppioBufWriter implements BufWriter {
  private final DoppioConstantPool pool;
  private byte[] bytes = new byte[64];
  private int size;

  public DoppioBufWriter(DoppioConstantPool pool) { this.pool = Objects.requireNonNull(pool); }
  public ConstantPoolBuilder constantPool() { return pool; }
  public boolean canWriteDirect(ConstantPool source) {
    return pool.canWriteDirect(source instanceof ClassReader ? DoppioClassReader.readerPool((ClassReader) source) : source);
  }
  public void reserveSpace(int length) {
    if (length < 0 || length > Integer.MAX_VALUE - size) throw new IllegalArgumentException("Invalid byte-buffer length");
    int required = size + length;
    if (required > bytes.length) {
      long doubled = (long) bytes.length * 2;
      int capacity = (int) Math.min(Integer.MAX_VALUE, Math.max((long) required, doubled));
      bytes = Arrays.copyOf(bytes, capacity);
    }
  }
  public void writeU1(int value) { reserveSpace(1); bytes[size++] = (byte) value; }
  public void writeU2(int value) { writeIntBytes(2, value); }
  public void writeInt(int value) { writeIntBytes(4, value); }
  public void writeFloat(float value) { writeInt(Float.floatToIntBits(value)); }
  public void writeLong(long value) { writeIntBytes(8, value); }
  public void writeDouble(double value) { writeLong(Double.doubleToLongBits(value)); }
  public void writeBytes(byte[] value) { writeBytes(value, 0, Objects.requireNonNull(value).length); }
  public void writeBytes(byte[] value, int offset, int length) {
    Objects.requireNonNull(value);
    if (offset < 0 || length < 0 || offset > value.length || length > value.length - offset)
      throw new IndexOutOfBoundsException("Invalid source byte range");
    reserveSpace(length);
    System.arraycopy(value, offset, bytes, size, length);
    size += length;
  }
  public void patchInt(int offset, int length, int value) {
    if (length < 0 || length > 8 || offset < 0 || offset > size || length > size - offset)
      throw new IllegalArgumentException("Invalid byte-buffer patch range");
    for (int index = 0; index < length; index++) bytes[offset + index] = (byte) ((long) value >>>
        (8 * (length - index - 1)));
  }
  public void writeIntBytes(int length, long value) {
    if (length < 0 || length > 8) throw new IllegalArgumentException("Integer byte width exceeds eight");
    reserveSpace(length);
    for (int index = 0; index < length; index++) bytes[size++] = (byte) (value >>> (8 * (length - index - 1)));
  }
  public void writeIndex(PoolEntry entry) {
    int index = pool.importEntry(Objects.requireNonNull(entry)).index();
    if (index <= 0 || index > 65535) throw new IllegalArgumentException("Invalid constant-pool index");
    writeU2(index);
  }
  public void writeIndexOrZero(PoolEntry entry) {
    if (entry == null || entry.index() == 0) writeU2(0);
    else writeIndex(entry);
  }
  public int size() { return size; }
  public byte[] bytes() { return Arrays.copyOf(bytes, size); }
}
