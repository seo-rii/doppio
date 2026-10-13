package java.lang.classfile;

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.lang.classfile.constantpool.DoppioConstantPool;
import java.lang.classfile.constantpool.LoadableConstantEntry;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.FieldRefEntry;
import java.lang.classfile.constantpool.InvokeDynamicEntry;
import java.lang.classfile.constantpool.MemberRefEntry;
import java.lang.classfile.instruction.BranchInstruction;
import java.lang.classfile.instruction.ArrayLoadInstruction;
import java.lang.classfile.instruction.ArrayStoreInstruction;
import java.lang.classfile.instruction.ConstantInstruction;
import java.lang.classfile.instruction.ConvertInstruction;
import java.lang.classfile.instruction.ExceptionCatch;
import java.lang.classfile.instruction.FieldInstruction;
import java.lang.classfile.instruction.IncrementInstruction;
import java.lang.classfile.instruction.InvokeInstruction;
import java.lang.classfile.instruction.InvokeDynamicInstruction;
import java.lang.classfile.instruction.LabelTarget;
import java.lang.classfile.instruction.LineNumber;
import java.lang.classfile.instruction.LocalVariable;
import java.lang.classfile.instruction.LocalVariableType;
import java.lang.classfile.instruction.CharacterRange;
import java.lang.classfile.instruction.LoadInstruction;
import java.lang.classfile.instruction.LookupSwitchInstruction;
import java.lang.classfile.instruction.NewObjectInstruction;
import java.lang.classfile.instruction.NewPrimitiveArrayInstruction;
import java.lang.classfile.instruction.NewReferenceArrayInstruction;
import java.lang.classfile.instruction.NewMultiArrayInstruction;
import java.lang.classfile.instruction.TypeCheckInstruction;
import java.lang.classfile.instruction.MonitorInstruction;
import java.lang.classfile.instruction.NopInstruction;
import java.lang.classfile.instruction.OperatorInstruction;
import java.lang.classfile.instruction.ReturnInstruction;
import java.lang.classfile.instruction.StackInstruction;
import java.lang.classfile.instruction.StoreInstruction;
import java.lang.classfile.instruction.SwitchCase;
import java.lang.classfile.instruction.TableSwitchInstruction;
import java.lang.classfile.instruction.ThrowInstruction;
import java.lang.constant.MethodTypeDesc;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.IdentityHashMap;
import java.util.List;

/** Label-identity Code layout with monotonic short-branch widening. */
final class DoppioCodeAssembler {
  private DoppioCodeAssembler() {}
  private static final byte[] NOP_BYTES = {0};

  static final class Result {
    final byte[] bytes;
    final int maxStack, maxLocals;
    final boolean controlFlow;
    final List<int[]> handlers;
    final IdentityHashMap<Label, Integer> labels;
    final List<int[]> lineNumbers;
    final boolean lineNumberTable;
    Result(byte[] bytes, int stack, int locals, boolean controlFlow, List<int[]> handlers,
        IdentityHashMap<Label, Integer> labels, List<int[]> lineNumbers, boolean lineNumberTable) {
      this.bytes = bytes; this.maxStack = stack; this.maxLocals = locals;
      this.controlFlow = controlFlow; this.handlers = handlers; this.labels = labels;
      this.lineNumbers = lineNumbers;
      this.lineNumberTable = lineNumberTable;
    }
  }

  private static final class Entry {
    final Instruction instruction;
    int bci, size;
    boolean widened;
    final byte[] bytes;
    Entry(Instruction instruction, byte[] bytes) {
      this.instruction = instruction; this.bytes = bytes;
    }
  }

