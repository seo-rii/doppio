package java.lang.classfile.constantpool;

import java.lang.classfile.BootstrapMethodEntry;
import java.util.Iterator;
import java.util.NoSuchElementException;

public interface ConstantPool extends Iterable<PoolEntry> {
  PoolEntry entryByIndex(int index);
  int size();
  <T extends PoolEntry> T entryByIndex(int index, Class<T> type);
  BootstrapMethodEntry bootstrapMethodEntry(int index);
  int bootstrapMethodCount();
  default Iterator<PoolEntry> iterator() {
    return new Iterator<PoolEntry>() {
      private int next = 1;
      public boolean hasNext() { return next < size(); }
      public PoolEntry next() {
        if (!hasNext()) throw new NoSuchElementException();
        PoolEntry entry = entryByIndex(next);
        next += entry.width();
        return entry;
      }
      public void remove() { throw new UnsupportedOperationException(); }
    };
  }
}
