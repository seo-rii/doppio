package java.lang.classfile;

import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.ConstantPool;
import java.lang.classfile.constantpool.FieldRefEntry;
import java.lang.classfile.constantpool.MemberRefEntry;
import java.lang.classfile.constantpool.PoolEntry;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Pure class-library verification of selected straight-line Code. No classes
 * are defined, loaded or initialized to obtain a successful verification.
 * Unsupported control-flow/hierarchy contracts are not silently accepted.
 */
final class DoppioClassFileVerifier {
  private DoppioClassFileVerifier() {}

  static List<VerifyError> verify(byte[] bytes) {
    Objects.requireNonNull(bytes);
    try { return verify(DoppioClassReader.parse(bytes)); }
    catch (IllegalArgumentException malformed) { return error(malformed.getMessage()); }
  }

  static List<VerifyError> verify(ClassModel model) {
    Objects.requireNonNull(model);
    List<VerifyError> errors = new ArrayList<>();
    try {
      ClassDesc owner = model.thisClass().asSymbol();
      if (!owner.isClassOrInterface()) throw new VerifyError("Invalid class name");
      for (FieldModel field : model.fields()) {
        if ("V".equals(field.fieldTypeSymbol().descriptorString()))
          throw new VerifyError("Void field descriptor");
      }
      for (MethodModel method : model.methods()) {
        try { verifyMethod(model, method); }
        catch (VerifyError failed) { errors.add(failed); }
        catch (IllegalArgumentException malformed) { errors.add(new VerifyError(malformed.getMessage())); }
      }
    } catch (VerifyError failed) { errors.add(failed); }
      catch (IllegalArgumentException malformed) { errors.add(new VerifyError(malformed.getMessage())); }
    return Collections.unmodifiableList(errors);
  }

  private static List<VerifyError> error(String message) {
    return Collections.singletonList(new VerifyError(message));
  }

  private static void verifyMethod(ClassModel model, MethodModel method) {
    int flags = method.flags().flagsMask();
    MethodTypeDesc type = method.methodTypeSymbol();
    String name = method.methodName().stringValue();
    boolean constructor = "<init>".equals(name);
    if (constructor && ((flags & ClassFile.ACC_STATIC) != 0 || !"V".equals(type.returnType().descriptorString())))
      throw new VerifyError("Invalid constructor signature");
    boolean noCode = (flags & (ClassFile.ACC_NATIVE | ClassFile.ACC_ABSTRACT)) != 0;
    if (noCode != !method.code().isPresent()) throw new VerifyError("Invalid Code presence");
    if (noCode) return;
    CodeModel code = method.code().get();
    if (!code.exceptionHandlers().isEmpty()) unsupported("exception-handler data flow");
    for (Attribute<?> attribute : code.attributes()) {
      if ("StackMapTable".equals(attribute.attributeName().stringValue())) unsupported("stack-map verification");
    }
    State state = new State(model, method, DoppioClassReader.maxStack(code), DoppioClassReader.maxLocals(code));
    simulate(state, DoppioClassReader.codeBytes(code));
  }

