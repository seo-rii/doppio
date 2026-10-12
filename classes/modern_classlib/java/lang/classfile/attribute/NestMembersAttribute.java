package java.lang.classfile.attribute;

import java.lang.classfile.*;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.constant.ClassDesc;
import java.util.Arrays;
import java.util.List;

public interface NestMembersAttribute extends Attribute<NestMembersAttribute>, ClassElement {
  List<ClassEntry> nestMembers();
  static NestMembersAttribute of(List<ClassEntry> members) { return DoppioAttributes.nestMembers(members); }
  static NestMembersAttribute of(ClassEntry... members) { return of(Arrays.asList(members)); }
  static NestMembersAttribute ofSymbols(List<ClassDesc> members) { return of(DoppioAttributes.classEntries(members)); }
  static NestMembersAttribute ofSymbols(ClassDesc... members) { return ofSymbols(Arrays.asList(members)); }
}