  static Result assemble(DoppioConstantPool pool, List<CodeElement> elements,
      int allocatedLocals, Label start, Label end, ClassFile.DeadLabelsOption deadLabels,
      ClassFile.ShortJumpsOption shortJumps) {
    try {
      IdentityHashMap<Label, Integer> positions = new IdentityHashMap<Label, Integer>();
      positions.put(start, Integer.valueOf(0));
      List<Entry> entries = new ArrayList<Entry>();
      List<ExceptionCatch> catches = new ArrayList<ExceptionCatch>();
      List<int[]> lines = new ArrayList<int[]>();
      int locals = allocatedLocals, stack = 0, maximum = 0;
      boolean controlFlow = false;
      for (CodeElement element : elements) {
        if (element instanceof LabelTarget) {
          Label label = ((LabelTarget) element).label();
          if (label == end || positions.containsKey(label)) throw new IllegalArgumentException("Duplicate label binding");
          positions.put(label, Integer.valueOf(entries.size()));
        } else if (element instanceof ExceptionCatch) {
          catches.add((ExceptionCatch) element); controlFlow = true;
        } else if (element instanceof LineNumber) {
          lines.add(new int[] {entries.size(), ((LineNumber) element).line()});
        } else if (element instanceof LocalVariable || element instanceof LocalVariableType || element instanceof CharacterRange) {
          // Zero-width debug ranges are resolved against the final labels.
        } else if (element instanceof Instruction) {
          Instruction instruction = (Instruction) element;
          byte[] bytes = null;
          if (instruction instanceof BranchInstruction) {
            int opcode = instruction.opcode().bytecode();
            if (!(opcode >= 153 && opcode <= 167 || opcode == 198 || opcode == 199 || opcode == 200))
              throw new UnsupportedOperationException("Unselected branch opcode");
            controlFlow = true;
          } else if (instruction instanceof TableSwitchInstruction) {
            TableSwitchInstruction table = (TableSwitchInstruction) instruction;
            long count = (long) table.highValue() - (long) table.lowValue() + 1;
            if (count <= 0 || count > (65535 - 13) / 4)
              throw new IllegalArgumentException("Table switch range exceeds Code limit");
            controlFlow = true;
          } else if (instruction instanceof LookupSwitchInstruction) {
            if (((LookupSwitchInstruction) instruction).cases().size() > (65535 - 9) / 8)
              throw new IllegalArgumentException("Lookup switch exceeds Code limit");
            controlFlow = true;
          } else {
            bytes = encode(pool, instruction);
            if (instruction instanceof LoadInstruction) {
              LoadInstruction load = (LoadInstruction) instruction;
              locals = Math.max(locals, localLimit(load.slot(), load.typeKind().slotSize()));
            } else if (instruction instanceof StoreInstruction) {
              StoreInstruction store = (StoreInstruction) instruction;
              locals = Math.max(locals, localLimit(store.slot(), store.typeKind().slotSize()));
            } else if (instruction instanceof IncrementInstruction) {
              locals = Math.max(locals, localLimit(((IncrementInstruction) instruction).slot(), 1));
            }
          }
          if (!entries.isEmpty()) {
            Instruction previous = entries.get(entries.size() - 1).instruction;
            if (previous instanceof ReturnInstruction || previous instanceof ThrowInstruction) controlFlow = true;
          }
          entries.add(new Entry(instruction, bytes));
          stack += delta(instruction);
          maximum = Math.max(maximum, stack);
        } else throw new UnsupportedOperationException("Unselected Code element");
      }
      if (entries.isEmpty()) throw new IllegalArgumentException("Empty Code body");
      positions.put(end, Integer.valueOf(entries.size()));
      IdentityHashMap<Label, Integer> labels = new IdentityHashMap<Label, Integer>();
      int bci;
      boolean changed;
      do {
        bci = layout(entries, positions, labels);
        changed = false;
        for (Entry entry : entries) if (entry.instruction instanceof BranchInstruction) {
          int opcode = entry.instruction.opcode().bytecode();
          int distance = target(labels, ((BranchInstruction) entry.instruction).target(), bci, false) - entry.bci;
          if (opcode != 200 && !entry.widened && (distance < Short.MIN_VALUE || distance > Short.MAX_VALUE)) {
            if (shortJumps == ClassFile.ShortJumpsOption.FAIL_ON_SHORT_JUMPS)
              throw new IllegalArgumentException("Short branch overflow");
            entry.widened = true;
            changed = true;
          }
        }
      } while (changed);
      if (locals > 65535) throw new IllegalArgumentException("Code local-variable limit exceeded");
      ByteArrayOutputStream bytes = new ByteArrayOutputStream(bci);
      DataOutputStream output = new DataOutputStream(bytes);
      for (Entry entry : entries) {
        Instruction instruction = entry.instruction;
        if (instruction instanceof BranchInstruction) {
          int opcode = instruction.opcode().bytecode();
          int distance = target(labels, ((BranchInstruction) instruction).target(), bci, false) - entry.bci;
          if (entry.widened && opcode != 167) {
            output.writeByte(inverse(opcode)); output.writeShort(8);
            output.writeByte(200); output.writeInt(distance - 3);
          } else if (opcode == 200 || entry.widened) {
            output.writeByte(200); output.writeInt(distance);
          } else { output.writeByte(opcode); output.writeShort(distance); }
        } else if (instruction instanceof TableSwitchInstruction) {
          TableSwitchInstruction table = (TableSwitchInstruction) instruction;
          output.writeByte(170); pad(output, entry.bci);
          int defaultBci = target(labels, table.defaultTarget(), bci, false);
          output.writeInt(defaultBci - entry.bci); output.writeInt(table.lowValue()); output.writeInt(table.highValue());
          List<SwitchCase> cases = ordered(table.cases());
          int index = 0;
          for (long value = table.lowValue(); value <= table.highValue(); value++) {
            if (index < cases.size() && cases.get(index).caseValue() < value)
              throw new IllegalArgumentException("Table case outside declared range");
            int offset = defaultBci;
            if (index < cases.size() && cases.get(index).caseValue() == value)
              offset = target(labels, cases.get(index++).target(), bci, false);
            output.writeInt(offset - entry.bci);
          }
          if (index != cases.size()) throw new IllegalArgumentException("Table case outside declared range");
        } else if (instruction instanceof LookupSwitchInstruction) {
          LookupSwitchInstruction lookup = (LookupSwitchInstruction) instruction;
          output.writeByte(171); pad(output, entry.bci);
          output.writeInt(target(labels, lookup.defaultTarget(), bci, false) - entry.bci);
          List<SwitchCase> cases = ordered(lookup.cases()); output.writeInt(cases.size());
          for (SwitchCase value : cases) {
            output.writeInt(value.caseValue());
            output.writeInt(target(labels, value.target(), bci, false) - entry.bci);
          }
        } else output.write(entry.bytes);
      }
      List<int[]> handlers = new ArrayList<int[]>();
      for (ExceptionCatch handler : catches) {
        if (deadLabels == ClassFile.DeadLabelsOption.DROP_DEAD_LABELS &&
            (!labels.containsKey(handler.tryStart()) || !labels.containsKey(handler.tryEnd()) ||
             !labels.containsKey(handler.handler()))) continue;
        int from = target(labels, handler.tryStart(), bci, false);
        int to = target(labels, handler.tryEnd(), bci, true);
        int destination = target(labels, handler.handler(), bci, false);
        if (from >= to) throw new IllegalArgumentException("Exception range must be nonempty and ordered");
        int catchIndex = 0;
        if (handler.catchType().isPresent()) {
          ClassEntry catchType = (ClassEntry) pool.importEntry(handler.catchType().get());
          String descriptor = catchType.asSymbol().descriptorString();
          if (descriptor.charAt(0) != 'L') throw new IllegalArgumentException("Catch type must be a class type");
          catchIndex = catchType.index();
        }
        handlers.add(new int[] {from, to, destination, catchIndex});
      }
      if (handlers.size() > 65535) throw new IllegalArgumentException("Exception table limit exceeded");
      output.flush();
      byte[] result = bytes.toByteArray();
      if (result.length != bci) throw new IllegalArgumentException("Inconsistent Code layout");
      if (controlFlow) maximum = flowMaximum(entries, labels, handlers, bci);
      if (maximum > 65535) throw new IllegalArgumentException("Code operand-stack limit exceeded");
      List<int[]> finalLines = new ArrayList<int[]>();
      int lineBci = -1, currentLine = 0, writtenLine = -1;
      for (int[] line : lines) {
        int at = line[0] == entries.size() ? bci : entries.get(line[0]).bci;
        if (at != lineBci && currentLine != line[1]) {
          if (lineBci >= 0 && currentLine != writtenLine) {
            finalLines.add(new int[] {lineBci, currentLine}); writtenLine = currentLine;
          }
          lineBci = at;
        }
        currentLine = line[1];
      }
      if (lineBci >= 0 && currentLine != writtenLine) finalLines.add(new int[] {lineBci, currentLine});
      return new Result(result, maximum, locals, controlFlow, Collections.unmodifiableList(handlers), labels,
          Collections.unmodifiableList(finalLines), !lines.isEmpty());
    } catch (IOException error) { throw new IllegalArgumentException("Code serialization failed", error); }
  }