  private static void simulate(State state, byte[] code) {
    // Decoding is deliberately separate from the public instruction models:
    // an absent model/factory must never turn unverified bytes into a pass.
    int cursor = 0;
    boolean returned = false;
    while (cursor < code.length) {
      if (returned) unsupported("unreachable Code");
      int opcode = code[cursor++] & 255;
      if (opcode >= 26 && opcode <= 45) {
        state.load((opcode - 26) % 4, "IJFDA".charAt((opcode - 26) / 4));
      } else if (opcode >= 59 && opcode <= 78) {
        state.local((opcode - 59) % 4, state.pop("IJFDA".charAt((opcode - 59) / 4)));
      } else if (opcode >= 2 && opcode <= 8) state.push(value("I"));
      else if (opcode >= 9 && opcode <= 10) state.push(value("J"));
      else if (opcode >= 11 && opcode <= 13) state.push(value("F"));
      else if (opcode >= 14 && opcode <= 15) state.push(value("D"));
      else if (opcode >= 96 && opcode <= 115) {
        char kind = "IJFD".charAt((opcode - 96) % 4);
        state.pop(kind); state.pop(kind); state.push(value(String.valueOf(kind)));
      } else if (opcode >= 116 && opcode <= 119) {
        char kind = "IJFD".charAt(opcode - 116);
        state.pop(kind); state.push(value(String.valueOf(kind)));
      } else switch (opcode) {
        case 0: break;
        case 1: state.push(NULL); break;
        case 16: requireBytes(code, cursor, 1); cursor++; state.push(value("I")); break;
        case 17: requireBytes(code, cursor, 2); cursor += 2; state.push(value("I")); break;
        case 18: requireBytes(code, cursor, 1); constant(state, code[cursor++] & 255, false); break;
        case 19: case 20:
          constant(state, u2(code, cursor), opcode == 20); cursor += 2; break;
        case 21: case 22: case 23: case 24: case 25:
          requireBytes(code, cursor, 1);
          state.load(code[cursor++] & 255, "IJFDA".charAt(opcode - 21)); break;
        case 54: case 55: case 56: case 57: case 58:
          requireBytes(code, cursor, 1);
          state.local(code[cursor++] & 255, state.pop("IJFDA".charAt(opcode - 54))); break;
        case 87:
          if (state.pop().slots() != 1) throw new VerifyError("pop requires category-1 value");
          break;
        case 88:
          if (state.pop().slots() == 1 && state.pop().slots() != 1)
            throw new VerifyError("Invalid pop2 shape");
          break;
        case 89: {
          Value top = state.pop();
          if (top.slots() != 1) throw new VerifyError("dup requires category-1 value");
          state.push(top); state.push(top); break;
        }
        case 90: case 91: case 92: case 93: case 94: case 95:
          unsupported("additional stack-manipulation shapes"); break;
        case 172: case 173: case 174: case 175: case 176: case 177: {
          String descriptor = state.type.returnType().descriptorString();
          char kind = "IJFDAV".charAt(opcode - 172);
          if (kind == 'V') {
            if (!"V".equals(descriptor)) throw new VerifyError("Void return in value method");
          } else {
            if ("V".equals(descriptor) || value(descriptor).kind != kind)
              throw new VerifyError("Return opcode does not match method descriptor");
            assign(state, state.pop(kind), descriptor);
          }
          if (!state.thisInitialized) throw new VerifyError("Constructor returns before initialization");
          returned = true; break;
        }
        case 178: case 179: case 180: case 181:
          field(state, opcode, u2(code, cursor)); cursor += 2; break;
        case 182: case 183: case 184: case 185: {
          int index = u2(code, cursor); cursor += 2;
          if (opcode == 185) {
            requireBytes(code, cursor, 2);
            MemberRefEntry method = state.pool.entryByIndex(index, MemberRefEntry.class);
            MethodTypeDesc signature = MethodTypeDesc.ofDescriptor(method.nameAndType().type().stringValue());
            int slots = 1;
            for (ClassDesc parameter : signature.parameterList()) slots += value(parameter.descriptorString()).slots();
            if ((code[cursor] & 255) != slots || code[cursor + 1] != 0)
              throw new VerifyError("Invalid invokeinterface operands");
            cursor += 2;
          }
          invoke(state, opcode, index); break;
        }
        case 187: {
          ClassEntry entry = state.pool.entryByIndex(u2(code, cursor), ClassEntry.class); cursor += 2;
          ClassDesc type = entry.asSymbol();
          if (!type.isClassOrInterface()) throw new VerifyError("new requires a class type");
          state.push(new Value('U', type.descriptorString())); break;
        }
        case 192: {
          ClassEntry entry = state.pool.entryByIndex(u2(code, cursor), ClassEntry.class); cursor += 2;
          Value operand = state.pop('A');
          if (operand.kind == 'U') throw new VerifyError("Uninitialized checkcast value");
          state.push(value(entry.asSymbol().descriptorString())); break;
        }
        case 193:
          state.pool.entryByIndex(u2(code, cursor), ClassEntry.class); cursor += 2;
          if (state.pop('A').kind == 'U') throw new VerifyError("Uninitialized instanceof value");
          state.push(value("I")); break;
        case 196: {
          requireBytes(code, cursor, 3);
          int operation = code[cursor++] & 255, slot = u2(code, cursor); cursor += 2;
          if (operation >= 21 && operation <= 25) state.load(slot, "IJFDA".charAt(operation - 21));
          else if (operation >= 54 && operation <= 58) state.local(slot, state.pop("IJFDA".charAt(operation - 54)));
          else unsupported("other wide instructions");
          break;
        }
        default: unsupported("opcode " + opcode);
      }
    }
    if (!returned) throw new VerifyError("Code falls off the end");
  }

