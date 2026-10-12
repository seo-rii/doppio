package java.lang.classfile;

import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.ConstantPool;
import java.lang.classfile.constantpool.ConstantDynamicEntry;
import java.lang.classfile.constantpool.InvokeDynamicEntry;
import java.lang.classfile.constantpool.FieldRefEntry;
import java.lang.classfile.constantpool.MemberRefEntry;
import java.lang.classfile.constantpool.PoolEntry;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;

/** Selected CFG analysis shared by generation and verification; never defines or initializes classes. */
final class DoppioCodeFlow {
  private DoppioCodeFlow() {}

  static final class Value {
    final char kind;
    final String descriptor;
    final int newBci;
    Value(char kind, String descriptor, int newBci) {
      this.kind = kind; this.descriptor = descriptor; this.newBci = newBci;
    }
    int slots() { return kind == 'J' || kind == 'D' ? 2 : 1; }
    boolean reference() { return kind == 'A' || kind == 'N' || kind == 'U'; }
    boolean same(Value other) {
      return kind == other.kind && newBci == other.newBci &&
          (descriptor == null ? other.descriptor == null : descriptor.equals(other.descriptor));
    }
  }
  static final Value TOP = new Value('T', null, -1);
  static final Value NULL = new Value('N', null, -1);

  static Value value(String descriptor) {
    char kind = descriptor.charAt(0);
    if (kind == 'L' || kind == '[') return new Value('A', descriptor, -1);
    if ("ZBCSI".indexOf(kind) >= 0) return new Value('I', "I", -1);
    if (kind == 'J' || kind == 'F' || kind == 'D') return new Value(kind, descriptor, -1);
    throw new VerifyError("Invalid value descriptor");
  }

  static final class Frame {
    final int bci;
    // Locals are JVM slots (including category-2 tails); stack is verification entries.
    final List<Value> locals, stack;
    final boolean thisInitialized;
    Frame(int bci, List<Value> locals, List<Value> stack) {
      this.bci = bci;
      this.locals = Collections.unmodifiableList(new ArrayList<>(locals));
      this.stack = Collections.unmodifiableList(new ArrayList<>(stack));
      boolean initialized = true;
      for (Value item : locals) if (item.kind == 'U' && item.newBci == -1) initialized = false;
      for (Value item : stack) if (item.kind == 'U' && item.newBci == -1) initialized = false;
      this.thisInitialized = initialized;
    }
  }
  static final class Result {
    final int maxStack;
    final List<Frame> frames;
    final byte[] code;
    final List<int[]> handlers;
    Result(int maxStack, List<Frame> frames, byte[] code, List<int[]> handlers) {
      this.maxStack = maxStack; this.frames = Collections.unmodifiableList(new ArrayList<>(frames));
      this.code = code.clone();
      List<int[]> copied = new ArrayList<>();
      for (int[] handler : handlers) copied.add(handler.clone());
      this.handlers = Collections.unmodifiableList(copied);
    }
  }

  static Result analyze(ClassDesc owner, ClassDesc superclass, List<ClassDesc> interfaces,
      ConstantPool pool, String methodName, MethodTypeDesc type, int flags,
      byte[] code, int maxStack, int maxLocals, List<int[]> handlers) {
    return analyze(owner, superclass, interfaces, pool, methodName, type, flags, code,
        maxStack, maxLocals, handlers, null, false, ClassHierarchyResolver.defaultResolver(), 0,
        ClassFile.DeadCodeOption.PATCH_DEAD_CODE);
  }

  static Result analyze(ClassDesc owner, ClassDesc superclass, List<ClassDesc> interfaces,
      ConstantPool pool, String methodName, MethodTypeDesc type, int flags,
      byte[] code, int maxStack, int maxLocals, List<int[]> handlers,
      Map<Integer, Frame> declaredFrames, boolean requireStackMaps) {
    return analyze(owner, superclass, interfaces, pool, methodName, type, flags, code,
        maxStack, maxLocals, handlers, declaredFrames, requireStackMaps,
        ClassHierarchyResolver.defaultResolver(), 0);
  }

  static Result analyze(ClassDesc owner, ClassDesc superclass, List<ClassDesc> interfaces,
      ConstantPool pool, String methodName, MethodTypeDesc type, int flags,
      byte[] code, int maxStack, int maxLocals, List<int[]> handlers,
      Map<Integer, Frame> declaredFrames, boolean requireStackMaps,
      ClassHierarchyResolver resolver, int ownerClassFlags) {
    return analyze(owner, superclass, interfaces, pool, methodName, type, flags, code,
        maxStack, maxLocals, handlers, declaredFrames, requireStackMaps, resolver, ownerClassFlags, null);
  }

  static Result analyze(ClassDesc owner, ClassDesc superclass, List<ClassDesc> interfaces,
      ConstantPool pool, String methodName, MethodTypeDesc type, int flags,
      byte[] code, int maxStack, int maxLocals, List<int[]> handlers,
      Map<Integer, Frame> declaredFrames, boolean requireStackMaps,
      ClassHierarchyResolver resolver, int ownerClassFlags, ClassFile.DeadCodeOption deadCode) {
    Analysis analysis = new Analysis(owner, superclass, interfaces, pool, methodName, type,
        flags, code, maxStack, maxLocals, handlers, declaredFrames, requireStackMaps,
        resolver, ownerClassFlags, deadCode);
    return analysis.run();
  }

