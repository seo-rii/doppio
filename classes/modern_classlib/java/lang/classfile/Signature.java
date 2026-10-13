package java.lang.classfile;

import java.lang.constant.ClassDesc;
import java.util.List;
import java.util.Optional;

/** Generic field-type signatures, including parameterized and nested reference types. */
public interface Signature {
  String signatureString();
  static Signature parseFrom(String signature) { return DoppioSignatures.parse(signature); }
  static Signature of(ClassDesc descriptor) { return DoppioSignatures.of(descriptor); }

  interface BaseTypeSig extends Signature {
    char baseType();
    static BaseTypeSig of(ClassDesc descriptor) { return DoppioSignatures.base(descriptor); }
    static BaseTypeSig of(char descriptor) { return DoppioSignatures.base(descriptor); }
  }

  interface RefTypeSig extends Signature { }
  interface ThrowableSig extends Signature { }

  interface ClassTypeSig extends RefTypeSig, ThrowableSig {
    Optional<ClassTypeSig> outerType();
    String className();
    List<TypeArg> typeArgs();
    default ClassDesc classDesc() {
      Optional<ClassTypeSig> outer = outerType();
      return outer.isPresent() ? outer.get().classDesc().nested(className()) : ClassDesc.ofInternalName(className());
    }
    static ClassTypeSig of(ClassDesc name, TypeArg... arguments) { return of(null, name, arguments); }
    static ClassTypeSig of(ClassTypeSig outer, ClassDesc name, TypeArg... arguments) {
      return DoppioSignatures.classType(outer, name, arguments);
    }
    static ClassTypeSig of(String name, TypeArg... arguments) { return of(null, name, arguments); }
    static ClassTypeSig of(ClassTypeSig outer, String name, TypeArg... arguments) {
      return DoppioSignatures.classType(outer, name, arguments);
    }
  }

  interface TypeVarSig extends RefTypeSig, ThrowableSig {
    String identifier();
    static TypeVarSig of(String identifier) { return DoppioSignatures.variable(identifier); }
  }

  interface ArrayTypeSig extends RefTypeSig {
    Signature componentSignature();
    static ArrayTypeSig of(Signature component) { return of(1, component); }
    static ArrayTypeSig of(int dimensions, Signature component) { return DoppioSignatures.array(dimensions, component); }
  }

  interface TypeArg {
    interface Unbounded extends TypeArg { }
    interface Bounded extends TypeArg {
      enum WildcardIndicator { NONE, EXTENDS, SUPER }
      WildcardIndicator wildcardIndicator();
      RefTypeSig boundType();
    }
    static Bounded of(RefTypeSig bound) { return bounded(Bounded.WildcardIndicator.NONE, bound); }
    static Unbounded unbounded() { return DoppioSignatures.unbounded(); }
    static Bounded extendsOf(RefTypeSig bound) { return bounded(Bounded.WildcardIndicator.EXTENDS, bound); }
    static Bounded superOf(RefTypeSig bound) { return bounded(Bounded.WildcardIndicator.SUPER, bound); }
    static Bounded bounded(Bounded.WildcardIndicator wildcard, RefTypeSig bound) {
      return DoppioSignatures.bounded(wildcard, bound);
    }
  }

  interface TypeParam {
    String identifier();
    Optional<RefTypeSig> classBound();
    List<RefTypeSig> interfaceBounds();
    static TypeParam of(String identifier, RefTypeSig classBound, RefTypeSig... interfaceBounds) {
      return DoppioSignatures.parameter(identifier, classBound, interfaceBounds);
    }
    static TypeParam of(String identifier, Optional<RefTypeSig> classBound, RefTypeSig... interfaceBounds) {
      return DoppioSignatures.parameter(identifier, classBound, interfaceBounds);
    }
  }
}