  private static void requireBytes(byte[] code, int cursor, int length) {
    if (cursor < 0 || length < 0 || cursor > code.length || length > code.length - cursor)
      throw new VerifyError("Truncated instruction");
  }
  private static int u2(byte[] code, int cursor) {
    requireBytes(code, cursor, 2);
    return (code[cursor] & 255) << 8 | code[cursor + 1] & 255;
  }

  private static void constant(State state, int index, boolean wide) {
    PoolEntry entry = state.pool.entryByIndex(index);
    Value result;
    switch (entry.tag()) {
      case 3: result = value("I"); break;
      case 4: result = value("F"); break;
      case 5: result = value("J"); break;
      case 6: result = value("D"); break;
      case 7: ((ClassEntry) entry).asSymbol(); result = value("Ljava/lang/Class;"); break;
      case 8: result = value("Ljava/lang/String;"); break;
      case 15: result = value("Ljava/lang/invoke/MethodHandle;"); break;
      case 16: result = value("Ljava/lang/invoke/MethodType;"); break;
      case 17: unsupported("dynamic constant verification"); return;
      default: throw new VerifyError("Non-loadable constant");
    }
    if (wide != (result.slots() == 2)) throw new VerifyError("Incorrect ldc category");
    state.push(result);
  }

  private static void field(State state, int opcode, int index) {
    FieldRefEntry field = state.pool.entryByIndex(index, FieldRefEntry.class);
    String descriptor = field.nameAndType().type().stringValue();
    if (opcode == 179 || opcode == 181) assign(state, state.pop(), descriptor);
    if (opcode == 180 || opcode == 181) assign(state, state.pop('A'), field.owner().asSymbol().descriptorString());
    if (opcode == 178 || opcode == 180) state.push(value(descriptor));
  }

  private static void invoke(State state, int opcode, int index) {
    MemberRefEntry method = state.pool.entryByIndex(index, MemberRefEntry.class);
    if (method.tag() != 10 && method.tag() != 11) throw new VerifyError("Invalid method reference");
    if ((opcode == 182 && method.tag() != 10) || (opcode == 185 && method.tag() != 11))
      throw new VerifyError("Invocation reference kind mismatch");
    MethodTypeDesc signature = MethodTypeDesc.ofDescriptor(method.nameAndType().type().stringValue());
    for (int i = signature.parameterCount() - 1; i >= 0; i--)
      assign(state, state.pop(), signature.parameterType(i).descriptorString());
    String name = method.nameAndType().name().stringValue();
    String owner = method.owner().asSymbol().descriptorString();
    if ("<init>".equals(name)) {
      if (opcode != 183 || method.tag() != 10 || !"V".equals(signature.returnType().descriptorString()))
        throw new VerifyError("Invalid constructor invocation");
      Value receiver = state.pop('A');
      boolean superConstructor = receiver == state.uninitializedThis && state.model.superclass().isPresent() &&
          owner.equals(state.model.superclass().get().asSymbol().descriptorString());
      if (receiver.kind != 'U' || !(owner.equals(receiver.descriptor) || superConstructor))
        throw new VerifyError("Constructor receiver is not the matching uninitialized value");
      state.initialized(receiver);
    } else {
      if ("<clinit>".equals(name)) throw new VerifyError("Illegal class initializer invocation");
      if (opcode != 184) assign(state, state.pop('A'), owner);
      String result = signature.returnType().descriptorString();
      if (!"V".equals(result)) state.push(value(result));
    }
  }

  private static void assign(State state, Value actual, String descriptor) {
    Value expected = value(descriptor);
    if (expected.kind != 'A') {
      if (actual.kind != expected.kind) throw new VerifyError("Incompatible primitive value");
      return;
    }
    if (actual.kind == 'N') return;
    if (actual.kind != 'A') throw new VerifyError("Incompatible reference value");
    if (descriptor.equals(actual.descriptor) || "Ljava/lang/Object;".equals(descriptor)) return;
    if (actual.descriptor.equals(state.model.thisClass().asSymbol().descriptorString())) {
      if (state.model.superclass().isPresent() && descriptor.equals(state.model.superclass().get().asSymbol().descriptorString())) return;
      for (ClassEntry entry : state.model.interfaces()) if (descriptor.equals(entry.asSymbol().descriptorString())) return;
    }
    unsupported("reference hierarchy assignability");
  }