  private static final class Instruction {
    final int bci, opcode, next;
    final int[] targets;
    Instruction(int bci, int opcode, int next, int[] targets) {
      this.bci = bci; this.opcode = opcode; this.next = next; this.targets = targets;
    }
    boolean conditional() { return opcode >= 153 && opcode <= 166 || opcode == 198 || opcode == 199; }
    boolean terminal() { return opcode >= 172 && opcode <= 177 || opcode == 191; }
  }

  private static final int[] FIXED = new int[256];
  private static final int[] NO_TARGETS = new int[0];
  static {
    Arrays.fill(FIXED, -1);
    for (Opcode opcode : Opcode.values())
      if (opcode.bytecode() < 256) FIXED[opcode.bytecode()] = opcode.sizeIfFixed();
  }
  private static void bytes(byte[] code, int cursor, int count) {
    if (cursor < 0 || count < 0 || cursor > code.length || count > code.length - cursor)
      throw new VerifyError("Truncated instruction");
  }
  private static int u2(byte[] code, int cursor) {
    bytes(code, cursor, 2);
    return (code[cursor] & 255) << 8 | code[cursor + 1] & 255;
  }
  private static int i4(byte[] code, int cursor) {
    bytes(code, cursor, 4);
    return (code[cursor] & 255) << 24 | (code[cursor + 1] & 255) << 16 |
        (code[cursor + 2] & 255) << 8 | code[cursor + 3] & 255;
  }
  private static int target(int bci, int offset, int length) {
    long target = (long) bci + offset;
    if (target < 0 || target >= length) throw new VerifyError("Branch target outside Code");
    return (int) target;
  }

  private static final class Analysis {
    final ClassDesc owner, superclass;
    final List<ClassDesc> interfaces;
    final ConstantPool pool;
    final DoppioClassHierarchy hierarchy;
    final MethodTypeDesc type;
    final byte[] code;
    final int maxStack, maxLocals;
    final List<int[]> handlers;
    final Map<Integer, Frame> declared;
    final boolean requireStackMaps;
    final ClassFile.DeadCodeOption deadCode;
    final Map<Integer, Instruction> instructions = new LinkedHashMap<>();
    final TreeSet<Integer> frameTargets = new TreeSet<>();
    final TreeSet<Integer> blockStarts = new TreeSet<>();
    // Published states are never mutated: execution and changed joins copy first.
    final Map<Integer, State> entries = new LinkedHashMap<>();
    final ArrayDeque<Integer> pending = new ArrayDeque<>();
    final State initial;
    int observedStack;

    Analysis(ClassDesc owner, ClassDesc superclass, List<ClassDesc> interfaces,
        ConstantPool pool, String name, MethodTypeDesc type, int flags, byte[] code,
        int maxStack, int maxLocals, List<int[]> handlers, Map<Integer, Frame> declared,
        boolean requireStackMaps, ClassHierarchyResolver resolver, int ownerClassFlags,
        ClassFile.DeadCodeOption deadCode) {
      this.owner = owner; this.superclass = superclass; this.interfaces = interfaces;
      this.pool = pool; this.type = type; this.code = code;
      this.hierarchy = new DoppioClassHierarchy(resolver, owner, superclass, ownerClassFlags);
      this.maxStack = maxStack; this.maxLocals = maxLocals; this.handlers = handlers;
      this.declared = declared;
      this.requireStackMaps = requireStackMaps; this.deadCode = deadCode;
      if (code.length == 0 || code.length > 65535 || maxStack < 0 || maxStack > 65535 ||
          maxLocals < 0 || maxLocals > 65535) throw new VerifyError("Invalid Code limits");
      decode();
      for (Instruction instruction : instructions.values()) {
        for (int destination : instruction.targets) {
          if (!instructions.containsKey(destination)) throw new VerifyError("Branch target is not an instruction start");
          frameTargets.add(destination);
        }
        if ((instruction.targets.length != 0 || instruction.terminal()) && instruction.next < code.length)
          blockStarts.add(instruction.next);
      }
      for (int[] handler : handlers) {
        if (handler.length != 4 || handler[0] >= handler[1] || !instructions.containsKey(handler[0]) ||
            handler[1] != code.length && !instructions.containsKey(handler[1]) || !instructions.containsKey(handler[2]))
          throw new VerifyError("Invalid exception-handler range");
        if (handler[3] != 0) {
          String caught = pool.entryByIndex(handler[3], ClassEntry.class).asSymbol().descriptorString();
          if (!hierarchy.assignable(caught, "Ljava/lang/Throwable;"))
            throw new VerifyError("Exception catch type is not assignable to Throwable");
        }
        frameTargets.add(handler[2]);
      }
      blockStarts.addAll(frameTargets);
      if (declared != null) for (Frame frame : declared.values()) {
        if (!instructions.containsKey(frame.bci) || frame.locals.size() > maxLocals)
          throw new VerifyError("Invalid stack-map target or locals");
        for (Value item : frame.stack) if (item.kind == 'T') throw new VerifyError("TOP on stack-map operand stack");
        checkUninitialized(frame.locals); checkUninitialized(frame.stack);
      }
      if (requireStackMaps) for (int destination : frameTargets)
        if (declared == null || !declared.containsKey(destination)) throw new VerifyError("Missing stack-map frame at branch/handler target");
      initial = new State(this);
      boolean constructor = "<init>".equals(name);
      initial.thisInitialized = !constructor || "Ljava/lang/Object;".equals(owner.descriptorString()) && superclass == null;
      int slot = 0;
      if ((flags & ClassFile.ACC_STATIC) == 0) {
        initial.local(slot++, constructor && !initial.thisInitialized ?
            new Value('U', owner.descriptorString(), -1) : value(owner.descriptorString()));
      }
      for (ClassDesc parameter : type.parameterList()) {
        Value item = value(parameter.descriptorString()); initial.local(slot, item); slot += item.slots();
      }
    }

