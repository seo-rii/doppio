package java.lang.classfile;

import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.lang.classfile.Signature.ArrayTypeSig;
import java.lang.classfile.Signature.BaseTypeSig;
import java.lang.classfile.Signature.ClassTypeSig;
import java.lang.classfile.Signature.RefTypeSig;
import java.lang.classfile.Signature.TypeArg;
import java.lang.classfile.Signature.TypeVarSig;
import java.lang.classfile.Signature.ThrowableSig;
import java.lang.classfile.Signature.TypeParam;

/** Typed immutable field, class and method signature trees and recursive parsers. */
final class DoppioSignatures {
  private DoppioSignatures() { }

  static Signature of(ClassDesc descriptor) {
    Objects.requireNonNull(descriptor);
    if (descriptor.isArray()) return array(1, of(descriptor.componentType()));
    if (descriptor.isPrimitive()) return base(descriptor);
    return classType(null, descriptor, new TypeArg[0]);
  }

  static BaseTypeSig base(ClassDesc descriptor) {
    Objects.requireNonNull(descriptor);
    if (!descriptor.isPrimitive()) throw new IllegalArgumentException("primitive class type required");
    return base(descriptor.descriptorString().charAt(0));
  }
  static BaseTypeSig base(char descriptor) {
    if ("VIJCSBFDZ".indexOf(descriptor) < 0) throw new IllegalArgumentException("invalid base type signature");
    return new BaseValue(descriptor);
  }

  static ClassTypeSig classType(ClassTypeSig outer, ClassDesc descriptor, TypeArg[] arguments) {
    Objects.requireNonNull(descriptor);
    if (!descriptor.isClassOrInterface()) throw new IllegalArgumentException("class or interface type required");
    String value = descriptor.descriptorString();
    return classType(outer, value.substring(1, value.length() - 1), arguments);
  }
  static ClassTypeSig classType(ClassTypeSig outer, String name, TypeArg[] arguments) {
    Objects.requireNonNull(name);
    TypeArg[] copy = Objects.requireNonNull(arguments).clone();
    for (TypeArg argument : copy) Objects.requireNonNull(argument);
    return new ClassValue(Optional.ofNullable(outer), name.replace('.', '/'),
      Collections.unmodifiableList(Arrays.asList(copy)));
  }

  static TypeVarSig variable(String identifier) { return new VariableValue(Objects.requireNonNull(identifier)); }

  static ArrayTypeSig array(int dimensions, Signature component) {
    Objects.requireNonNull(component);
    int existing = component instanceof ArrayValue ? ((ArrayValue) component).depth : 0;
    if (dimensions < 1 || dimensions > 255 - existing) throw new IllegalArgumentException("illegal array depth value");
    return new ArrayValue(dimensions + existing, existing == 0 ? component : ((ArrayValue) component).element);
  }

  static TypeArg.Unbounded unbounded() { return UnboundedValue.INSTANCE; }
  static TypeArg.Bounded bounded(TypeArg.Bounded.WildcardIndicator wildcard, RefTypeSig bound) {
    return new BoundedValue(Objects.requireNonNull(wildcard), Objects.requireNonNull(bound));
  }

  private static <T> List<T> copyList(List<T> values) {
    List<T> copy = new ArrayList<T>(Objects.requireNonNull(values));
    for (T value : copy) Objects.requireNonNull(value);
    return Collections.unmodifiableList(copy);
  }
  private static <T> List<T> copyArray(T[] values) { return copyList(Arrays.asList(Objects.requireNonNull(values).clone())); }

  static TypeParam parameter(String identifier, RefTypeSig bound, RefTypeSig[] interfaces) {
    return new ParameterValue(Objects.requireNonNull(identifier), Optional.ofNullable(bound), copyArray(interfaces));
  }
  static TypeParam parameter(String identifier, Optional<RefTypeSig> bound, RefTypeSig[] interfaces) {
    return new ParameterValue(Objects.requireNonNull(identifier), Objects.requireNonNull(bound), copyArray(interfaces));
  }
  static ClassSignature classSignature(List<TypeParam> parameters, ClassTypeSig superclass, ClassTypeSig[] interfaces) {
    return new ClassSignatureValue(copyList(parameters), Objects.requireNonNull(superclass), copyArray(interfaces));
  }
  static MethodSignature methodSignature(List<TypeParam> parameters, List<ThrowableSig> exceptions,
      Signature result, Signature[] arguments) {
    return new MethodSignatureValue(copyList(parameters), copyList(exceptions), Objects.requireNonNull(result), copyArray(arguments));
  }
  static MethodSignature methodSignature(MethodTypeDesc descriptor) {
    Objects.requireNonNull(descriptor);
    Signature result = of(descriptor.returnType());
    List<Signature> arguments = new ArrayList<Signature>();
    for (ClassDesc parameter : descriptor.parameterList()) arguments.add(of(parameter));
    return new MethodSignatureValue(copyList(Collections.<TypeParam>emptyList()),
      copyList(Collections.<ThrowableSig>emptyList()), result, Collections.unmodifiableList(arguments));
  }