  private static int padding(int bci) { return (4 - ((bci + 1) & 3)) & 3; }

  private static int layout(List<Entry> entries, IdentityHashMap<Label, Integer> positions,
      IdentityHashMap<Label, Integer> labels) {
    int length = 0;
    for (Entry entry : entries) {
      entry.bci = length;
      Instruction instruction = entry.instruction;
      if (instruction instanceof BranchInstruction)
        entry.size = instruction.opcode() == Opcode.GOTO_W || entry.widened && instruction.opcode() == Opcode.GOTO ? 5 :
            entry.widened ? 8 : 3;
      else if (instruction instanceof TableSwitchInstruction) {
        TableSwitchInstruction table = (TableSwitchInstruction) instruction;
        entry.size = 1 + padding(length) + 12 + 4 * (int) ((long) table.highValue() - table.lowValue() + 1);
      } else if (instruction instanceof LookupSwitchInstruction)
        entry.size = 1 + padding(length) + 8 + 8 * ((LookupSwitchInstruction) instruction).cases().size();
      else entry.size = entry.bytes.length;
      length += entry.size;
      if (length > 65535) throw new IllegalArgumentException("Code length exceeds class-file limit");
    }
    for (Label label : positions.keySet()) {
      int index = positions.get(label).intValue();
      labels.put(label, Integer.valueOf(index == entries.size() ? length : entries.get(index).bci));
    }
    return length;
  }