    void checkUninitialized(List<Value> values) {
      for (Value item : values) if (item.kind == 'U' && item.newBci >= 0) {
        Instruction source = instructions.get(item.newBci);
        if (source == null || source.opcode != 187) throw new VerifyError("Uninitialized stack-map offset is not new");
        String allocated = pool.entryByIndex(u2(code, item.newBci + 1), ClassEntry.class).asSymbol().descriptorString();
        if (!allocated.equals(item.descriptor)) throw new VerifyError("Uninitialized stack-map class mismatch");
      }
    }

    void decode() {
      int cursor = 0;
      while (cursor < code.length) {
        int bci = cursor, opcode = code[cursor] & 255, size = FIXED[opcode];
        int[] targets = NO_TARGETS;
        if (opcode == 170 || opcode == 171) {
          cursor++;
          while ((cursor & 3) != 0) {
            bytes(code, cursor, 1);
            if (code[cursor++] != 0) throw new VerifyError("Nonzero switch padding");
          }
          int fallback = target(bci, i4(code, cursor), code.length); cursor += 4;
          if (opcode == 170) {
            int low = i4(code, cursor), high = i4(code, cursor + 4); cursor += 8;
            long count = (long) high - low + 1;
            if (count <= 0 || count > (code.length - cursor) / 4) throw new VerifyError("Invalid tableswitch range");
            targets = new int[(int) count + 1]; targets[0] = fallback;
            for (int i = 1; i < targets.length; i++, cursor += 4) targets[i] = target(bci, i4(code, cursor), code.length);
          } else {
            int count = i4(code, cursor); cursor += 4;
            if (count < 0 || count > (code.length - cursor) / 8) throw new VerifyError("Invalid lookupswitch count");
            targets = new int[count + 1]; targets[0] = fallback;
            int previous = 0;
            for (int i = 1; i <= count; i++, cursor += 8) {
              int key = i4(code, cursor);
              if (i > 1 && key <= previous) throw new VerifyError("Unsorted lookupswitch keys");
              previous = key; targets[i] = target(bci, i4(code, cursor + 4), code.length);
            }
          }
        } else if (opcode == 196) {
          bytes(code, cursor, 2);
          int operation = code[cursor + 1] & 255;
          size = operation == 132 ? 6 : 4;
          if (!(operation >= 21 && operation <= 25 || operation >= 54 && operation <= 58 || operation == 132 || operation == 169))
            throw new VerifyError("Invalid wide opcode");
          bytes(code, cursor, size); cursor += size;
        } else {
          if (size <= 0) throw new VerifyError("Invalid opcode");
          bytes(code, cursor, size); cursor += size;
          if (opcode >= 153 && opcode <= 168 || opcode == 198 || opcode == 199)
            targets = new int[] { target(bci, (short) u2(code, bci + 1), code.length) };
          else if (opcode == 200 || opcode == 201)
            targets = new int[] { target(bci, i4(code, bci + 1), code.length) };
        }
        instructions.put(bci, new Instruction(bci, opcode, cursor, targets));
      }
    }

