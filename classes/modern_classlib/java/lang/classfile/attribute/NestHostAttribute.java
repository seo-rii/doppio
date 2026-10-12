package java.lang.classfile.attribute;

import java.lang.classfile.*;
import java.lang.classfile.constantpool.ClassEntry;
import java.lang.classfile.constantpool.DoppioConstantPool;
import java.lang.constant.ClassDesc;

public interface NestHostAttribute extends Attribute<NestHostAttribute>, ClassElement {
  ClassEntry nestHost();
  static NestHostAttribute of(ClassEntry host) { return DoppioAttributes.nestHost(host); }
  static NestHostAttribute of(ClassDesc host) { return of(new DoppioConstantPool().classEntry(host)); }
}