  private static int inverse(int opcode) {
    if (opcode >= 153 && opcode <= 166) return opcode + ((opcode - 153) % 2 == 0 ? 1 : -1);
    if (opcode == 198 || opcode == 199) return opcode == 198 ? 199 : 198;
    throw new IllegalArgumentException("No inverse conditional branch");
  }

  /** Slot heights only: DROP_STACK_MAPS must not become implicit typed verification. */
  private static int flowMaximum(List<Entry> entries, IdentityHashMap<Label, Integer> labels,
      List<int[]> handlers, int length) {
    HashMap<Integer, Entry> instructions = new HashMap<Integer, Entry>();
    HashMap<Integer, Integer> heights = new HashMap<Integer, Integer>();
    List<Integer> queue = new ArrayList<Integer>();
    for (Entry entry : entries) instructions.put(Integer.valueOf(entry.bci), entry);
    enqueue(0, 0, instructions, heights, queue);
    int maximum = 0;
    for (int cursor = 0; cursor < queue.size(); cursor++) {
      Integer offset = queue.get(cursor); Entry entry = instructions.get(offset);
      int before = heights.get(offset).intValue(), after = before + delta(entry.instruction);
      if (after < 0 || after > 65535) throw new IllegalArgumentException("Invalid operand-stack slot height");
      maximum = Math.max(maximum, Math.max(before, after));
      for (int[] handler : handlers) if (entry.bci >= handler[0] && entry.bci < handler[1])
        enqueue(handler[2], 1, instructions, heights, queue);
      Instruction instruction = entry.instruction;
      int opcode = instruction.opcode().bytecode();
      if (instruction instanceof BranchInstruction) {
        enqueue(target(labels, ((BranchInstruction) instruction).target(), length, false), after,
          instructions, heights, queue);
        if (opcode != 167 && opcode != 200)
          enqueue(entry.bci + entry.size, after, instructions, heights, queue);
      } else if (instruction instanceof TableSwitchInstruction) {
        TableSwitchInstruction table = (TableSwitchInstruction) instruction;
        enqueue(target(labels, table.defaultTarget(), length, false), after, instructions, heights, queue);
        for (SwitchCase value : table.cases())
          enqueue(target(labels, value.target(), length, false), after, instructions, heights, queue);
      } else if (instruction instanceof LookupSwitchInstruction) {
        LookupSwitchInstruction lookup = (LookupSwitchInstruction) instruction;
        enqueue(target(labels, lookup.defaultTarget(), length, false), after, instructions, heights, queue);
        for (SwitchCase value : lookup.cases())
          enqueue(target(labels, value.target(), length, false), after, instructions, heights, queue);
      } else if (!(instruction instanceof ReturnInstruction || instruction instanceof ThrowInstruction)) {
        enqueue(entry.bci + entry.size, after, instructions, heights, queue);
      }
    }
    return maximum;
  }