    Result run() {
      offer(0, initial);
      for (;;) {
      while (!pending.isEmpty()) {
        int bci = pending.removeFirst();
        Instruction instruction = instructions.get(bci);
        // Entry states are immutable snapshots. A NOP has no normal-state effect,
        // so long basic blocks may safely share a snapshot rather than copying it.
        State entry = entries.get(bci);
        State state = instruction.opcode == 0 ? entry : entry.copy();
        for (int[] handler : handlers) if (bci >= handler[0] && bci < handler[1]) {
          State caught = state.copy(); caught.stack.clear(); caught.stackSlots = 0;
          if (instruction.opcode == 183) {
            MemberRefEntry method = pool.entryByIndex(u2(code, bci + 1), MemberRefEntry.class);
            if ("<init>".equals(method.nameAndType().name().stringValue())) {
              MethodTypeDesc signature = MethodTypeDesc.ofDescriptor(method.nameAndType().type().stringValue());
              int receiverIndex = state.stack.size() - signature.parameterCount() - 1;
              if (receiverIndex < 0) throw new VerifyError("Invalid constructor operand stack");
              Value receiver = state.stack.get(receiverIndex);
              for (int slot = 0; slot < caught.locals.length; slot++)
                if (caught.locals[slot].same(receiver)) caught.locals[slot] = TOP;
            }
          }
          caught.push(value(handler[3] == 0 ? "Ljava/lang/Throwable;" : pool.entryByIndex(handler[3], ClassEntry.class).asSymbol().descriptorString()));
          offer(handler[2], caught);
        }
        execute(state, instruction);
        if (instruction.terminal()) continue;
        if (instruction.opcode == 168 || instruction.opcode == 169 || instruction.opcode == 201) unsupported("jsr/ret flow");
        for (int destination : instruction.targets) offer(destination, state);
        if (instruction.targets.length == 0 || instruction.conditional()) {
          if (instruction.next == code.length) throw new VerifyError("Code falls off the end");
          offer(instruction.next, state);
        }
      }
      if (entries.size() == instructions.size() || deadCode != null) break;
      Instruction disconnected = null;
      for (Instruction instruction : instructions.values()) if (!entries.containsKey(instruction.bci)) {
        disconnected = instruction; break;
      }
      Frame frame = declared == null ? null : declared.get(disconnected.bci);
      if (frame == null) {
        if (requireStackMaps) throw new VerifyError("Missing stack-map frame for unreachable block at " + disconnected.bci);
        break; // Legacy inference ignores unreachable instructions, but structural decoding still covers them.
      }
      State state = new State(this); state.thisInitialized = frame.thisInitialized;
      for (int slot = 0; slot < frame.locals.size(); slot++) state.locals[slot] = frame.locals.get(slot);
      for (Value item : frame.stack) state.push(item);
      offer(disconnected.bci, state);
      }
      Map<Integer, Frame> frames = new TreeMap<>();
      for (int bci : frameTargets) {
        State state = entries.get(bci);
        if (state != null) frames.put(bci, new Frame(bci, Arrays.asList(state.locals), state.stack));
      }
      byte[] output = code.clone(); List<int[]> outputHandlers = handlers;
      if (entries.size() != instructions.size() && deadCode != null) {
        if (deadCode == ClassFile.DeadCodeOption.KEEP_DEAD_CODE) {
          for (Instruction instruction : instructions.values()) if (!entries.containsKey(instruction.bci))
            throw new IllegalArgumentException("Unable to generate stack map frame for dead code at bytecode offset " + instruction.bci);
        }
        int start = -1, end = -1;
        for (Instruction instruction : instructions.values()) {
          if (entries.containsKey(instruction.bci) || start >= 0 && blockStarts.contains(instruction.bci)) {
            if (start >= 0) { patch(output, frames, start, end); start = -1; }
          }
          if (!entries.containsKey(instruction.bci)) {
            if (start < 0) start = instruction.bci;
            end = instruction.next;
          }
        }
        if (start >= 0) patch(output, frames, start, end);
        outputHandlers = new ArrayList<>();
        for (int[] handler : handlers) {
          int rangeStart = -1, rangeEnd = -1;
          for (Instruction instruction : instructions.values()) {
            if (instruction.bci < handler[0]) continue;
            if (instruction.bci >= handler[1]) break;
            if (entries.containsKey(instruction.bci)) {
              if (rangeStart < 0) rangeStart = instruction.bci;
              rangeEnd = instruction.next;
            } else if (rangeStart >= 0) {
              outputHandlers.add(new int[] { rangeStart, rangeEnd, handler[2], handler[3] }); rangeStart = -1;
            }
          }
          if (rangeStart >= 0) outputHandlers.add(new int[] { rangeStart, rangeEnd, handler[2], handler[3] });
        }
      }
      return new Result(observedStack, new ArrayList<>(frames.values()), output, outputHandlers);
    }

    void patch(byte[] output, Map<Integer, Frame> frames, int start, int end) {
      Arrays.fill(output, start, end, (byte) 0); output[end - 1] = (byte) 191;
      List<Value> locals = new ArrayList<>();
      for (int slot = 0; slot < maxLocals; slot++) locals.add(TOP);
      frames.put(start, new Frame(start, locals, Collections.singletonList(value("Ljava/lang/Throwable;"))));
      observedStack = Math.max(observedStack, 1);
    }

    void offer(int bci, State incoming) {
      State candidate = incoming;
      Frame frame = declared == null ? null : declared.get(bci);
      if (frame != null) {
        candidate = incoming.copy();
        if (!candidate.thisInitialized && frame.thisInitialized)
          throw new VerifyError("Stack-map frame loses uninitializedThis constructor state");
        if (candidate.stack.size() != frame.stack.size()) throw new VerifyError("Stack-map stack height mismatch");
        for (int i = 0; i < frame.stack.size(); i++) compatible(candidate.stack.get(i), frame.stack.get(i), false);
        for (int i = 0; i < maxLocals; i++) compatible(candidate.locals[i], i < frame.locals.size() ? frame.locals.get(i) : TOP, true);
        Arrays.fill(candidate.locals, TOP);
        for (int i = 0; i < frame.locals.size(); i++) candidate.locals[i] = frame.locals.get(i);
        candidate.stack.clear(); candidate.stackSlots = 0;
        for (Value item : frame.stack) candidate.push(item);
      }
      State current = entries.get(bci);
      if (current == null) { entries.put(bci, candidate); pending.add(bci); return; }
      if (current.stack.size() != candidate.stack.size()) throw new VerifyError("Incompatible stack heights at join");
      State joinedState = null;
      for (int i = 0; i < maxLocals; i++) {
        Value joined = merge(current.locals[i], candidate.locals[i], true);
        if (!joined.same(current.locals[i])) {
          if (joinedState == null) joinedState = current.copy();
          joinedState.locals[i] = joined;
        }
      }
      for (int i = 0; i < current.stack.size(); i++) {
        Value joined = merge(current.stack.get(i), candidate.stack.get(i), false);
        if (!joined.same(current.stack.get(i))) {
          if (joinedState == null) joinedState = current.copy();
          joinedState.stack.set(i, joined);
        }
      }
      if (current.thisInitialized && !candidate.thisInitialized) {
        if (joinedState == null) joinedState = current.copy();
        joinedState.thisInitialized = false;
      }
      if (joinedState != null) { entries.put(bci, joinedState); pending.add(bci); }
    }

