package java.lang.classfile;

import java.lang.classfile.attribute.CodeAttribute;
import java.lang.classfile.attribute.LocalVariableInfo;
import java.lang.classfile.attribute.LocalVariableTableAttribute;
import java.lang.classfile.attribute.StackMapFrameInfo;
import java.lang.classfile.attribute.StackMapFrameInfo.VerificationTypeInfo;
import java.lang.classfile.attribute.StackMapFrameInfo.ObjectVerificationTypeInfo;
import java.lang.classfile.attribute.StackMapFrameInfo.UninitializedVerificationTypeInfo;
import java.lang.classfile.attribute.StackMapTableAttribute;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;

/** Library verification: no class definition, initialization or host verifier as a verdict. */
final class DoppioClassFileVerifier {
  private DoppioClassFileVerifier() {}

  static List<VerifyError> verify(byte[] bytes) {
    return verify(bytes, name -> null);
  }

  static List<VerifyError> verify(byte[] bytes, Function<Utf8Entry, AttributeMapper<?>> customAttributes) {
    return verify(bytes, customAttributes, ClassHierarchyResolver.defaultResolver());
  }

  static List<VerifyError> verify(byte[] bytes, Function<Utf8Entry, AttributeMapper<?>> customAttributes,
      ClassHierarchyResolver resolver) {
    Objects.requireNonNull(bytes);
    Objects.requireNonNull(customAttributes);
    Objects.requireNonNull(resolver);
    try { return verify(DoppioClassReader.parse(bytes, customAttributes), resolver); }
    catch (IllegalArgumentException malformed) { return error(malformed.getMessage()); }
  }

  static List<VerifyError> verify(ClassModel model) {
    return verify(model, ClassHierarchyResolver.defaultResolver());
  }

  static List<VerifyError> verify(ClassModel model, ClassHierarchyResolver resolver) {
    Objects.requireNonNull(model);
    Objects.requireNonNull(resolver);
    List<VerifyError> errors = new ArrayList<>();
    try {
      ClassDesc owner = model.thisClass().asSymbol();
      if (!owner.isClassOrInterface()) throw new VerifyError("Invalid class name");
      for (FieldModel field : model.fields()) {
        if ("V".equals(field.fieldTypeSymbol().descriptorString())) throw new VerifyError("Void field descriptor");
      }
      // Native parser verification traverses Code before its bytecode verifier.
      // This inflates only the configured debug/line families, while raw tables
      // remain available when traversal is dropped.
      boolean[] discontinued = { false };
      for (MethodModel method : model.methods()) if (method.code().isPresent()) {
        DoppioClassReader.forEachForVerification(method.code().get(), element -> {
          if (element instanceof Instruction) {
            Opcode.Kind kind = ((Instruction) element).opcode().kind();
            if (kind == Opcode.Kind.DISCONTINUED_JSR || kind == Opcode.Kind.DISCONTINUED_RET)
              discontinued[0] = true;
          }
        });
      }
      String ownerDescriptor = owner.descriptorString();
      boolean inferenceEligible = !"Ljava/lang/Object;".equals(ownerDescriptor) &&
          !"Ljava/lang/Class;".equals(ownerDescriptor) && !"Ljava/lang/String;".equals(ownerDescriptor) &&
          !"Ljava/lang/Throwable;".equals(ownerDescriptor);
      if (inferenceEligible && (model.majorVersion() < 50 || model.majorVersion() == 50 && discontinued[0]))
        return error("Inference verification is not supported");
      if (discontinued[0]) return error("Bad instruction: discontinued jsr/ret");
      for (MethodModel method : model.methods()) {
        try { verifyMethod(model, method, resolver); }
        catch (VerifyError failed) { errors.add(failed); }
        catch (IllegalArgumentException malformed) { errors.add(new VerifyError(malformed.getMessage())); }
      }
    } catch (VerifyError failed) { errors.add(failed); }
      catch (IllegalArgumentException malformed) { errors.add(new VerifyError(malformed.getMessage())); }
    return Collections.unmodifiableList(errors);
  }

  private static List<VerifyError> error(String message) { return Collections.singletonList(new VerifyError(message)); }