  private static void unsupported(String contract) {
    throw new UnsupportedOperationException("Class-File verification outside selected C7a: " + contract);
  }

  private static final class Value {
    final char kind;
    final String descriptor;
    Value(char kind, String descriptor) { this.kind = kind; this.descriptor = descriptor; }
    int slots() { return kind == 'J' || kind == 'D' ? 2 : 1; }
    boolean reference() { return kind == 'A' || kind == 'N' || kind == 'U'; }
  }
  private static final Value TOP = new Value('T', null);
  private static final Value NULL = new Value('N', null);

  private static Value value(String descriptor) {
    char kind = descriptor.charAt(0);
    if (kind == 'L' || kind == '[') return new Value('A', descriptor);
    if ("ZBCSI".indexOf(kind) >= 0) return new Value('I', "I");
    if (kind == 'J' || kind == 'F' || kind == 'D') return new Value(kind, descriptor);
    throw new VerifyError("Invalid value descriptor");
  }

  private static final class State {
    final ClassModel model;
    final MethodModel method;
    final ConstantPool pool;
    final MethodTypeDesc type;
    final Value[] locals;
    final List<Value> stack = new ArrayList<>();
    final int maxStack;
    final Value uninitializedThis;
    boolean thisInitialized;
    int stackSlots;

    State(ClassModel model, MethodModel method, int maxStack, int maxLocals) {
      this.model = model; this.method = method; this.pool = model.constantPool();
      this.type = method.methodTypeSymbol(); this.maxStack = maxStack;
      this.locals = new Value[maxLocals];
      boolean constructor = "<init>".equals(method.methodName().stringValue());
      String owner = model.thisClass().asSymbol().descriptorString();
      this.uninitializedThis = constructor ? new Value('U', owner) : null;
      this.thisInitialized = !constructor || "Ljava/lang/Object;".equals(owner) && !model.superclass().isPresent();
      int slot = 0;
      if ((method.flags().flagsMask() & ClassFile.ACC_STATIC) == 0) {
        local(slot++, constructor ? uninitializedThis : new Value('A', owner));
      }
      for (ClassDesc parameter : type.parameterList()) {
        Value argument = value(parameter.descriptorString());
        local(slot, argument); slot += argument.slots();
      }
    }

    void push(Value item) {
      stack.add(item); stackSlots += item.slots();
      if (stackSlots > maxStack) throw new VerifyError("Operand stack exceeds max_stack");
    }
    Value pop() {
      if (stack.isEmpty()) throw new VerifyError("Operand stack underflow");
      Value item = stack.remove(stack.size() - 1); stackSlots -= item.slots();
      return item;
    }
    Value pop(char kind) {
      Value item = pop();
      if (kind == 'A' ? !item.reference() : item.kind != kind) throw new VerifyError("Incorrect operand type");
      return item;
    }
    void local(int slot, Value item) {
      if (slot < 0 || slot >= locals.length || item.slots() > locals.length - slot)
        throw new VerifyError("Local exceeds max_locals");
      invalidate(slot);
      if (item.slots() == 2) invalidate(slot + 1);
      locals[slot] = item;
      if (item.slots() == 2) locals[slot + 1] = TOP;
    }
    private void invalidate(int slot) {
      if (slot > 0 && locals[slot] == TOP && locals[slot - 1] != null && locals[slot - 1].slots() == 2)
        locals[slot - 1] = null;
      if (locals[slot] != null && locals[slot].slots() == 2 && slot + 1 < locals.length)
        locals[slot + 1] = null;
      locals[slot] = null;
    }
    void load(int slot, char kind) {
      if (slot < 0 || slot >= locals.length || locals[slot] == null || locals[slot] == TOP)
        throw new VerifyError("Uninitialized local");
      Value item = locals[slot];
      if (kind == 'A' ? !item.reference() : item.kind != kind) throw new VerifyError("Incorrect local type");
      if (item.slots() == 2 && (slot + 1 >= locals.length || locals[slot + 1] != TOP))
        throw new VerifyError("Invalid category-2 local");
      push(item);
    }
    void initialized(Value original) {
      Value initialized = new Value('A', original.descriptor);
      for (int i = 0; i < locals.length; i++) if (locals[i] == original) locals[i] = initialized;
      for (int i = 0; i < stack.size(); i++) if (stack.get(i) == original) stack.set(i, initialized);
      if (original == uninitializedThis) thisInitialized = true;
    }
  }
}