    void compatible(Value actual, Value expected, boolean local) {
      if (local && expected.kind == 'T') return;
      if (actual.same(expected)) return;
      if (expected.kind == 'A') { assign(actual, expected.descriptor); return; }
      throw new VerifyError("Stack-map verification type mismatch");
    }
    Value merge(Value left, Value right, boolean local) {
      if (left.same(right)) return left;
      if (left.kind == 'N' && right.kind == 'A') return right;
      if (right.kind == 'N' && left.kind == 'A') return left;
      if (left.kind == 'A' && right.kind == 'A')
        return value(hierarchy.commonAncestor(left.descriptor, right.descriptor));
      if (local) return TOP;
      throw new VerifyError("Incompatible operand types at join");
    }
    void assign(Value actual, String descriptor) {
      Value expected = value(descriptor);
      if (expected.kind != 'A') {
        if (actual.kind != expected.kind) throw new VerifyError("Incompatible primitive value");
        return;
      }
      if (actual.kind == 'N') return;
      if (actual.kind != 'A') throw new VerifyError("Incompatible reference value");
      if (!hierarchy.assignable(actual.descriptor, descriptor))
        throw new VerifyError("Reference " + actual.descriptor + " is not assignable to " + descriptor);
    }

    void execute(State state, Instruction instruction) {
      int opcode = instruction.opcode, bci = instruction.bci;
      if (opcode >= 26 && opcode <= 45) state.load((opcode - 26) % 4, "IJFDA".charAt((opcode - 26) / 4));
      else if (opcode >= 59 && opcode <= 78) state.local((opcode - 59) % 4, state.pop("IJFDA".charAt((opcode - 59) / 4)));
      else if (opcode >= 2 && opcode <= 8) state.push(value("I"));
      else if (opcode >= 9 && opcode <= 10) state.push(value("J"));
      else if (opcode >= 11 && opcode <= 13) state.push(value("F"));
      else if (opcode >= 14 && opcode <= 15) state.push(value("D"));
      else if (opcode >= 96 && opcode <= 115) {
        char kind = "IJFD".charAt((opcode - 96) % 4); state.pop(kind); state.pop(kind); state.push(value(String.valueOf(kind)));
      } else if (opcode >= 116 && opcode <= 119) {
        char kind = "IJFD".charAt(opcode - 116); state.pop(kind); state.push(value(String.valueOf(kind)));
      } else if (opcode >= 120 && opcode <= 125) {
        char kind = (opcode & 1) == 0 ? 'I' : 'J'; state.pop('I'); state.pop(kind); state.push(value(String.valueOf(kind)));
      } else if (opcode >= 126 && opcode <= 131) {
        char kind = (opcode & 1) == 0 ? 'I' : 'J'; state.pop(kind); state.pop(kind); state.push(value(String.valueOf(kind)));
      } else if (opcode >= 133 && opcode <= 147) {
        state.pop("IIIJJJFFFDDDIII".charAt(opcode - 133)); state.push(value(String.valueOf("JFDIFDIJDIJFIII".charAt(opcode - 133))));
      } else if (opcode >= 148 && opcode <= 152) {
        char kind = opcode == 148 ? 'J' : opcode <= 150 ? 'F' : 'D'; state.pop(kind); state.pop(kind); state.push(value("I"));
      } else if (opcode >= 153 && opcode <= 158) state.pop('I');
      else if (opcode >= 159 && opcode <= 164) { state.pop('I'); state.pop('I'); }
      else if (opcode == 165 || opcode == 166) { state.pop('A'); state.pop('A'); }
      else if (opcode >= 46 && opcode <= 53) array(state, opcode, false);
      else if (opcode >= 79 && opcode <= 86) array(state, opcode, true);
      else switch (opcode) {
        case 0: case 167: case 200: break;
        case 1: state.push(NULL); break;
        case 16: case 17: state.push(value("I")); break;
        case 18: constant(state, code[bci + 1] & 255, false); break;
        case 19: case 20: constant(state, u2(code, bci + 1), opcode == 20); break;
        case 21: case 22: case 23: case 24: case 25: state.load(code[bci + 1] & 255, "IJFDA".charAt(opcode - 21)); break;
        case 54: case 55: case 56: case 57: case 58: state.local(code[bci + 1] & 255, state.pop("IJFDA".charAt(opcode - 54))); break;
        case 87: case 88: case 89: case 90: case 91: case 92: case 93: case 94: case 95:
          stack(state, opcode); break;
        case 132: state.checkLocal(code[bci + 1] & 255, 'I'); break;
        case 170: case 171: state.pop('I'); break;
        case 172: case 173: case 174: case 175: case 176: case 177: {
          String descriptor = type.returnType().descriptorString(); char kind = "IJFDAV".charAt(opcode - 172);
          if (kind == 'V') { if (!"V".equals(descriptor)) throw new VerifyError("Void return in value method"); }
          else {
            if ("V".equals(descriptor) || value(descriptor).kind != kind) throw new VerifyError("Return opcode does not match method descriptor");
            assign(state.pop(kind), descriptor);
          }
          if (!state.thisInitialized) throw new VerifyError("Constructor returns before initialization");
          break;
        }
        case 178: case 179: case 180: case 181: field(state, opcode, u2(code, bci + 1)); break;
        case 182: case 183: case 184: case 185: invoke(state, opcode, u2(code, bci + 1), bci); break;
        case 186: {
          if (code[bci + 3] != 0 || code[bci + 4] != 0) throw new VerifyError("Invalid invokedynamic operands");
          InvokeDynamicEntry call = pool.entryByIndex(u2(code, bci + 1), InvokeDynamicEntry.class);
          checkBootstrap(call.bootstrap());
          String name = call.name().stringValue();
          if ("<init>".equals(name) || "<clinit>".equals(name)) throw new VerifyError("Invalid invokedynamic name");
          MethodTypeDesc signature = call.typeSymbol();
          for (int i = signature.parameterCount() - 1; i >= 0; i--) assign(state.pop(), signature.parameterType(i).descriptorString());
          String result = signature.returnType().descriptorString();
          if (!"V".equals(result)) state.push(value(result));
          break;
        }
        case 187: {
          ClassDesc allocated = pool.entryByIndex(u2(code, bci + 1), ClassEntry.class).asSymbol();
          if (!allocated.isClassOrInterface()) throw new VerifyError("new requires a class type");
          for (Value item : state.stack)
            if (item.kind == 'U' && item.newBci == bci) throw new VerifyError("new repeats a live allocation token");
          for (int slot = 0; slot < state.locals.length; slot++)
            if (state.locals[slot].kind == 'U' && state.locals[slot].newBci == bci) state.locals[slot] = TOP;
          state.push(new Value('U', allocated.descriptorString(), bci)); break;
        }
        case 188: {
          int atype = code[bci + 1] & 255;
          if (atype < 4 || atype > 11) throw new VerifyError("Invalid newarray type code");
          state.pop('I'); state.push(value("[" + "ZCFDBSIJ".charAt(atype - 4))); break;
        }
        case 189: {
          ClassDesc component = pool.entryByIndex(u2(code, bci + 1), ClassEntry.class).asSymbol();
          String descriptor = component.descriptorString();
          if (!component.isClassOrInterface() && !component.isArray()) throw new VerifyError("Invalid anewarray component type");
          state.pop('I'); state.push(value("[" + descriptor)); break;
        }
        case 190: {
          Value operand = state.pop('A'); requireArray(operand, null, false); state.push(value("I")); break;
        }
        case 191: {
          Value thrown = state.pop('A'); initializedReference(thrown);
          if (thrown.kind != 'N') assign(thrown, "Ljava/lang/Throwable;"); break;
        }
        case 192: {
          ClassDesc cast = pool.entryByIndex(u2(code, bci + 1), ClassEntry.class).asSymbol();
          initializedReference(state.pop('A')); state.push(value(cast.descriptorString())); break;
        }
        case 193:
          pool.entryByIndex(u2(code, bci + 1), ClassEntry.class); initializedReference(state.pop('A')); state.push(value("I")); break;
        case 194: case 195: state.pop('A'); break;
        case 196: {
          int operation = code[bci + 1] & 255, slot = u2(code, bci + 2);
          if (operation >= 21 && operation <= 25) state.load(slot, "IJFDA".charAt(operation - 21));
          else if (operation >= 54 && operation <= 58) state.local(slot, state.pop("IJFDA".charAt(operation - 54)));
          else if (operation == 132) state.checkLocal(slot, 'I');
          else unsupported("wide ret"); break;
        }
        case 197: {
          String descriptor = pool.entryByIndex(u2(code, bci + 1), ClassEntry.class).asSymbol().descriptorString();
          int dimensions = code[bci + 3] & 255, rank = 0;
          while (rank < descriptor.length() && descriptor.charAt(rank) == '[') rank++;
          if (dimensions == 0 || dimensions > rank) throw new VerifyError("Invalid multianewarray type or dimensions");
          for (int dimension = 0; dimension < dimensions; dimension++) state.pop('I');
          state.push(value(descriptor)); break;
        }
        case 198: case 199: state.pop('A'); break;
        default: unsupported("opcode " + opcode);
      }
    }

