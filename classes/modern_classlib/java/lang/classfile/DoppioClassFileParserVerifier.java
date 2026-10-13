package java.lang.classfile;

import java.lang.classfile.attribute.CodeAttribute;
import java.lang.classfile.attribute.ConstantValueAttribute;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.ConstantValueEntry;
import java.lang.classfile.constantpool.DoubleEntry;
import java.lang.classfile.constantpool.FloatEntry;
import java.lang.classfile.constantpool.IntegerEntry;
import java.lang.classfile.constantpool.LongEntry;
import java.lang.classfile.constantpool.StringEntry;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ClassDesc;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Structural collection is independent of bytecode applicability and failover. */
final class DoppioClassFileParserVerifier {
  private DoppioClassFileParserVerifier() {}

  static List<VerifyError> verify(ClassModel model) {
    List<VerifyError> errors = new ArrayList<>();
    Set<ClassEntry> interfaces = new HashSet<>();
    for (ClassEntry implemented : model.interfaces()) if (!interfaces.add(implemented))
      errors.add(new VerifyError("Duplicate interface " + implemented.asInternalName()));
    Set<List<Utf8Entry>> fields = new HashSet<>();
    for (FieldModel field : model.fields()) try {
      if (!fields.add(Arrays.asList(field.fieldName(), field.fieldType())))
        errors.add(new VerifyError("Duplicate field name " + field.fieldName().stringValue() +
            " with signature " + field.fieldType().stringValue()));
      verifyName(field.fieldName().stringValue(), false);
    } catch (VerifyError failed) { errors.add(failed); }
    Set<List<Utf8Entry>> methods = new HashSet<>();
    for (MethodModel method : model.methods()) try {
      String name = method.methodName().stringValue();
      if (!methods.add(Arrays.asList(method.methodName(), method.methodType())))
        errors.add(new VerifyError("Duplicate method name " + name + " with signature " + method.methodType().stringValue()));
      int flags = method.flags().flagsMask();
      if ("<clinit>".equals(name) && (flags & ClassFile.ACC_STATIC) == 0)
        errors.add(new VerifyError("Method <clinit> is not static"));
      if ((model.flags().flagsMask() & ClassFile.ACC_INTERFACE) != 0 && "<init>".equals(name))
        errors.add(new VerifyError("Interface cannot have a method named <init>"));
      verifyName(name, true);
    } catch (VerifyError failed) { errors.add(failed); }
    verifyAttributes(model, errors);
    for (FieldModel field : model.fields()) verifyAttributes(field, errors);
    for (MethodModel method : model.methods()) {
      verifyAttributes(method, errors);
      if (method.code().isPresent()) verifyAttributes(method.code().get(), errors);
    }
    return errors;
  }

  private static void verifyName(String name, boolean method) {
    if (method && ("<init>".equals(name) || "<clinit>".equals(name))) return;
    boolean invalid = name.isEmpty();
    for (int index = 0; index < name.length(); index++) {
      char c = name.charAt(index);
      if (c == '.' || c == ';' || c == '[' || c == '/' || method && (c == '<' || c == '>')) invalid = true;
    }
    if (invalid) throw new VerifyError("Illegal " + (method ? "method" : "field") + " name " + name);
  }

  private static void verifyAttributes(AttributedElement owner, List<VerifyError> errors) {
    Set<String> names = new HashSet<>();
    for (Attribute<?> attribute : owner.attributes()) {
      if (!attribute.attributeMapper().allowMultiple()) {
        String name = attribute.attributeName().stringValue();
        if (!names.add(name)) errors.add(new VerifyError("Multiple " + name + " attributes"));
      }
      if (attribute instanceof CodeAttribute && owner instanceof MethodModel) {
        MethodModel method = (MethodModel) owner;
        int flags = method.flags().flagsMask();
        if ((flags & (ClassFile.ACC_NATIVE | ClassFile.ACC_ABSTRACT)) != 0)
          errors.add(new VerifyError("Code attribute in native or abstract method " + method.methodName().stringValue()));
        int arguments = (flags & ClassFile.ACC_STATIC) == 0 ? 1 : 0;
        for (ClassDesc parameter : method.methodTypeSymbol().parameterList()) arguments += TypeKind.from(parameter).slotSize();
        if (((CodeAttribute) attribute).maxLocals() < arguments)
          errors.add(new VerifyError("Arguments can't fit into locals in method " + method.methodName().stringValue()));
      } else if (attribute instanceof ConstantValueAttribute && owner instanceof FieldModel) {
        FieldModel field = (FieldModel) owner;
        ClassDesc type = field.fieldTypeSymbol();
        ConstantValueEntry value = ((ConstantValueAttribute) attribute).constant();
        boolean valid;
        switch (TypeKind.from(type)) {
          case BOOLEAN: case BYTE: case CHAR: case INT: case SHORT: valid = value instanceof IntegerEntry; break;
          case LONG: valid = value instanceof LongEntry; break;
          case FLOAT: valid = value instanceof FloatEntry; break;
          case DOUBLE: valid = value instanceof DoubleEntry; break;
          case REFERENCE: valid = "Ljava/lang/String;".equals(type.descriptorString()) && value instanceof StringEntry; break;
          default: valid = false;
        }
        if (!valid) errors.add(new VerifyError("Bad constant value type in field " + field.fieldName().stringValue()));
      }
    }
  }
}