  static Signature parse(String value) {
    Parser parser = new Parser(Objects.requireNonNull(value));
    try {
      Signature result = parser.type();
      if (parser.position == value.length()) return result;
    } catch (IndexOutOfBoundsException truncated) { }
    throw new IllegalArgumentException("Not a valid type signature: " + value);
  }

  static ClassSignature parseClass(String value) {
    Parser parser = new Parser(Objects.requireNonNull(value));
    try {
      List<TypeParam> parameters = parser.parameters();
      ClassTypeSig superclass = parser.classType();
      List<ClassTypeSig> interfaces = new ArrayList<ClassTypeSig>();
      while (parser.position < value.length()) interfaces.add(parser.classType());
      return new ClassSignatureValue(parameters, superclass, Collections.unmodifiableList(interfaces));
    } catch (IndexOutOfBoundsException truncated) {
      throw new IllegalArgumentException("Not a valid class signature: " + value);
    }
  }

  static MethodSignature parseMethod(String value) {
    Parser parser = new Parser(Objects.requireNonNull(value));
    try {
      List<TypeParam> parameters = parser.parameters();
      parser.require('(');
      List<Signature> arguments = new ArrayList<Signature>();
      while (!parser.consume(')')) arguments.add(parser.type());
      Signature result = parser.type();
      List<ThrowableSig> exceptions = new ArrayList<ThrowableSig>();
      while (parser.position < value.length()) {
        parser.require('^');
        RefTypeSig exception = parser.reference();
        if (!(exception instanceof ThrowableSig))
          throw new IllegalArgumentException("Not a valid throwable signature " + exception.signatureString() + " in: " + value);
        exceptions.add((ThrowableSig) exception);
      }
      return new MethodSignatureValue(parameters, Collections.unmodifiableList(exceptions), result, Collections.unmodifiableList(arguments));
    } catch (IndexOutOfBoundsException truncated) {
      throw new IllegalArgumentException("Not a valid method signature: " + value);
    }
  }

  private static final class Parser {
    final String input;
    int position;
    Parser(String input) { this.input = input; }

    List<TypeParam> parameters() {
      if (!consume('<')) return copyList(Collections.<TypeParam>emptyList());
      List<TypeParam> values = new ArrayList<TypeParam>();
      do {
        String name = identifier();
        require(':');
        RefTypeSig bound = input.charAt(position) == ':' ? null : reference();
        List<RefTypeSig> interfaces = new ArrayList<RefTypeSig>();
        while (consume(':')) interfaces.add(reference());
        values.add(new ParameterValue(name, Optional.ofNullable(bound), Collections.unmodifiableList(interfaces)));
      } while (!consume('>'));
      return Collections.unmodifiableList(values);
    }

    Signature type() {
      char token = input.charAt(position++);
      if ("BCDFIJVSZ".indexOf(token) >= 0) return base(token);
      position--;
      return reference();
    }

    RefTypeSig reference() {
      char token = input.charAt(position);
      if (token == 'L') return classType();
      if (token == '[') { position++; return array(1, type()); }
      if (token == 'T') {
        position++;
        TypeVarSig result = variable(identifier());
        require(';');
        return result;
      }
      throw unexpected("a type signature");
    }

    ClassTypeSig classType() {
      require('L');
      ClassTypeSig outer = null;
      for (;;) {
        int start = position;
        identifier();
        if (outer == null) while (consume('/')) identifier();
        String name = input.substring(start, position);
        List<TypeArg> arguments = new ArrayList<TypeArg>();
        if (consume('<')) {
          do { arguments.add(argument()); } while (!consume('>'));
        }
        ClassTypeSig result = DoppioSignatures.classType(outer, name, arguments.toArray(new TypeArg[0]));
        if (consume(';')) return result;
        if (!consume('.')) throw unexpected(". or ;");
        outer = result;
      }
    }

    TypeArg argument() {
      if (consume('*')) return unbounded();
      if (consume('+')) return TypeArg.extendsOf(reference());
      if (consume('-')) return TypeArg.superOf(reference());
      return TypeArg.of(reference());
    }

    String identifier() {
      int start = position;
      while (position < input.length() && ".;[/<>:".indexOf(input.charAt(position)) < 0) position++;
      if (position == start) throw unexpected("an identifier");
      return input.substring(start, position);
    }