    void array(State state, int opcode, boolean store) {
      int kind = opcode - (store ? 79 : 46);
      Value element = null;
      if (store) {
        element = state.pop(kind == 4 ? 'A' : "IJFDAIII".charAt(kind));
        if (kind == 4) initializedReference(element);
      }
      state.pop('I'); Value operand = state.pop('A');
      String component = requireArray(operand, kind == 4 ? null : "IJFD?BCS".substring(kind, kind + 1), kind == 4);
      if (!store) state.push(kind == 4 ? operand.kind == 'N' ? NULL : value(component) :
          value(String.valueOf("IJFDAIII".charAt(kind))));
    }

    String requireArray(Value operand, String primitive, boolean reference) {
      if (operand.kind == 'N') return null;
      if (operand.kind != 'A' || operand.descriptor.charAt(0) != '[')
        throw new VerifyError("Array instruction requires an array reference");
      String component = operand.descriptor.substring(1);
      if (reference && component.length() == 1 || primitive != null &&
          !(component.equals(primitive) || "B".equals(primitive) && "Z".equals(component)))
        throw new VerifyError("Array instruction component type mismatch");
      return component;
    }

    void stack(State state, int opcode) {
      Value first = state.pop();
      if (opcode == 87) { categoryOne(first); return; }
      if (opcode == 88) { if (first.slots() == 1) categoryOne(state.pop()); return; }
      if (opcode == 89) { categoryOne(first); state.push(first); state.push(first); return; }
      if (opcode == 90 || opcode == 91) {
        categoryOne(first); Value second = state.pop();
        if (opcode == 90) {
          categoryOne(second); state.push(first); state.push(second); state.push(first);
        } else if (second.slots() == 2) {
          state.push(first); state.push(second); state.push(first);
        } else {
          Value third = state.pop(); categoryOne(third);
          state.push(first); state.push(third); state.push(second); state.push(first);
        }
        return;
      }
      if (opcode == 95) {
        categoryOne(first); Value second = state.pop(); categoryOne(second);
        state.push(first); state.push(second); return;
      }
      Value second = first.slots() == 1 ? state.pop() : null;
      if (second != null) categoryOne(second);
      if (opcode == 92) {
        if (second != null) state.push(second); state.push(first);
        if (second != null) state.push(second); state.push(first); return;
      }
      Value below = state.pop();
      if (opcode == 93) categoryOne(below);
      Value deeper = opcode == 94 && below.slots() == 1 ? state.pop() : null;
      if (deeper != null) categoryOne(deeper);
      if (second != null) state.push(second); state.push(first);
      if (deeper != null) state.push(deeper); state.push(below);
      if (second != null) state.push(second); state.push(first);
    }

