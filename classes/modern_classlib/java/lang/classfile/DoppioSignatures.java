package java.lang.classfile;

import java.lang.constant.ClassDesc;
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

/** Typed immutable signature values and a recursive field-signature parser. */
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

  static Signature parse(String value) {
    Parser parser = new Parser(Objects.requireNonNull(value));
    try {
      Signature result = parser.type();
      if (parser.position == value.length()) return result;
    } catch (IndexOutOfBoundsException truncated) { }
    throw new IllegalArgumentException("Not a valid type signature: " + value);
  }

  private static final class Parser {
    final String input;
    int position;
    Parser(String input) { this.input = input; }

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
        require('.');
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