  private static void enqueue(int bci, int height, HashMap<Integer, Entry> instructions,
      HashMap<Integer, Integer> heights, List<Integer> queue) {
    Integer key = Integer.valueOf(bci);
    if (!instructions.containsKey(key)) throw new IllegalArgumentException("Control flow falls outside an instruction boundary");
    Integer existing = heights.get(key);
    if (existing == null) { heights.put(key, Integer.valueOf(height)); queue.add(key); }
    else if (existing.intValue() != height) throw new IllegalArgumentException("Incompatible operand-stack heights at merge");
  }

  private static void pad(DataOutputStream output, int bci) throws IOException {
    for (int count = padding(bci); count > 0; count--) output.writeByte(0);
  }
  private static int target(IdentityHashMap<Label, Integer> labels, Label label, int length, boolean endAllowed) {
    Integer offset = labels.get(label);
    if (offset == null) throw new IllegalArgumentException("Unbound or foreign branch/handler label");
    if (offset.intValue() < 0 || offset.intValue() > length || !endAllowed && offset.intValue() == length)
      throw new IllegalArgumentException("Label is not an instruction boundary");
    return offset.intValue();
  }
  private static List<SwitchCase> ordered(List<SwitchCase> values) {
    List<SwitchCase> sorted = new ArrayList<SwitchCase>(values);
    Collections.sort(sorted, new Comparator<SwitchCase>() {
      public int compare(SwitchCase left, SwitchCase right) { return Integer.compare(left.caseValue(), right.caseValue()); }
    });
    for (int index = 1; index < sorted.size(); index++)
      if (sorted.get(index - 1).caseValue() == sorted.get(index).caseValue())
        throw new IllegalArgumentException("Duplicate switch case value");
    return sorted;
  }
  private static int localLimit(int slot, int size) {
    if (slot < 0 || slot > 65535 - size) throw new IllegalArgumentException("Local-variable limit exceeded");
    return slot + size;
  }
  private static void u2(DataOutputStream output, int value) throws IOException {
    if (value < 0 || value > 65535) throw new IllegalArgumentException("Unsigned-short class-file limit exceeded");
    output.writeShort(value);
  }
  private static void local(DataOutputStream output, TypeKind kind, int slot, boolean load) throws IOException {
    localLimit(slot, kind.slotSize());
    TypeKind type = kind.asLoadable();
    int family = type == TypeKind.INT ? 0 : type == TypeKind.LONG ? 1 : type == TypeKind.FLOAT ? 2 :
      type == TypeKind.DOUBLE ? 3 : type == TypeKind.REFERENCE ? 4 : -1;
    if (family < 0) throw new IllegalArgumentException("Unsupported local-variable type");
    int opcode = (load ? 0x15 : 0x36) + family;
    if (slot <= 3) output.writeByte((load ? 0x1a : 0x3b) + family * 4 + slot);
    else if (slot <= 255) { output.writeByte(opcode); output.writeByte(slot); }
    else { output.writeByte(0xc4); output.writeByte(opcode); u2(output, slot); }
  }

