package java.lang.classfile;

import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.ConstantPoolBuilder;
import java.lang.constant.ClassDesc;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

public interface Interfaces extends ClassElement {
  List<ClassEntry> interfaces();
  static Interfaces of(List<ClassEntry> entries) {
    Objects.requireNonNull(entries);
    List<ClassEntry> copy = new ArrayList<ClassEntry>(entries);
    for (ClassEntry entry : copy) Objects.requireNonNull(entry);
    final List<ClassEntry> values = Collections.unmodifiableList(copy);
    return new Interfaces() { public List<ClassEntry> interfaces() { return values; } };
  }
  static Interfaces of(ClassEntry... entries) { return of(Arrays.asList(Objects.requireNonNull(entries).clone())); }
  static Interfaces ofSymbols(List<ClassDesc> symbols) {
    Objects.requireNonNull(symbols);
    ConstantPoolBuilder pool = ConstantPoolBuilder.of();
    List<ClassEntry> entries = new ArrayList<ClassEntry>();
    for (ClassDesc symbol : symbols) entries.add(pool.classEntry(Objects.requireNonNull(symbol)));
    return of(entries);
  }
  static Interfaces ofSymbols(ClassDesc... symbols) { return ofSymbols(Arrays.asList(Objects.requireNonNull(symbols).clone())); }
}
