package java.lang.classfile.attribute;

import java.lang.classfile.*;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.constant.ClassDesc;
import java.util.Arrays;
import java.util.List;

public interface ExceptionsAttribute extends Attribute<ExceptionsAttribute>, MethodElement {
  List<ClassEntry> exceptions();
  static ExceptionsAttribute of(List<ClassEntry> exceptions) { return DoppioAttributes.exceptions(exceptions); }
  static ExceptionsAttribute of(ClassEntry... exceptions) { return of(Arrays.asList(exceptions)); }
  static ExceptionsAttribute ofSymbols(List<ClassDesc> exceptions) { return of(DoppioAttributes.classEntries(exceptions)); }
  static ExceptionsAttribute ofSymbols(ClassDesc... exceptions) { return ofSymbols(Arrays.asList(exceptions)); }
}
