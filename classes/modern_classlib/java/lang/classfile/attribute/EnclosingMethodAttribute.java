package java.lang.classfile.attribute;

import java.lang.classfile.Attribute;
import java.lang.classfile.ClassElement;
import java.lang.classfile.DoppioMetadataAttributes;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.NameAndTypeEntry;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.util.Optional;

public interface EnclosingMethodAttribute extends Attribute<EnclosingMethodAttribute>, ClassElement {
  ClassEntry enclosingClass();
  Optional<NameAndTypeEntry> enclosingMethod();
  default Optional<Utf8Entry> enclosingMethodName() { return enclosingMethod().map(NameAndTypeEntry::name); }
  default Optional<Utf8Entry> enclosingMethodType() { return enclosingMethod().map(NameAndTypeEntry::type); }
  default Optional<MethodTypeDesc> enclosingMethodTypeSymbol() {
    return enclosingMethodType().map(type -> MethodTypeDesc.ofDescriptor(type.stringValue()));
  }
  static EnclosingMethodAttribute of(ClassEntry owner, Optional<NameAndTypeEntry> method) {
    return DoppioMetadataAttributes.enclosingMethod(owner, method);
  }
  static EnclosingMethodAttribute of(ClassDesc owner, Optional<String> name, Optional<MethodTypeDesc> type) {
    return DoppioMetadataAttributes.enclosingMethod(owner, name, type);
  }
}