  private static void verifyMethod(ClassModel model, MethodModel method, ClassHierarchyResolver resolver) {
    int flags = method.flags().flagsMask();
    MethodTypeDesc type = method.methodTypeSymbol();
    String name = method.methodName().stringValue();
    if ("<init>".equals(name) && ((flags & ClassFile.ACC_STATIC) != 0 || !"V".equals(type.returnType().descriptorString())))
      throw new VerifyError("Invalid constructor signature");
    boolean noCode = (flags & (ClassFile.ACC_NATIVE | ClassFile.ACC_ABSTRACT)) != 0;
    if (noCode != !method.code().isPresent()) throw new VerifyError("Invalid Code presence");
    if (noCode) return;
    CodeModel code = method.code().get();
    if (!(code instanceof CodeAttribute)) throw new UnsupportedOperationException("Unbound Code verification");
    CodeAttribute bound = (CodeAttribute) code;
    byte[] bytes = DoppioClassReader.codeBytes(code);
    // Native bytecode verification checks the first LVT only. LVTT/CRT/LNT
    // retain their separate range-only traversal and permissive value rules.
    java.util.Optional<LocalVariableTableAttribute> debugLocals = code.findAttribute(Attributes.localVariableTable());
    if (debugLocals.isPresent()) for (LocalVariableInfo local : debugLocals.get().localVariables()) {
      if (!DoppioClassReader.isInstructionBoundary(code, local.startPc()))
        throw new VerifyError("Illegal local variable table start_pc " + local.startPc());
      long end = (long) local.startPc() + local.length();
      if (end != bytes.length && (end < 0 || end >= bytes.length ||
          !DoppioClassReader.isInstructionBoundary(code, (int) end)))
        throw new VerifyError("Illegal local variable table length " + local.length());
    }
    List<int[]> handlers = new ArrayList<>();
    for (java.lang.classfile.instruction.ExceptionCatch handler : code.exceptionHandlers()) {
      handlers.add(new int[] { bound.labelToBci(handler.tryStart()), bound.labelToBci(handler.tryEnd()),
          bound.labelToBci(handler.handler()), handler.catchType().isPresent() ? handler.catchType().get().index() : 0 });
    }
    Map<Integer, DoppioCodeFlow.Frame> frames = new LinkedHashMap<>();
    boolean found = false;
    for (Attribute<?> attribute : code.attributes()) {
      if (!"StackMapTable".equals(attribute.attributeName().stringValue())) continue;
      if (found) throw new VerifyError("Duplicate StackMapTable");
      found = true;
      if (!(attribute instanceof StackMapTableAttribute)) throw new UnsupportedOperationException("Untyped StackMapTable");
      for (StackMapFrameInfo frame : ((StackMapTableAttribute) attribute).entries()) {
        int bci = bound.labelToBci(frame.target());
        List<DoppioCodeFlow.Value> locals = verificationEntries(model, method, bound, bytes, frame.locals(), true);
        List<DoppioCodeFlow.Value> stack = verificationEntries(model, method, bound, bytes, frame.stack(), false);
        if (frames.put(bci, new DoppioCodeFlow.Frame(bci, locals, stack)) != null) throw new VerifyError("Duplicate stack-map target");
      }
    }
    List<ClassDesc> interfaces = new ArrayList<>();
    for (ClassEntry implemented : model.interfaces()) interfaces.add(implemented.asSymbol());
    DoppioCodeFlow.analyzeForVerification(model.thisClass().asSymbol(), model.superclass().isPresent() ? model.superclass().get().asSymbol() : null,
        interfaces, model.constantPool(), name, type, flags, bytes,
        DoppioClassReader.maxStack(code), DoppioClassReader.maxLocals(code), handlers, frames, model.majorVersion() >= 50,
        resolver, model.flags().flagsMask(), model.majorVersion());
  }

  private static List<DoppioCodeFlow.Value> verificationEntries(ClassModel model, MethodModel method,
      CodeAttribute code, byte[] bytes, List<VerificationTypeInfo> entries, boolean locals) {
    List<DoppioCodeFlow.Value> result = new ArrayList<>();
    for (VerificationTypeInfo entry : entries) {
      DoppioCodeFlow.Value value;
      switch (entry.tag()) {
        case 0: value = DoppioCodeFlow.TOP; break;
        case 1: value = DoppioCodeFlow.value("I"); break;
        case 2: value = DoppioCodeFlow.value("F"); break;
        case 3: value = DoppioCodeFlow.value("D"); break;
        case 4: value = DoppioCodeFlow.value("J"); break;
        case 5: value = DoppioCodeFlow.NULL; break;
        case 6:
          if (!"<init>".equals(method.methodName().stringValue())) throw new VerifyError("uninitializedThis outside constructor");
          value = new DoppioCodeFlow.Value('U', model.thisClass().asSymbol().descriptorString(), -1); break;
        case 7:
          if (!(entry instanceof ObjectVerificationTypeInfo)) throw new VerifyError("Invalid object verification entry");
          value = DoppioCodeFlow.value(((ObjectVerificationTypeInfo) entry).classSymbol().descriptorString()); break;
        case 8: {
          if (!(entry instanceof UninitializedVerificationTypeInfo)) throw new VerifyError("Invalid uninitialized verification entry");
          int bci = code.labelToBci(((UninitializedVerificationTypeInfo) entry).newTarget());
          if (bci < 0 || bci + 2 >= bytes.length || (bytes[bci] & 255) != 187) throw new VerifyError("Uninitialized stack-map offset is not new");
          int index = (bytes[bci + 1] & 255) << 8 | bytes[bci + 2] & 255;
          String descriptor = model.constantPool().entryByIndex(index, ClassEntry.class).asSymbol().descriptorString();
          value = new DoppioCodeFlow.Value('U', descriptor, bci); break;
        }
        default: throw new VerifyError("Invalid verification type tag");
      }
      result.add(value);
      if (locals && value.slots() == 2) result.add(DoppioCodeFlow.TOP);
    }
    return result;
  }
}