  private static byte[] encode(DoppioConstantPool pool, Instruction instruction) throws IOException {
    // The private operand encoding is only copied into the method stream.
    // Keep each public NOP value distinct, but do not allocate two IO streams
    // and their buffers to serialize every byte of a long live NOP region.
    if (instruction instanceof NopInstruction) return NOP_BYTES;
    ByteArrayOutputStream bytes = new ByteArrayOutputStream(); DataOutputStream output = new DataOutputStream(bytes);
    int opcode = instruction.opcode().bytecode();
    if (instruction instanceof ConstantInstruction) {
      ConstantInstruction constant = (ConstantInstruction) instruction;
      if (opcode == 0x10 || opcode == 0x11) {
        output.writeByte(opcode);
        int value = ((Number) (Object) constant.constantValue()).intValue();
        if (opcode == 0x10) output.writeByte(value); else output.writeShort(value);
      } else if (constant instanceof ConstantInstruction.LoadConstantInstruction) {
        LoadableConstantEntry entry = (LoadableConstantEntry) pool.importEntry(
          ((ConstantInstruction.LoadConstantInstruction) constant).constantEntry());
        if (opcode != 0x12 && opcode != 0x13 && opcode != 0x14)
          throw new IllegalArgumentException("Unsupported constant-pool load opcode");
        opcode = entry.typeKind().slotSize() == 2 ? 0x14 : entry.index() <= 255 ? 0x12 : 0x13;
        output.writeByte(opcode);
        if (opcode == 0x12) {
          output.writeByte(entry.index());
        } else u2(output, entry.index());
      } else {
        if (opcode < 1 || opcode > 15) throw new IllegalArgumentException("Unsupported constant instruction");
        output.writeByte(opcode);
      }
    } else if (instruction instanceof LoadInstruction) {
      LoadInstruction load = (LoadInstruction) instruction; local(output, load.typeKind(), load.slot(), true);
    } else if (instruction instanceof StoreInstruction) {
      StoreInstruction store = (StoreInstruction) instruction; local(output, store.typeKind(), store.slot(), false);
    } else if (instruction instanceof IncrementInstruction) {
      IncrementInstruction increment = (IncrementInstruction) instruction;
      localLimit(increment.slot(), 1);
      int amount = increment.constant();
      if (amount < Short.MIN_VALUE || amount > Short.MAX_VALUE) throw new IllegalArgumentException("iinc constant exceeds signed short");
      if (increment.slot() <= 255 && amount >= -128 && amount <= 127) {
        output.writeByte(132); output.writeByte(increment.slot()); output.writeByte(amount);
      } else { output.writeByte(196); output.writeByte(132); u2(output, increment.slot()); output.writeShort(amount); }
    } else if (instruction instanceof FieldInstruction) {
      FieldInstruction field = (FieldInstruction) instruction;
      FieldRefEntry entry = (FieldRefEntry) pool.importEntry(field.field());
      if (opcode < 178 || opcode > 181) throw new IllegalArgumentException("Unsupported field opcode");
      output.writeByte(opcode); u2(output, entry.index());
    } else if (instruction instanceof InvokeInstruction) {
      InvokeInstruction invoke = (InvokeInstruction) instruction;
      MemberRefEntry entry = (MemberRefEntry) pool.importEntry(invoke.method());
      if (opcode < 182 || opcode > 185) throw new IllegalArgumentException("Unsupported invocation opcode");
      output.writeByte(opcode); u2(output, entry.index());
      if (opcode == 185) {
        int parameters = DoppioBuilders.argumentSlots(invoke.type().stringValue()) + 1;
        if (parameters > 255) throw new IllegalArgumentException("invokeinterface slot limit exceeded");
        output.writeByte(parameters); output.writeByte(0);
      }
    } else if (instruction instanceof InvokeDynamicInstruction) {
      InvokeDynamicEntry entry = (InvokeDynamicEntry) pool.importEntry(((InvokeDynamicInstruction) instruction).invokedynamic());
      if (opcode != 186) throw new IllegalArgumentException("Unsupported dynamic invocation opcode");
      output.writeByte(186); u2(output, entry.index()); output.writeShort(0);
    } else if (instruction instanceof OperatorInstruction) {
      if (!(opcode >= 96 && opcode <= 131 || opcode >= 148 && opcode <= 152 || opcode == 190))
        throw new IllegalArgumentException("Unsupported operator opcode");
      output.writeByte(opcode);
    } else if (instruction instanceof ConvertInstruction) {
      if (opcode < 133 || opcode > 147) throw new IllegalArgumentException("Unsupported conversion opcode");
      output.writeByte(opcode);
    } else if (instruction instanceof StackInstruction) {
      if (opcode < 87 || opcode > 95) throw new IllegalArgumentException("Unsupported stack opcode");
      output.writeByte(opcode);
    } else if (instruction instanceof ReturnInstruction) {
      if (opcode < 172 || opcode > 177) throw new IllegalArgumentException("Unsupported return opcode");
      output.writeByte(opcode);
    } else if (instruction instanceof NopInstruction) output.writeByte(0);
    else if (instruction instanceof ThrowInstruction) output.writeByte(191);
    else if (instruction instanceof NewObjectInstruction) {
      NewObjectInstruction allocation = (NewObjectInstruction) instruction;
      ClassEntry entry = (ClassEntry) pool.importEntry(allocation.className());
      output.writeByte(187); u2(output, entry.index());
    } else if (instruction instanceof ArrayLoadInstruction || instruction instanceof ArrayStoreInstruction ||
        instruction instanceof MonitorInstruction) {
      output.writeByte(opcode);
    } else if (instruction instanceof NewPrimitiveArrayInstruction) {
      output.writeByte(188); output.writeByte(atype(((NewPrimitiveArrayInstruction) instruction).typeKind()));
    } else if (instruction instanceof NewReferenceArrayInstruction) {
      ClassEntry entry = (ClassEntry) pool.importEntry(((NewReferenceArrayInstruction) instruction).componentType());
      output.writeByte(189); u2(output, entry.index());
    } else if (instruction instanceof NewMultiArrayInstruction) {
      NewMultiArrayInstruction multi = (NewMultiArrayInstruction) instruction;
      ClassEntry entry = (ClassEntry) pool.importEntry(multi.arrayType());
      output.writeByte(197); u2(output, entry.index()); output.writeByte(multi.dimensions());
    } else if (instruction instanceof TypeCheckInstruction) {
      ClassEntry entry = (ClassEntry) pool.importEntry(((TypeCheckInstruction) instruction).type());
      output.writeByte(opcode); u2(output, entry.index());
    } else throw new UnsupportedOperationException("Unselected instruction generation");
    output.flush(); return bytes.toByteArray();
  }

