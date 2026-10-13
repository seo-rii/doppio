package java.lang.classfile.instruction;

import java.lang.classfile.Label;
import java.lang.classfile.constantpool.Utf8Entry;
import java.util.Objects;

/** Real label-based debug values, independent of bound reader and writer models. */
public final class DoppioDebugInstructions {
  private DoppioDebugInstructions() { }
  private static final LineNumber[] LINES = new LineNumber[1000];
  static { for (int line = 0; line < LINES.length; line++) LINES[line] = new LineValue(line); }
  public static LineNumber lineNumber(int line) { return line < LINES.length ? LINES[line] : new LineValue(line); }
  public static LocalVariable localVariable(int slot, Utf8Entry name, Utf8Entry descriptor, Label start, Label end) {
    return new LocalValue(slot, name, descriptor, start, end);
  }
  public static LocalVariableType localVariableType(int slot, Utf8Entry name, Utf8Entry signature, Label start, Label end) {
    return new LocalTypeValue(slot, name, signature, start, end);
  }
  public static CharacterRange characterRange(Label start, Label end, int rangeStart, int rangeEnd, int flags) {
    return new RangeValue(start, end, rangeStart, rangeEnd, flags);
  }

  private static final class LineValue implements LineNumber {
    final int line;
    LineValue(int line) { this.line = line; }
    public int line() { return line; }
    public String toString() { return "LineNumber[line=" + line + "]"; }
  }

  private abstract static class LocalBase {
    final int slot;
    final Utf8Entry name, descriptor;
    final Label start, end;
    LocalBase(int slot, Utf8Entry name, Utf8Entry descriptor, Label start, Label end) {
      if ((slot & ~0xffff) != 0) throw new IllegalArgumentException("Slot value out of range: " + slot);
      this.slot = slot;
      this.name = Objects.requireNonNull(name);
      this.descriptor = Objects.requireNonNull(descriptor);
      this.start = Objects.requireNonNull(start);
      this.end = Objects.requireNonNull(end);
    }
    public int slot() { return slot; }
    public Utf8Entry name() { return name; }
    public Label startScope() { return start; }
    public Label endScope() { return end; }
  }
  private static final class LocalValue extends LocalBase implements LocalVariable {
    LocalValue(int slot, Utf8Entry name, Utf8Entry descriptor, Label start, Label end) { super(slot, name, descriptor, start, end); }
    public Utf8Entry type() { return descriptor; }
    public String toString() { return "LocalVariable[Slot=" + slot + ", name=" + name.stringValue() + ", descriptor='" + descriptor.stringValue() + "']"; }
  }
  private static final class LocalTypeValue extends LocalBase implements LocalVariableType {
    LocalTypeValue(int slot, Utf8Entry name, Utf8Entry signature, Label start, Label end) { super(slot, name, signature, start, end); }
    public Utf8Entry signature() { return descriptor; }
    public String toString() { return "LocalVariableType[Slot=" + slot + ", name=" + name.stringValue() + ", signature='" + descriptor.stringValue() + "']"; }
  }

  private static final class RangeValue implements CharacterRange {
    final Label start, end;
    final int rangeStart, rangeEnd, flags;
    RangeValue(Label start, Label end, int rangeStart, int rangeEnd, int flags) {
      this.start = Objects.requireNonNull(start); this.end = Objects.requireNonNull(end);
      this.rangeStart = rangeStart; this.rangeEnd = rangeEnd; this.flags = flags;
    }
    public Label startScope() { return start; }
    public Label endScope() { return end; }
    public int characterRangeStart() { return rangeStart; }
    public int characterRangeEnd() { return rangeEnd; }
    public int flags() { return flags; }
  }
}