    boolean consume(char token) {
      if (position >= input.length() || input.charAt(position) != token) return false;
      position++;
      return true;
    }
    void require(char token) { if (!consume(token)) throw unexpected(String.valueOf(token)); }
    IllegalArgumentException unexpected(String expected) {
      String description = position < input.length()
        ? "Unexpected character " + input.charAt(position) : "Unexpected end of signature";
      return new IllegalArgumentException(description + " at position " + position + ", expected " + expected + ": " + input);
    }
  }

  private static final class BaseValue implements BaseTypeSig {
    final char value;
    BaseValue(char value) { this.value = value; }
    public char baseType() { return value; }
    public String signatureString() { return String.valueOf(value); }
    public boolean equals(Object other) { return other instanceof BaseValue && value == ((BaseValue) other).value; }
    public int hashCode() { return value; }
    public String toString() { return "BaseTypeSigImpl[baseType=" + value + "]"; }
  }

  private static final class VariableValue implements TypeVarSig {
    final String name;
    VariableValue(String name) { this.name = name; }
    public String identifier() { return name; }
    public String signatureString() { return "T" + name + ";"; }
    public boolean equals(Object other) { return other instanceof VariableValue && name.equals(((VariableValue) other).name); }
    public int hashCode() { return name.hashCode(); }
    public String toString() { return "TypeVarSigImpl[identifier=" + name + "]"; }
  }

  private static final class ArrayValue implements ArrayTypeSig {
    final int depth;
    final Signature element;
    ArrayValue(int depth, Signature element) { this.depth = depth; this.element = element; }
    public Signature componentSignature() { return depth == 1 ? element : new ArrayValue(depth - 1, element); }
    public String signatureString() {
      StringBuilder result = new StringBuilder();
      for (int i = 0; i < depth; i++) result.append('[');
      return result.append(element.signatureString()).toString();
    }
    public boolean equals(Object other) {
      return other instanceof ArrayValue && depth == ((ArrayValue) other).depth && element.equals(((ArrayValue) other).element);
    }
    public int hashCode() { return depth * 31 + element.hashCode(); }
    public String toString() { return "ArrayTypeSigImpl[arrayDepth=" + depth + ", elemType=" + element + "]"; }
  }

  private static final class ClassValue implements ClassTypeSig {
    final Optional<ClassTypeSig> outer;
    final String name;
    final List<TypeArg> arguments;
    ClassValue(Optional<ClassTypeSig> outer, String name, List<TypeArg> arguments) {
      this.outer = outer; this.name = name; this.arguments = arguments;
    }
    public Optional<ClassTypeSig> outerType() { return outer; }
    public String className() { return name; }
    public List<TypeArg> typeArgs() { return arguments; }
    public String signatureString() {
      StringBuilder result = new StringBuilder();
      if (outer.isPresent()) {
        String prefix = outer.get().signatureString();
        result.append(prefix, 0, prefix.length() - 1).append('.');
      } else result.append('L');
      result.append(name);
      if (!arguments.isEmpty()) {
        result.append('<');
        for (TypeArg argument : arguments) {
          if (argument instanceof TypeArg.Unbounded) result.append('*');
          else {
            TypeArg.Bounded bounded = (TypeArg.Bounded) argument;
            if (bounded.wildcardIndicator() == TypeArg.Bounded.WildcardIndicator.EXTENDS) result.append('+');
            else if (bounded.wildcardIndicator() == TypeArg.Bounded.WildcardIndicator.SUPER) result.append('-');
            result.append(bounded.boundType().signatureString());
          }
        }
        result.append('>');
      }
      return result.append(';').toString();
    }
    public boolean equals(Object other) {
      if (!(other instanceof ClassValue)) return false;
      ClassValue value = (ClassValue) other;
      return outer.equals(value.outer) && name.equals(value.name) && arguments.equals(value.arguments);
    }
    public int hashCode() { return (outer.hashCode() * 31 + name.hashCode()) * 31 + arguments.hashCode(); }
    public String toString() { return "ClassTypeSigImpl[outerType=" + outer + ", className=" + name + ", typeArgs=" + arguments + "]"; }
  }

  private enum UnboundedValue implements TypeArg.Unbounded { INSTANCE }

  private static StringBuilder parameterPrefix(List<TypeParam> parameters) {
    StringBuilder result = new StringBuilder();
    if (!parameters.isEmpty()) {
      result.append('<');
      for (TypeParam parameter : parameters) {
        result.append(parameter.identifier()).append(':');
        if (parameter.classBound().isPresent()) result.append(parameter.classBound().get().signatureString());
        for (RefTypeSig bound : parameter.interfaceBounds()) result.append(':').append(bound.signatureString());
      }
      result.append('>');
    }
    return result;
  }

