package java.lang.classfile.attribute;

import java.lang.classfile.*;
import java.lang.classfile.constantpool.Utf8Entry;
public interface SourceFileAttribute extends Attribute<SourceFileAttribute>, ClassElement {
  Utf8Entry sourceFile();
  static SourceFileAttribute of(String sourceFile) { return DoppioClassReader.sourceFile(sourceFile); }
  static SourceFileAttribute of(Utf8Entry sourceFile) { return DoppioClassReader.sourceFile(sourceFile); }
}
