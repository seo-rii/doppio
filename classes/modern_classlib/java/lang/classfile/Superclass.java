package java.lang.classfile;

import java.lang.classfile.constantpool.ClassEntry;
import java.util.Objects;

public interface Superclass extends ClassElement {
  ClassEntry superclassEntry();
  static Superclass of(ClassEntry entry) {
    Objects.requireNonNull(entry);
    return new Superclass() { public ClassEntry superclassEntry() { return entry; } };
  }
}