    void categoryOne(Value item) {
      if (item.slots() != 1) throw new VerifyError("Stack instruction requires category-1 values");
    }

    void constant(State state, int index, boolean wide) {
      PoolEntry entry = pool.entryByIndex(index); Value result;
      switch (entry.tag()) {
        case 3: result = value("I"); break;
        case 4: result = value("F"); break;
        case 5: result = value("J"); break;
        case 6: result = value("D"); break;
        case 7: ((ClassEntry) entry).asSymbol(); result = value("Ljava/lang/Class;"); break;
        case 8: result = value("Ljava/lang/String;"); break;
        case 15: result = value("Ljava/lang/invoke/MethodHandle;"); break;
        case 16: result = value("Ljava/lang/invoke/MethodType;"); break;
        case 17: {
          ConstantDynamicEntry constant = (ConstantDynamicEntry) entry;
          checkBootstrap(constant.bootstrap());
          String name = constant.name().stringValue();
          if ("<init>".equals(name) || "<clinit>".equals(name)) throw new VerifyError("Invalid dynamic constant name");
          result = value(constant.typeSymbol().descriptorString()); break;
        }
        default: throw new VerifyError("Non-loadable constant");
      }
      if (wide != (result.slots() == 2)) throw new VerifyError("Incorrect ldc category"); state.push(result);
    }
    void checkBootstrap(BootstrapMethodEntry bootstrap) {
      // Verify linkage metadata only; never execute a bootstrap to obtain a verdict.
      int kind = bootstrap.bootstrapMethod().kind();
      if (kind != 6 && kind != 8) throw new VerifyError("Bootstrap method must be static or a constructor");
      MemberRefEntry reference = bootstrap.bootstrapMethod().reference();
      if (reference.tag() != 10 && reference.tag() != 11)
        throw new VerifyError("Bootstrap method must reference a method");
      String name = reference.nameAndType().name().stringValue();
      MethodTypeDesc type = MethodTypeDesc.ofDescriptor(reference.nameAndType().type().stringValue());
      if (kind == 8) {
        if (reference.tag() != 10 || !"<init>".equals(name) ||
            !"V".equals(type.returnType().descriptorString()))
          throw new VerifyError("Constructor bootstrap must reference a void class constructor");
      } else if ("<init>".equals(name) || "<clinit>".equals(name)) {
        throw new VerifyError("Static bootstrap cannot reference an initializer");
      }
    }
    void field(State state, int opcode, int index) {
      FieldRefEntry field = pool.entryByIndex(index, FieldRefEntry.class);
      String descriptor = field.nameAndType().type().stringValue();
      if (opcode == 179 || opcode == 181) assign(state.pop(), descriptor);
      if (opcode == 180 || opcode == 181) {
        Value receiver = state.pop('A');
        if (opcode == 181 && receiver.kind == 'U' && receiver.newBci == -1 && field.owner().asSymbol().equals(owner)) {
          // The verifier permits assigning this class's fields before its super constructor.
        } else assign(receiver, field.owner().asSymbol().descriptorString());
      }
      if (opcode == 178 || opcode == 180) state.push(value(descriptor));
    }
    void invoke(State state, int opcode, int index, int bci) {
      MemberRefEntry method = pool.entryByIndex(index, MemberRefEntry.class);
      if (method.tag() != 10 && method.tag() != 11) throw new VerifyError("Invalid method reference");
      if (opcode == 182 && method.tag() != 10 || opcode == 185 && method.tag() != 11) throw new VerifyError("Invocation reference kind mismatch");
      MethodTypeDesc signature = MethodTypeDesc.ofDescriptor(method.nameAndType().type().stringValue());
      if (opcode == 185) {
        int slots = 1;
        for (ClassDesc parameter : signature.parameterList()) slots += value(parameter.descriptorString()).slots();
        if ((code[bci + 3] & 255) != slots || code[bci + 4] != 0) throw new VerifyError("Invalid invokeinterface operands");
      }
      for (int i = signature.parameterCount() - 1; i >= 0; i--) assign(state.pop(), signature.parameterType(i).descriptorString());
      String name = method.nameAndType().name().stringValue(), methodOwner = method.owner().asSymbol().descriptorString();
      if ("<init>".equals(name)) {
        if (opcode != 183 || method.tag() != 10 || !"V".equals(signature.returnType().descriptorString())) throw new VerifyError("Invalid constructor invocation");
        Value receiver = state.pop('A');
        boolean parent = receiver.kind == 'U' && receiver.newBci == -1 && superclass != null && methodOwner.equals(superclass.descriptorString());
        if (receiver.kind != 'U' || !(methodOwner.equals(receiver.descriptor) || parent)) throw new VerifyError("Constructor receiver is not the matching uninitialized value");
        state.initialized(receiver);
      } else {
        if ("<clinit>".equals(name)) throw new VerifyError("Illegal class initializer invocation");
        if (opcode != 184) assign(state.pop('A'), methodOwner);
        String result = signature.returnType().descriptorString(); if (!"V".equals(result)) state.push(value(result));
      }
    }
  }