  private static int atype(TypeKind kind) {
    switch (kind) {
      case BOOLEAN: return 4;
      case CHAR: return 5;
      case FLOAT: return 6;
      case DOUBLE: return 7;
      case BYTE: return 8;
      case SHORT: return 9;
      case INT: return 10;
      case LONG: return 11;
      default: throw new IllegalArgumentException("Invalid newarray component type");
    }
  }

  private static int delta(Instruction instruction) {
    if (instruction instanceof NopInstruction) return 0;
    int opcode = instruction.opcode().bytecode();
    if (instruction instanceof ConstantInstruction) return ((ConstantInstruction) instruction).typeKind().slotSize();
    if (instruction instanceof LoadInstruction) return ((LoadInstruction) instruction).typeKind().slotSize();
    if (instruction instanceof StoreInstruction) return -((StoreInstruction) instruction).typeKind().slotSize();
    if (instruction instanceof FieldInstruction) {
      int size = DoppioBuilders.fieldSlots(((FieldInstruction) instruction).typeSymbol().descriptorString());
      return opcode == 178 ? size : opcode == 179 ? -size : opcode == 180 ? size - 1 : -size - 1;
    }
    if (instruction instanceof InvokeInstruction) {
      String descriptor = ((InvokeInstruction) instruction).type().stringValue();
      return DoppioBuilders.fieldSlots(MethodTypeDesc.ofDescriptor(descriptor).returnType().descriptorString()) -
        DoppioBuilders.argumentSlots(descriptor) - (opcode == 184 ? 0 : 1);
    }
    if (instruction instanceof InvokeDynamicInstruction) {
      String descriptor = ((InvokeDynamicInstruction) instruction).type().stringValue();
      return DoppioBuilders.fieldSlots(MethodTypeDesc.ofDescriptor(descriptor).returnType().descriptorString()) -
        DoppioBuilders.argumentSlots(descriptor);
    }
    if (instruction instanceof OperatorInstruction) {
      if (opcode >= 148 && opcode <= 152) return opcode == 148 || opcode >= 151 ? -3 : -1;
      if (opcode >= 116 && opcode <= 119 || opcode == 190) return 0;
      if (opcode >= 120 && opcode <= 125) return -1;
      if (opcode >= 126 && opcode <= 131) return opcode % 2 == 0 ? -1 : -2;
      return opcode % 4 == 1 || opcode % 4 == 3 ? -2 : -1;
    }
    if (instruction instanceof ConvertInstruction) {
      int[] difference = {1, 0, 1, -1, -1, 0, 0, 1, 1, -1, 0, -1, 0, 0, 0};
      return difference[opcode - 133];
    }
    if (instruction instanceof StackInstruction)
      return opcode == 87 ? -1 : opcode == 88 ? -2 : opcode == 95 ? 0 : opcode >= 92 ? 2 : 1;
    if (instruction instanceof ArrayLoadInstruction) return ((ArrayLoadInstruction) instruction).typeKind().slotSize() - 2;
    if (instruction instanceof ArrayStoreInstruction) return -((ArrayStoreInstruction) instruction).typeKind().slotSize() - 2;
    if (instruction instanceof NewMultiArrayInstruction) return 1 - ((NewMultiArrayInstruction) instruction).dimensions();
    if (instruction instanceof MonitorInstruction) return -1;
    if (instruction instanceof ReturnInstruction) return opcode == 177 ? 0 : opcode == 173 || opcode == 175 ? -2 : -1;
    if (instruction instanceof ThrowInstruction) return -1;
    if (instruction instanceof NewObjectInstruction) return 1;
    if (instruction instanceof BranchInstruction) return opcode >= 159 && opcode <= 166 ? -2 : opcode == 167 || opcode == 200 ? 0 : -1;
    if (instruction instanceof TableSwitchInstruction || instruction instanceof LookupSwitchInstruction) return -1;
    return 0;
  }
}