  private static final class ParameterValue implements TypeParam {
    final String identifier;
    final Optional<RefTypeSig> bound;
    final List<RefTypeSig> interfaces;
    ParameterValue(String identifier, Optional<RefTypeSig> bound, List<RefTypeSig> interfaces) {
      this.identifier = identifier; this.bound = bound; this.interfaces = interfaces;
    }
    public String identifier() { return identifier; }
    public Optional<RefTypeSig> classBound() { return bound; }
    public List<RefTypeSig> interfaceBounds() { return interfaces; }
    public boolean equals(Object other) {
      if (!(other instanceof ParameterValue)) return false;
      ParameterValue value = (ParameterValue) other;
      return identifier.equals(value.identifier) && bound.equals(value.bound) && interfaces.equals(value.interfaces);
    }
    public int hashCode() { return (identifier.hashCode() * 31 + bound.hashCode()) * 31 + interfaces.hashCode(); }
    public String toString() { return "TypeParamImpl[identifier=" + identifier + ", classBound=" + bound + ", interfaceBounds=" + interfaces + "]"; }
  }

  private static final class ClassSignatureValue implements ClassSignature {
    final List<TypeParam> parameters;
    final ClassTypeSig superclass;
    final List<ClassTypeSig> interfaces;
    ClassSignatureValue(List<TypeParam> parameters, ClassTypeSig superclass, List<ClassTypeSig> interfaces) {
      this.parameters = parameters; this.superclass = superclass; this.interfaces = interfaces;
    }
    public List<TypeParam> typeParameters() { return parameters; }
    public ClassTypeSig superclassSignature() { return superclass; }
    public List<ClassTypeSig> superinterfaceSignatures() { return interfaces; }
    public String signatureString() {
      StringBuilder result = parameterPrefix(parameters).append(superclass.signatureString());
      for (ClassTypeSig type : interfaces) result.append(type.signatureString());
      return result.toString();
    }
    public boolean equals(Object other) {
      if (!(other instanceof ClassSignatureValue)) return false;
      ClassSignatureValue value = (ClassSignatureValue) other;
      return parameters.equals(value.parameters) && superclass.equals(value.superclass) && interfaces.equals(value.interfaces);
    }
    public int hashCode() { return (parameters.hashCode() * 31 + superclass.hashCode()) * 31 + interfaces.hashCode(); }
    public String toString() { return "ClassSignatureImpl[typeParameters=" + parameters + ", superclassSignature=" + superclass + ", superinterfaceSignatures=" + interfaces + "]"; }
  }

  private static final class MethodSignatureValue implements MethodSignature {
    final List<TypeParam> parameters;
    final List<ThrowableSig> exceptions;
    final Signature result;
    final List<Signature> arguments;
    MethodSignatureValue(List<TypeParam> parameters, List<ThrowableSig> exceptions, Signature result, List<Signature> arguments) {
      this.parameters = parameters; this.exceptions = exceptions; this.result = result; this.arguments = arguments;
    }
    public List<TypeParam> typeParameters() { return parameters; }
    public List<ThrowableSig> throwableSignatures() { return exceptions; }
    public Signature result() { return result; }
    public List<Signature> arguments() { return arguments; }
    public String signatureString() {
      StringBuilder value = parameterPrefix(parameters).append('(');
      for (Signature argument : arguments) value.append(argument.signatureString());
      value.append(')').append(result.signatureString());
      for (ThrowableSig exception : exceptions) value.append('^').append(exception.signatureString());
      return value.toString();
    }
    public boolean equals(Object other) {
      if (!(other instanceof MethodSignatureValue)) return false;
      MethodSignatureValue value = (MethodSignatureValue) other;
      return parameters.equals(value.parameters) && exceptions.equals(value.exceptions) && result.equals(value.result) && arguments.equals(value.arguments);
    }
    public int hashCode() { return ((parameters.hashCode() * 31 + exceptions.hashCode()) * 31 + result.hashCode()) * 31 + arguments.hashCode(); }
    public String toString() { return "MethodSignatureImpl[typeParameters=" + parameters + ", throwableSignatures=" + exceptions + ", result=" + result + ", arguments=" + arguments + "]"; }
  }

  private static final class BoundedValue implements TypeArg.Bounded {
    final WildcardIndicator wildcard;
    final RefTypeSig bound;
    BoundedValue(WildcardIndicator wildcard, RefTypeSig bound) { this.wildcard = wildcard; this.bound = bound; }
    public WildcardIndicator wildcardIndicator() { return wildcard; }
    public RefTypeSig boundType() { return bound; }
    public boolean equals(Object other) {
      return other instanceof BoundedValue && wildcard == ((BoundedValue) other).wildcard && bound.equals(((BoundedValue) other).bound);
    }
    public int hashCode() { return wildcard.hashCode() * 31 + bound.hashCode(); }
    public String toString() { return "TypeArgImpl[wildcardIndicator=" + wildcard + ", boundType=" + bound + "]"; }
  }
}