  private static final class State {
    final Analysis analysis;
    final Value[] locals;
    final List<Value> stack = new ArrayList<>();
    int stackSlots;
    boolean thisInitialized;
    State(Analysis analysis) { this.analysis = analysis; locals = new Value[analysis.maxLocals]; Arrays.fill(locals, TOP); }
    State copy() {
      State result = new State(analysis);
      System.arraycopy(locals, 0, result.locals, 0, locals.length);
      if (!stack.isEmpty()) result.stack.addAll(stack);
      result.stackSlots = stackSlots; result.thisInitialized = thisInitialized; return result;
    }
    void push(Value item) {
      stack.add(item); stackSlots += item.slots();
      if (stackSlots > analysis.maxStack) throw new VerifyError("Operand stack exceeds max_stack");
      analysis.observedStack = Math.max(analysis.observedStack, stackSlots);
    }
    Value pop() {
      if (stack.isEmpty()) throw new VerifyError("Operand stack underflow");
      Value item = stack.remove(stack.size() - 1); stackSlots -= item.slots(); return item;
    }
    Value pop(char kind) {
      Value item = pop();
      if (kind == 'A' ? !item.reference() : item.kind != kind) throw new VerifyError("Incorrect operand type"); return item;
    }
    void local(int slot, Value item) {
      if (slot < 0 || slot >= locals.length || item.slots() > locals.length - slot) throw new VerifyError("Local exceeds max_locals");
      invalidate(slot); if (item.slots() == 2) invalidate(slot + 1);
      locals[slot] = item; if (item.slots() == 2) locals[slot + 1] = TOP;
    }
    void invalidate(int slot) {
      if (slot > 0 && locals[slot].kind == 'T' && locals[slot - 1].slots() == 2) locals[slot - 1] = TOP;
      if (locals[slot].slots() == 2 && slot + 1 < locals.length) locals[slot + 1] = TOP;
      locals[slot] = TOP;
    }
    Value checkLocal(int slot, char kind) {
      if (slot < 0 || slot >= locals.length || locals[slot].kind == 'T') throw new VerifyError("Uninitialized local");
      Value item = locals[slot];
      if (kind == 'A' ? !item.reference() : item.kind != kind) throw new VerifyError("Incorrect local type");
      if (item.slots() == 2 && (slot + 1 >= locals.length || locals[slot + 1].kind != 'T')) throw new VerifyError("Invalid category-2 local");
      return item;
    }
    void load(int slot, char kind) { push(checkLocal(slot, kind)); }
    void initialized(Value original) {
      Value initialized = value(original.descriptor);
      for (int i = 0; i < locals.length; i++) if (locals[i].same(original)) locals[i] = initialized;
      for (int i = 0; i < stack.size(); i++) if (stack.get(i).same(original)) stack.set(i, initialized);
      if (original.newBci == -1) thisInitialized = true;
    }
  }

  private static void initializedReference(Value value) {
    if (value.kind == 'U') throw new VerifyError("Uninitialized reference operand");
  }
  private static void unsupported(String contract) {
    throw new UnsupportedOperationException("Class-File flow outside implemented instruction profile: " + contract);
  }
}
